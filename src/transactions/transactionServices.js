import { transactions, customers } from './embedlyClients.js';
import User from '../models/user.js';
import Account from '../models/account.js';
import { safeCall } from '../utilities/apiWrapper.js';
import { embedlyAPI } from '../utilities/embedlyConnection.js';
import dotenv from 'dotenv';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcrypt';
import { sendMail } from '../utilities/nodeMailer.js';
import { EMBEDLY_ORGANIZATION_ID, CURRENCY_ID } from '../config/env.js';
dotenv.config();

// async function resolveWallet(customer_id) {
//   const user = await User.findOne({ where: { customer_id } });
//   if (!user || !user.wallet_id) {
//     const err = new Error('Wallet not found');
//     err.status = 404;
//     throw err;
//   }
//   if (user.kyc_status !== 'VERIFIED') {
//     const err = new Error('KYC verification required');
//     err.status = 403;
//     throw err;
//   }
//   return user.wallet_id;
// }

export async function getWallet(accountNumber) {
  const res = await safeCall(() => transactions.balance(accountNumber));
  return res;
}

export async function transferToBank(opts) {
  const fromAccount = await User.findOne({ where: { customer_id: opts.customer_id} });
  const accountDetails = await Account.findOne({ where: { customer_id: opts.customer_id } });
  const isPasswordValid = await bcrypt.compare(opts.pin, fromAccount.pin);
  if (!isPasswordValid) {
    throw new Error('Invalid pin');
  }
  const generateTransactionRef = () => {
    const timestamp = Date.now().toString(36); // Convert to base36 for compactness
    const randomStr = Math.random().toString(36).substring(2, 8); // Random string
    return `TX-${timestamp}-${randomStr}`;
  };
  const body = {
    destinationBankCode: opts.bankCode,
    destinationAccountNumber: opts.accountNumber,
    destinationAccountName: opts.accountName,
    sourceAccountNumber: accountDetails.account_number,
    sourceAccountName: fromAccount.firstname + ' ' + fromAccount.lastname,
    remarks: opts.remarks,
    amount: opts.amount,
    currencyId: CURRENCY_ID,
    customerTransactionReference: generateTransactionRef(),
    webhookUrl: opts.webhookUrl || null,
  };

  const res = await safeCall(() => transactions.toBank(body));
  return res;
}

export async function transferToWallet(opts) {
  console.log("Transfer to wallet called with opts:", opts);
  //const fromWallet = await resolveWallet(opts.fromCustomerId);
  const fromAccount = await User.findOne({ where: { customer_id: opts.fromCustomerId } });
  const accountDetails = await Account.findOne({ where: { customer_id: opts.fromCustomerId } });
  const isPasswordValid = await bcrypt.compare(opts.pin, fromAccount.pin);

  const generateTransactionRef = () => {
    const timestamp = Date.now().toString(36); // Convert to base36 for compactness
    const randomStr = Math.random().toString(36).substring(2, 8); // Random string
    return `TX-${timestamp}-${randomStr}`;
  };

  if (!isPasswordValid) {
    throw new Error('Invalid pin');
  }
  if (!accountDetails || !accountDetails.account_number) {
    const err = new Error('Sender account not found');
    err.status = 404;
    throw err;
  }
  const body = {
    fromAccount: accountDetails.account_number,
    toAccount: opts.toCustomerAccount,
    transactionReference: generateTransactionRef(),
    amount: parseFloat(opts.amount),
    remarks: opts.narration || 'Wallet transfer'
  };

  //console.log("Transfer body:", body);
  const res = await safeCall(() => transactions.toWallet(body));
  return res;
}

export async function getTransactionHistory(
  customer_id,
  { page = 1, limit = 20, type, status } = {}
) {
  const accountDetails = await Account.findOne({ where: { customer_id: customer_id } });
  //const walletId = await resolveWallet(customer_id);
  const body = {
    customerId: customer_id,
    organizationId: EMBEDLY_ORGANIZATION_ID,
    walletId: accountDetails.walletId,
    from: "2025-09-13",
    to: "2025-10-14"
  };
  console.log("Transaction history body:", body);
  const res = await safeCall(() =>
    transactions.history(body)
  );
  return res;
}

export async function listSupportedBanks() {
  const res = await safeCall(() => transactions.banks());
  return res.data;
}

