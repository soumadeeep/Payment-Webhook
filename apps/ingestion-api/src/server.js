import express from 'express';
import dotenv from 'dotenv';
import { rawBodyParser } from './middleware/rawBody.middleware.js';
import webhookRoutes from './routes/webhook.routes.js';
import { connectRabbitMQ } from './queues/rabbitmq.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Mount raw body parser middleware globally
app.use(rawBodyParser);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes under API version prefix
app.use('/api/v1/webhooks', webhookRoutes);

async function startServer() {
  // Connect to RabbitMQ topology first
  await connectRabbitMQ();

  app.listen(PORT, () => {
    console.log(`Ingestion API running on http://localhost:${PORT}`);
  });
}

startServer();