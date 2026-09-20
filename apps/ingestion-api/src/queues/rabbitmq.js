import amqp from 'amqplib';

export const EXCHANGE_NAME = 'payments.direct';
export const QUEUE_NAME = 'payment_events_queue';
export const ROUTING_KEY = 'payment.event';

let channel = null;
let connection = null;

export async function connectRabbitMQ() {
  const amqpUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

  try {
    connection = await amqp.connect(amqpUrl);
    // Create a ConfirmChannel for publisher acknowledgments
    channel = await connection.createConfirmChannel();

    console.log('[RabbitMQ]: Connected successfully');

    // 1. Assert durable direct exchange
    await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });

    // 2. Assert durable queue
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // 3. Bind queue to exchange via routing key
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    // Handle connection drops gracefully
    connection.on('error', (err) => {
      console.error('[RabbitMQ Connection Error]:', err);
    });

    connection.on('close', () => {
      console.warn('[RabbitMQ Connection Closed]: Reconnecting in 5s...');
      setTimeout(connectRabbitMQ, 5000);
    });

    return channel;
  } catch (error) {
    console.error('[RabbitMQ Init Failed]:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

export function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ channel is not initialized');
  }
  return channel;
}