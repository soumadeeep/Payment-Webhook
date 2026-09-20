import {
  checkAndLockEvent,
  markEventCompleted,
  releaseEventLock,
  IdempotencyStatus,
} from '../services/idempotency.service.js';
import { processPaymentEvent } from '../services/ledger.service.js';

const QUEUE_NAME = 'payment_events_queue';

export async function startPaymentConsumer(channel) {
  const prefetchCount = parseInt(process.env.PREFETCH_COUNT || '10', 10);
  await channel.prefetch(prefetchCount);
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  console.log(`[Consumer Ready]: Listening to "${QUEUE_NAME}" with prefetch=${prefetchCount}`);

  channel.consume(
    QUEUE_NAME,
    async (msg) => {
      if (!msg) return;

      let event;
      try {
        event = JSON.parse(msg.content.toString());
      } catch (err) {
        console.error('[Poison Pill]: Invalid JSON. Dropping message.');
        return channel.nack(msg, false, false);
      }

      const eventId = event.eventId;
      console.log(`\n[Incoming Event]: ID = ${eventId}`);

      try {
        // Step 1: Redis Idempotency Guard
        const idempotency = await checkAndLockEvent(eventId);

        if (idempotency.status === IdempotencyStatus.ALREADY_COMPLETED) {
          console.warn(`[Duplicate Dropped]: Event ${eventId} was already processed. ACK sent.`);
          return channel.ack(msg);
        }

        if (idempotency.status === IdempotencyStatus.IN_FLIGHT) {
          console.warn(`[Concurrent Conflict]: Event ${eventId} currently processing by another worker. Requeueing...`);
          // Requeue after small delay so other worker has time to finish
          return channel.nack(msg, false, true);
        }

        // Step 2: Simulate Database Ledger Transaction (100ms)
        console.log(`[Processing Ledger]: Updating balance for ${eventId}...`);
        const result = await processPaymentEvent(event);
        if (result.status === 'SUCCESS') {
            console.log(`[Ledger Updated]: Event ${eventId} processed successfully.`);
        }

        if (result.status === 'DUPLICATE_EVENT') {
            console.warn(`[Duplicate Dropped]: Event ${eventId} was already recorded in DB. ACK sent.`);
            return channel.ack(msg);
        }

        // Step 3: Mark completed in Redis cache
        await markEventCompleted(eventId);

        // Step 4: Acknowledge message to RabbitMQ
        channel.ack(msg);
        console.log(`[Successfully Processed & ACKed]: Event ${eventId}`);
      } catch (error) {
        console.error(`[Worker Error]: Failed processing ${eventId}:`, error.message);
        // Release the lock so a retry attempt isn't blocked
        await releaseEventLock(eventId);
        channel.nack(msg, false, true);
      }
    },
    { noAck: false }
  );
}