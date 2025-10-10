// services/webhookServices.js
import { sequelize } from '../config/database.js';
import Account from '../models/account.js';
import Transaction from '../models/transaction.js';
import User from '../models/user.js';

// ⬇️ Adjust this path if your mailer lives somewhere else
import { sendMail } from '../utilities/nodeMailer.js';

/** ---------- number helpers ---------- */
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const fixed2 = (v) => +Number(v).toFixed(2);
const formatNGN = (v) =>
  v === undefined || v === null
    ? ''
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(v));

/** ---------- balance updater (optional helper) ---------- */
export async function updateUserBalance(customer_id, deltaNaira, opts = {}) {
  const { transaction: extTxn } = opts;

  const run = async (t) => {
    const account = await Account.findOne({ where: { customer_id }, transaction: t, lock: t?.LOCK?.UPDATE });
    if (!account) throw new Error(`Account not found for customer_id: ${customer_id}`);

    const initial = num(account.balance);
    const final = fixed2(initial + num(deltaNaira));

    await Account.update({ balance: final }, { where: { id: account.id }, transaction: t });
    return { initial, final, account };
  };

  if (extTxn) return run(extTxn);
  return sequelize.transaction(run);
}

/** ---------- transaction creator (matches your model) ---------- */
export async function createTransactionRecord(payload, opts = {}) {
  const {
    transaction_id,
    customer_id,
    transaction_type, // 'credit' | 'debit'
    transaction_amount,
    initial_amount,
    final_amount,
    transaction_fee = 0,
    receiver_name = null,
    sender_name = null,
    receiver_bank = 'EMBEDLY', // your model requires NOT NULL, <= 10 chars
    status = 'pending',        // 'pending' | 'completed' | 'failed'
  } = payload;

  if (!transaction_id) throw new Error('createTransactionRecord: transaction_id is required');
  if (!customer_id) throw new Error('createTransactionRecord: customer_id is required');
  if (!['credit', 'debit'].includes(transaction_type)) {
    throw new Error('createTransactionRecord: transaction_type must be "credit" or "debit"');
  }

  return Transaction.create(
    {
      transaction_id,
      customer_id,
      transaction_type,
      transaction_amount: fixed2(num(transaction_amount)),
      initial_amount: fixed2(num(initial_amount)),
      final_amount: fixed2(num(final_amount)),
      transaction_fee: fixed2(num(transaction_fee)),
      receiver_name,
      sender_name,
      receiver_bank: (receiver_bank || 'EMBEDLY').slice(0, 10),
      status,
      // transaction_date uses your model's default NOW
    },
    { transaction: opts.transaction }
  );
}

/** ---------- EMAIL NOTIFICATIONS: uses your sendMail(to, subject, html) ---------- */
export async function sendNotification(customer_id, message = {}) {
  try {
    // Find the user's email
    const user = await User.findOne({ where: { customer_id } });
    const to = user?.email;
    if (!to) {
      console.warn(`[sendNotification] No email for customer_id=${customer_id}; skipping email`);
      return { ok: false, skipped: 'no-email' };
    }

    const { subject, html } = buildEmail(message, user);
    await sendMail(to, subject, html);
    return { ok: true };
  } catch (err) {
    console.error('sendNotification error:', err);
    return { ok: false, error: String(err) };
  }
}

