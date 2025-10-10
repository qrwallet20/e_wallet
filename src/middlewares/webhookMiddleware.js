
import crypto from 'crypto';
import { EMBEDLY_STAGING_KEY } from '../config/env.js';
import rateLimit from 'express-rate-limit';

export const verifyWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-embedly-signature'];
    // Using express.raw() in router means req.body is a Buffer here
    if (!signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).type('text/plain').send('Missing signature or body');
    }

    const raw = req.body.toString('utf8');

    const hmac = crypto.createHmac('sha512', EMBEDLY_STAGING_KEY);
    hmac.update(raw, 'utf8');
    const computed = hmac.digest('hex');

    if (computed !== signature) {
      return res.status(401).type('text/plain').send('Invalid signature');
    }

    // Signature OK — now parse JSON once for controllers
    req.body = JSON.parse(raw);
    return next();
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).type('text/plain').send('Signature verification failed');
  }
};

// Rate limiting for webhooks (unchanged, just exported here)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many webhook requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
