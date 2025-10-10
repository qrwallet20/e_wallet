import express from 'express';
import crypto from 'crypto';

const API_KEY = process.env.EMBEDLY_API_KEY; // set this in your env
const router = express.Router();

// keep the raw JSON for HMAC *and* parse it to req.body
const jsonParserWithRaw = express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); }
});

router.post('/embedly', jsonParserWithRaw, async (req, res) => {
  try {
    // 1) verify signature per docs
    const signature = req.headers['x-embedly-signature'];
    const rawBody = req.rawBody;
    if (!API_KEY || !signature || !rawBody) {
      return res.status(400).type('text/plain').send('Missing signature or body');
    }

    const hmac = crypto.createHmac('sha512', API_KEY);
    hmac.update(rawBody, 'utf8');
    const computed = hmac.digest('hex');

    if (computed !== signature) {
      return res.status(401).type('text/plain').send('Invalid signature');
    }

    // 2) process (very minimal — plug in your own DB logic here)
    const { event, data } = req.body || {};
    if (!event || !data) {
      return res.status(400).type('text/plain').send('Bad payload');
    }

    switch (event) {
      case 'nip':
        // TODO: credit(data.accountNumber, data.amount, data.reference)
        break;

      case 'checkout.payment.success':
        // TODO: credit(data.recipientAccountNumber, data.amount, data.reference)
        break;

      case 'checkout.payment.failed':
        // TODO: markFailed(data.recipientAccountNumber, data.reference)
        break;

      case 'checkout.reversal.success':
        // TODO: debit(data.recipientAccountNumber, data.amount, data.reference)
        break;

      case 'payout':
        // TODO: if (data.status === 'Success') completeOrDebit(data.debitAccountNumber, data.amount, data.paymentReference)
        break;

      default:
        // unknown event — safely ignore or log
        break;
    }

    // 3) light ACK exactly as docs say
    return res.status(200).type('text/plain').send('00 Success');
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).type('text/plain').send('Processing failed');
  }
});

export default router;
