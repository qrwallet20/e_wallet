import crypto from 'crypto';
import { WEBHOOK_SECRET } from '../config/env.js';

export const verifyWebhookSignature = (req, res, next) => {
    try {
        const signature = req.headers['x-signature'] ;
        const body = req.body;

        if (!signature) {
            return res.status(400).json({ error: 'No signature header found' });
        }

        // For other Embedly
        else if (req.headers['x-signature']) {
            const expectedSignature = crypto
                .createHmac('sha256', WEBHOOK_SECRET)
                .update(JSON.stringify(body))
                .digest('hex');

            const providedSignature = signature.startsWith('sha256=') 
                ? signature.slice(7) 
                : signature;

            if (!crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'hex'),
                Buffer.from(providedSignature, 'hex')
            )) {
                return res.status(400).json({ error: 'Invalid signature' });
            }
        }

        // Parse JSON body for controllers
        req.body = JSON.parse(body);
        next();
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        res.status(400).json({ error: 'Signature verification failed' });
    }
};

// Rate limiting for webhooks
import rateLimit from 'express-rate-limit';

export const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many webhook requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});