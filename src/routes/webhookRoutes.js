import express from 'express';
import crypto from 'crypto';
import { handlePaymentWebhook, handleTransferWebhook, handleCustomerWebhook } from '../controllers/webhookController.js';
import { verifyWebhookSignature } from '../middlewares/webhookMiddleware.js';

const router = express.Router();

// Raw body middleware for webhook signature verification
router.use(express.raw({ type: 'application/json' }));

// Payment webhook (for deposits, card payments, etc.)
router.post('/payment', verifyWebhookSignature, handlePaymentWebhook);

// Transfer webhook (for bank transfers, wallet transfers)
router.post('/transfer', verifyWebhookSignature, handleTransferWebhook);

// Customer webhook (for KYC updates, account changes)
router.post('/customer', verifyWebhookSignature, handleCustomerWebhook);

// General webhook endpoint (if provider uses single endpoint)
router.post('/general', verifyWebhookSignature, async (req, res) => {
    try {
        const { event, data } = req.body;
        
        switch (event) {
            case 'payment.success':
            case 'payment.failed':
                await handlePaymentWebhook(req, res);
                break;
            case 'transfer.success':
            case 'transfer.failed':
            case 'transfer.pending':
                await handleTransferWebhook(req, res);
                break;
            case 'customer.identification.success':
            case 'customer.identification.failed':
                await handleCustomerWebhook(req, res);
                break;
            default:
                console.log('Unknown webhook event:', event);
                res.status(200).json({ message: 'Event received but not processed' });
        }
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;