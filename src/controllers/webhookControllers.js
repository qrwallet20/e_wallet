// ADD these imports at the top (you already have some of them)
import { v4 as uuid } from 'uuid'; // only used if you ever need a generated id
import Account from '../models/account.js';
import Transaction from '../models/transaction.js';
import { sendNotification } from '../services/webhookServices.js';

// ---------- tiny helpers ----------
const num = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};
const fixed2 = (n) => +Number(n).toFixed(2);

// Find an account by its ledger number (adjust field name if different)
const findAccountByNumber = (accountNumber) =>
  Account.findOne({ where: { account_number: accountNumber } });

// Idempotency via PRIMARY KEY: transaction_id == provider reference
const alreadyCompletedById = async (transaction_id) => {
  const row = await Transaction.findByPk(transaction_id);
  return row && row.status === 'completed';
};

// ---------- event handlers matched to your model ----------

// NIP inbound credit
const onNip = async (data) => {
  const {
    accountNumber, reference, amount, fee = 0,
    senderName, description
  } = data;

  const acct = await findAccountByNumber(accountNumber);
  if (!acct) throw new Error(`NIP: account not found: ${accountNumber}`);

  // Idempotency: use provider reference as PK
  if (await alreadyCompletedById(reference)) return;


  await Transaction.create({
    transaction_id: reference,                 // <— idempotent
    customer_id: acct.customer_id,
    transaction_type: 'credit',
    transaction_amount: num(amount),
    initial_amount: initial,
    final_amount: final,
    transaction_fee: num(fee),
    receiver_name: acct.account_name || acct.customer_id, // adjust if you have account_name
    sender_name: senderName || null,
    receiver_bank: acct.bank_name || 'EMBEDLY', // NOT NULL in your model
    status: 'completed',
  });

  await sendNotification(acct.customer_id, {
    type: 'payment_success',
    channel: 'nip',
    amount: num(amount),
    reference,
    balance: final,
    description: description || undefined,
  });
};

// Checkout payment success (credit recipient)
const onCheckoutSuccess = async (data) => {
  const {
    recipientAccountNumber, recipientName, amount, reference,
    /* senderAccountNumber, senderName, createdAt, walletId, checkoutRef */
  } = data;

  const acct = await findAccountByNumber(recipientAccountNumber);
  if (!acct) throw new Error(`Checkout.success: recipient not found: ${recipientAccountNumber}`);

  if (await alreadyCompletedById(reference)) return;

  const initial = num(acct.balance);
  const final = fixed2(initial + num(amount));

  await Account.update({ balance: final }, { where: { id: acct.id } });

  await Transaction.create({
    transaction_id: reference,                 // <— idempotent
    customer_id: acct.customer_id,
    transaction_type: 'credit',
    transaction_amount: num(amount),
    initial_amount: initial,
    final_amount: final,
    transaction_fee: 0.00,
    receiver_name: recipientName || acct.account_name || acct.customer_id,
    sender_name: null,
    receiver_bank: acct.bank_name || 'EMBEDLY',
    status: 'completed',
  });

  await sendNotification(acct.customer_id, {
    type: 'payment_success',
    channel: 'checkout',
    amount: num(amount),
    reference,
    balance: final,
  });
};

// Checkout payment failed (no balance change; record as failed)
const onCheckoutFailed = async (data) => {
  const { recipientAccountNumber, amount, reference, message, error } = data;

  const acct = await findAccountByNumber(recipientAccountNumber);
  if (!acct) throw new Error(`Checkout.failed: recipient not found: ${recipientAccountNumber}`);

  const existing = await Transaction.findByPk(reference);
  const bal = num(acct.balance);

  if (existing) {
    if (existing.status !== 'failed') {
      await existing.update({ status: 'failed' });
    }
  } else {
    await Transaction.create({
      transaction_id: reference,               // <— idempotent
      customer_id: acct.customer_id,
      transaction_type: 'credit',
      transaction_amount: num(amount),
      initial_amount: bal,
      final_amount: bal, // no change
      transaction_fee: 0.00,
      receiver_name: acct.account_name || acct.customer_id,
      sender_name: null,
      receiver_bank: acct.bank_name || 'EMBEDLY',
      status: 'failed',
    });
  }

  await sendNotification(acct.customer_id, {
    type: 'payment_failed',
    channel: 'checkout',
    amount: num(amount),
    reference,
    reason: error || message || 'Checkout failed',
  });
};

