import { publishPaymentEvent } from '../queues/publisher.js';
export async function handlePaymentWebhook(req, res) {
  try {
    const event = req.body;

    // Publish to RabbitMQ and wait for broker confirmation
    await publishPaymentEvent(event);
    console.log('[Webhook Verified]:', event.eventId);

    // Fast ACK: Return 202 immediately to release the connection
    return res.status(202).json({
      status: 'accepted',
      eventId: event.eventId,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Webhook Error]:', error);
    return res.status(500).json({ error: 'Internal server error processing event' });
  }
}