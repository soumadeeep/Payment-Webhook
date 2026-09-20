import { Router } from 'express';
import { handlePaymentWebhook } from '../controllers/webhook.controller.js';
import { verifyWebhookSignature } from '../middleware/verifyWebhook.middleware.js';

const router = Router();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test_webhook_secret_key_123';

router.post(
  '/payments',
  verifyWebhookSignature(WEBHOOK_SECRET),
  handlePaymentWebhook
);

export default router;