/** ---------- tiny email template builder ---------- */
function buildEmail(msg, user) {
  const {
    type,                // 'payment_success' | 'payment_failed' | 'payment_reversed' | 'transfer_success' | 'transfer_failed' | 'kyc_success' | 'kyc_failed'
    amount,
    reference,
    balance,
    reason,
    recipient_name,
    recipient_account,
    channel,             // e.g., 'nip' | 'checkout' | 'payout'
    verification_level,
    refunded,
  } = msg;

  const amt = formatNGN(amount);
  const bal = balance !== undefined ? formatNGN(balance) : null;

  let subject = 'Wallet notification';
  let title = 'Notification';
  let lines = [];

  switch (type) {
    case 'payment_success':
      subject = `Payment received ${amt}${channel ? ` via ${channel}` : ''}`;
      title = 'Payment Successful';
      lines = [
        amt && `Amount: <strong>${amt}</strong>`,
        reference && `Reference: <strong>${reference}</strong>`,
        bal && `New balance: <strong>${bal}</strong>`
      ];
      break;

    case 'payment_failed':
      subject = `Payment failed ${amt}`;
      title = 'Payment Failed';
      lines = [
        amt && `Amount: <strong>${amt}</strong>`,
        reference && `Reference: <strong>${reference}</strong>`,
        reason && `Reason: <strong>${escapeHtml(reason)}</strong>`
      ];
      break;

    case 'payment_reversed':
      subject = `Payment reversed ${amt}`;
      title = 'Payment Reversed';
      lines = [
        amt && `Amount: <strong>${amt}</strong>`,
        reference && `Reference: <strong>${reference}</strong>`,
        bal && `Updated balance: <strong>${bal}</strong>`
      ];
      break;

    case 'transfer_success':
      subject = `Transfer sent ${amt}`;
      title = 'Transfer Successful';
      lines = [
        amt && `Amount: <strong>${amt}</strong>`,
        recipient_name && `Recipient: <strong>${escapeHtml(recipient_name)}</strong>`,
        recipient_account && `Account: <strong>${escapeHtml(recipient_account)}</strong>`,
        reference && `Reference: <strong>${reference}</strong>`,
        bal && `New balance: <strong>${bal}</strong>`
      ];
      break;

    case 'transfer_failed':
      subject = `Transfer failed ${amt}`;
      title = 'Transfer Failed';
      lines = [
        amt && `Amount: <strong>${amt}</strong>`,
        reference && `Reference: <strong>${reference}</strong>`,
        reason && `Reason: <strong>${escapeHtml(reason)}</strong>`,
        refunded ? 'Status: <strong>Refunded</strong>' : null
      ];
      break;

    case 'kyc_success':
      subject = 'KYC verification successful';
      title = 'KYC Successful';
      lines = [
        verification_level && `Level: <strong>${escapeHtml(verification_level)}</strong>`
      ];
      break;

    case 'kyc_failed':
      subject = 'KYC verification failed';
      title = 'KYC Failed';
      lines = [
        reason && `Reason: <strong>${escapeHtml(reason)}</strong>`
      ];
      break;

    default:
      subject = 'Account update';
      title = 'Account Update';
      lines = [
        channel && `Channel: <strong>${escapeHtml(channel)}</strong>`,
        reference && `Reference: <strong>${reference}</strong>`
      ];
  }

  const safeLines = lines.filter(Boolean).map((l) => `<li>${l}</li>`).join('');
  const html = baseEmailTemplate({
    title,
    intro: `Hi ${escapeHtml(user?.first_name || user?.name || 'there')},`,
    body: `<ul style="margin:0;padding-left:18px">${safeLines || '<li>Details available in your dashboard.</li>'}</ul>`,
    footer: 'If you did not authorize this activity, please contact support immediately.'
  });

  return { subject, html };
}

/** ---------- simple HTML template ---------- */
function baseEmailTemplate({ title, intro, body, footer }) {
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f7fb;margin:0;padding:24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(16,24,40,.06);overflow:hidden">
        <tr>
          <td style="padding:20px 24px;border-bottom:1px solid #f0f2f5;">
            <h2 style="margin:0;font-size:18px;color:#111827;">${escapeHtml(title)}</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0 0 12px 0;color:#111827;">${intro}</p>
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #f0f2f5;color:#6b7280;font-size:12px;">
            ${escapeHtml(footer)}
          </td>
        </tr>
      </table>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:12px;">© ${new Date().getFullYear()} Wallet</p>
    </body>
  </html>
  `;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
