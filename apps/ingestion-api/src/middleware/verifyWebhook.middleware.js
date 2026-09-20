import crypto from 'node:crypto';

export function verifyWebhookSignature(secret) {
  return (req, res, next) => {
    const signature = req.headers['x-signature'];

    if (!signature) {
      return res.status(401).json({ error: 'Missing X-Signature header' });
    }

    if (!req.rawBody) {
      return res.status(500).json({ error: 'Raw request body buffer unavailable' });
    }
    // Compute HMAC SHA-256 using the captured raw buffer
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const computedBuffer = Buffer.from(computedSignature, 'utf8');

    // Timing-safe comparison requires equal-length buffers
    if (signatureBuffer.length !== computedBuffer.length) {
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    const isValid = crypto.timingSafeEqual(signatureBuffer, computedBuffer);

    if (!isValid) {
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    next();
  };
}