export async function getBankAccountName(data){
  const body = {
    bankCode: data.bankCode,
    accountNumber: data.accountNumber
  }
  const res = await safeCall(() => transactions.verifyName(body));
  return res.data.data;
}

export async function verifyBankAccount({ bankCode, accountNumber }) {
  const res = await safeCall(() =>
    transactions.verifyBank(bankCode, accountNumber)
  );
  return res.data.data;
}

export async function createEmbedlyWallet(customer_id) {
  const user = await User.findOne({ where: { customer_id },
    attributes: ['embedly_customer_id', 'customer_id', 'firstname', 'lastname', 'customerType', 'email'] });
  if (!user) throw new Error('User not found');
  if (!user.embedly_customer_id) throw new Error('Embedly customer ID missing');

   const account = await Account.findOne({ where: { customer_id },
    attributes: ['balance', 'ledgerBalance'] });

  const currencyRes = await safeCall(() =>
    embedlyAPI.get('/utilities/currencies/get')
  );
  console.log(currencyRes.data);
  const currencies = currencyRes.data?.data || [];
  const ngnCurrency = currencies.find(c => c.shortName === 'NGN');
  console.log(ngnCurrency);
  if (!ngnCurrency) res.status(404).send('NGN currency not found');

  // const typesRes = await safeCall(() => embedlyAPI.get('/wallets/types'));
  // const walletTypes = typesRes.data?.data || [];
  // const defaultType = walletTypes[0];
  // if (!defaultType) throw new Error('No wallet types found');

  const body = {
    id: user.customer_id,
    customerId: user.embedly_customer_id,
    availableBalance: account.balance,
    ledgerBalance: account.ledgerBalance,
    currencyId: ngnCurrency.id,
    isInternal: false,
    isDefault: true,
    name: user.firstname + ' ' + user.lastname,
    customerTypeId: process.env.EMBEDLY_CUSTOMER_TYPE_ID
  };

  console.log('Creating wallet with body:', body);

  const createRes = await safeCall(() =>
    embedlyAPI.post('/wallets/add', body)
  );
  if (createRes.error) {
    console.error('Error creating wallet:', createRes.error);
    throw new Error('Failed to create wallet');
}
console.log('Wallet creation response:', createRes);
console.log( createRes.data.data.virtualAccount);
if (createRes.data.success === true) {
  sendMail(user.email, 'Wallet Created Successfully', `<p> Dear ${user.firstname} ${user.lastname},<br> Your wallet has been created, Account number: ${createRes.data.data.virtualAccount.accountNumber}, Bank Name: ${createRes.data.data.virtualAccount.bankName}</p>`);
  await Account.update(
    {
      walletId: createRes.data.data.id,
      account_number: createRes.data.data.virtualAccount.accountNumber,
      bank_code: createRes.data.data.virtualAccount.bankCode, 
      bank_name: createRes.data.data.virtualAccount.bankName
    },
    { where: { customer_id } }

  );


  const walletData = createRes.data?.data;
  
  return walletData;
}
}

export async function getCustomerTier(customer_id) {
  console.log('[TIER DEBUG] Incoming customer_id:', customer_id);

  const user = await User.findOne({
    where: { customer_id },
    attributes: ['embedly_customer_id']
  });

  console.log('[TIER DEBUG] Found user:', user?.toJSON());

  if (!user || !user.embedly_customer_id) {
    throw new Error('Embedly customer ID not found');
  }

  console.log('[TIER DEBUG] Calling Embedly API for tier...');
  const res = await safeCall(() =>
    embedlyAPI.get(`/playground/customer/kyc/get_customer_tier/${user.embedly_customer_id}`)
  );

  console.log('[TIER DEBUG] Embedly raw response:', res?.data);

  const tier = res.data?.data?.tier;
  if (!tier) throw new Error('Tier information not returned by API');

  await User.update(
    { customer_tier: tier },
    { where: { customer_id } }
  );

  console.log('[TIER DEBUG] Tier updated locally to:', tier);

  return tier;
};


export async function getSupportedCurrencies() {
  const res = await safeCall(() =>
    embedlyAPI.get('/playground/Wallet/utils/get_currency')
  );
  return res.data?.data || [];
}

export async function getSupportedCountries() {
  const res = await safeCall(() =>
    embedlyAPI.get('/playground/customer/utils/get_countries')
  );
  return res.data?.data || [];
}
