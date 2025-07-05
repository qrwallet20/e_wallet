
import { transactions } from './embedlyClients.js';
import User              from '../models/user.js';
import { safeCall }      from '../utilities/apiWrapper.js';

async function resolveWallet(customer_id) {
    const user = await User.findOne({ where: { customer_id }});
    if (!user || !user.wallet_id) {
      const err = new Error('Wallet not found');
      err.status = 404;
      throw err;
    }
    if (user.kyc_status !== 'VERIFIED') {
      const err = new Error('KYC verification required');
      err.status = 403;
      throw err;
    }
    return user.wallet_id;
  }

  /**
 * Get wallet balance
 */
export async function getWalletBalance(customer_id) {
    const walletId = await resolveWallet(customer_id);
    const res      = await safeCall(() => transactions.balance(walletId));
    return res.data;
  }
  
  /**
   * Transfer funds to bank
   */
  export async function transferToBank(opts) {
    const walletId = await resolveWallet(opts.customer_id);
    const body     = {
      walletId,
      amount:       parseFloat(opts.amount),
      bankCode:     opts.bankCode,
      accountNumber:opts.accountNumber,
      accountName:  opts.accountName,
      narration:    opts.narration || 'Bank transfer',
      currency:     'NGN'
    };
    const res = await safeCall(() => transactions.toBank(body));
    return res.data;
  }
  
  /**
   * Transfer funds between wallets
   */
  export async function transferToWallet(opts) {
    const fromWallet = await resolveWallet(opts.fromCustomerId);
    // note: recipient needn’t be VERIFIED to receive
    const toUser     = await User.findOne({ where:{ customer_id: opts.toCustomerId }});
    if (!toUser || !toUser.wallet_id) {
      const err = new Error('Recipient wallet not found');
      err.status = 404;
      throw err;
    }
    const body = {
      fromWalletId: fromWallet,
      toWalletId:   toUser.wallet_id,
      amount:       parseFloat(opts.amount),
      narration:    opts.narration || 'Wallet transfer',
      currency:     'NGN'
    };
    const res = await safeCall(() => transactions.toWallet(body));
    return res.data;
  }
  
  /**
   * Get transaction history (with paging)
   */
  export async function getTransactionHistory(customer_id, { page=1, limit=20 } = {}) {
    const walletId = await resolveWallet(customer_id);
    const res      = await safeCall(() =>
      transactions.history(walletId, page, limit)
    );
    return {
      data: res.data,
      meta: res.meta    // if Embedly returns pagination in `meta`
    };
  }
  
  /**
   * List supported banks
   */
  export async function listSupportedBanks() {
    const res = await safeCall(() => transactions.banks());
    return res.data;
  }
  
  /**
   * Verify a bank account
   */
  export async function verifyBankAccount({ bankCode, accountNumber }) {
    const res = await safeCall(() =>
      transactions.verifyBank(bankCode, accountNumber)
    );
    return res.data;
  }
  