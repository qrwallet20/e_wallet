// routes/webhookRoutes.js (only the embedly endpoint shown)
import express from 'express';
import crypto from 'crypto';
import { handleEmbedlyWebhook } from '../controllers/webhookControllers.js';
import { webhookLimiter, verifyWebhookSignature } from '../middlewares/webhookMiddleware.js';

const router = express.Router();

const jsonParserWithRaw = express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); }
});

router.post('/embedly', jsonParserWithRaw, verifyWebhookSignature, webhookLimiter, async (req, res) => {
  try {
    const signature = req.headers['x-embedly-signature'];
    const rawBody = req.rawBody;
    const apiKey = process.env.EMBEDLY_STAGING_KEY;

    if (!signature || !rawBody || !apiKey) {
      return res.status(400).type('text/plain').send('Missing signature or body');
    }

    const hmac = crypto.createHmac('sha512', apiKey);
    hmac.update(rawBody, 'utf8');
    const computed = hmac.digest('hex');
    if (computed !== signature) {
      return res.status(401).type('text/plain').send('Invalid signature');
    }

    await handleEmbedlyWebhook(req, res);
    return res.status(200).type('text/plain').send('00 Success');
  } catch (e) {
    console.error('Embedly webhook error:', e);
    return res.status(500).type('text/plain').send('Processing failed');
  }
});

export default router;
