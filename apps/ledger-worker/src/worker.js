import amqp from 'amqplib';
import dotenv from 'dotenv';
import { sequelize } from './db/connection.js';
import './db/models.js'; // Registers models with Sequelize instance
import { startPaymentConsumer } from './consumers/payment.consumer.js';

dotenv.config();

const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

let connection = null;
let channel = null;

async function bootstrap() {
  try {
    // 1. Authenticate and sync MySQL tables
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('[MySQL / Sequelize]: Connected and tables synced.');

    connection = await amqp.connect(AMQP_URL);
    channel = await connection.createChannel();

    console.log('[Worker Connection]: Connected to RabbitMQ successfully');

    // Start consuming messages
    await startPaymentConsumer(channel);

    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      console.log(`\n[Shutdown]: Received ${signal}. Closing channels cleanly...`);
      try {
        if (channel) await channel.close();
        if (connection) await connection.close();
        await sequelize.close();
        console.log('[Shutdown]: Completed cleanly.');
        process.exit(0);
      } catch (err) {
        console.error('[Shutdown Error]:', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[Worker Bootstrap Failed]:', error);
    process.exit(1);
  }
}

bootstrap();