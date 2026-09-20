import { getChannel, EXCHANGE_NAME, ROUTING_KEY } from './rabbitmq.js';

export async function publishPaymentEvent(event) {
  const channel = getChannel();
  const messageBuffer = Buffer.from(JSON.stringify(event));

  return new Promise((resolve, reject) => {
    // persistent: true sets deliveryMode = 2 (flush to disk)
    channel.publish(
      EXCHANGE_NAME,
      ROUTING_KEY,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      },
      (err, ok) => {
        if (err) {
          console.error('[Publisher Confirm NACK]: Broker failed to persist message', err);
          return reject(err);
        }
        // Broker confirmed message is safe
        resolve(ok);
      }
    );
  });
}