// Checkout reversal success (debit recipient)
const onCheckoutReversal = async (data) => {
  const { recipientAccountNumber, recipientName, amount, reference /* REVERSAL_* */ } = data;

  const acct = await findAccountByNumber(recipientAccountNumber);
  if (!acct) throw new Error(`Checkout.reversal: recipient not found: ${recipientAccountNumber}`);

  if (await alreadyCompletedById(reference)) return;

  const initial = num(acct.balance);
  const final = fixed2(initial - num(amount));

  await Account.update({ balance: final }, { where: { id: acct.id } });

  await Transaction.create({
    transaction_id: reference,                 // <— idempotent
    customer_id: acct.customer_id,
    transaction_type: 'debit',
    transaction_amount: num(amount),
    initial_amount: initial,
    final_amount: final,
    transaction_fee: 0.00,
    receiver_name: recipientName || acct.account_name || acct.customer_id,
    sender_name: null,
    receiver_bank: acct.bank_name || 'EMBEDLY',
    status: 'completed',
  });

  await sendNotification(acct.customer_id, {
    type: 'payment_reversed',
    channel: 'checkout',
    amount: num(amount),
    reference,
    balance: final,
  });
};

// Payout (your outbound transfer). If you didn’t pre-debit, we debit here on Success.
const onPayout = async (data) => {
  const {
    debitAccountNumber, creditAccountNumber, creditAccountName,
    amount, status, paymentReference
  } = data;

  const acct = await findAccountByNumber(debitAccountNumber);
  if (!acct) {
    console.log('Payout: local debit account not found; skipping balance update');
    return;
  }

  // On retries you’ll receive the same paymentReference again
  if (status === 'Success' && await alreadyCompletedById(paymentReference)) return;

  if (status === 'Success') {
    const initial = num(acct.balance);
    const final = fixed2(initial - num(amount));

    await Account.update({ balance: final }, { where: { id: acct.id } });

    await Transaction.create({
      transaction_id: paymentReference,        // <— idempotent
      customer_id: acct.customer_id,
      transaction_type: 'debit',
      transaction_amount: num(amount),
      initial_amount: initial,
      final_amount: final,
      transaction_fee: 0.00,
      receiver_name: creditAccountName || creditAccountNumber,
      sender_name: acct.account_name || acct.customer_id,
      receiver_bank: acct.bank_name || 'EMBEDLY',
      status: 'completed',
    });

    await sendNotification(acct.customer_id, {
      type: 'transfer_success',
      channel: 'payout',
      amount: num(amount),
      reference: paymentReference,
      recipient_name: creditAccountName,
      recipient_account: creditAccountNumber,
      balance: final,
    });
  } else {
    // If you pre-debited at initiation, you could refund here.
    // Left minimal since docs only show Success in sample.
  }
};

// ---------- main entry you call from your route ----------
export const handleEmbedlyWebhook = async (req, res) => {
  const { event, data } = req.body || {};
  if (!event || !data) throw new Error('Missing event or data');

  switch (event) {
    case 'nip':                       await onNip(data); break;
    case 'checkout.payment.success':  await onCheckoutSuccess(data); break;
    case 'checkout.payment.failed':   await onCheckoutFailed(data); break;
    case 'checkout.reversal.success': await onCheckoutReversal(data); break;
    case 'payout':                    await onPayout(data); break;
    default:                          console.log('Unhandled event:', event);
  }
};
