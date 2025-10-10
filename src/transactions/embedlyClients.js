import dotenv from 'dotenv';
import { embedlyAPI } from '../utilities/embedlyConnection.js';
dotenv.config();

const { EMBEDLY_STAGING_KEY, EMBEDLY_BASE_URL, EMBEDLY_PAYOUT_URL } = process.env;

if (!EMBEDLY_STAGING_KEY || !EMBEDLY_BASE_URL) {
  throw new Error('Missing Embedly API configuration in .env');
}

//
// 🧾 Customer Endpoints
//
export const customers = {
  add: async (body) => {
     const res = await embedlyAPI.post('/customers/add', body);
    // Axios returns { data: ... }
    return res.data; // <- always return the inner payload

  },
  get: async (embedlyCustomerId) => {
    const res = await embedlyAPI.get(`/customers/get/id/${embedlyCustomerId}`);
    return res.data;
  },

  // PATCH update customer fields (e.g., names)
  update: async (embedlyCustomerId, body) => {
    const res = await embedlyAPI.patch(`/customers/update/${embedlyCustomerId}`, body);
    return res.data;
  }
};


//
// 💰 Wallet + Transaction Endpoints
//
export const transactions = {
  balance: async (accountNumber) => {
    const res = await fetch(`${EMBEDLY_BASE_URL}/wallets/get/wallet/account/${accountNumber}`, {
      method: 'GET',
      headers: {
        'x-api-key': EMBEDLY_STAGING_KEY,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    return data;
  },

  toBank: async (body) => {
    const res = await fetch(`${EMBEDLY_PAYOUT_URL}/inter-bank-transfer`, {
      method: 'POST',
      headers: {
        'x-api-key': EMBEDLY_STAGING_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return res.json();
  },

  toWallet: async (body) => {
    const res = await fetch(`${EMBEDLY_BASE_URL}/wallets/wallet/transaction/v2/wallet-to-wallet`, {
      method: 'PUT',
      headers: {
        'x-api-key': EMBEDLY_STAGING_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    //console.log("Response from Embedly for wallet transfer:", res);
    const data = await res.json();
    return data;
  },

  history: async (body) => {
    const url = new URL(`${EMBEDLY_BASE_URL}/wallets/history`);
Object.entries(body).forEach(([k, v]) => {
  if (v != null) url.searchParams.set(k, String(v));
});

const res = await fetch(url, {
  method: 'GET',
  headers: {
    'x-api-key': EMBEDLY_STAGING_KEY,
    Accept: 'application/json', // drop Content-Type for GET
  },
});
    console.log("Response from Embedly for transaction history:", res);
    const data = await res.json();
    return data;
  },

  banks: async () => {
    const res = await fetch(`${EMBEDLY_PAYOUT_URL}/banks`, {
      method: 'GET',
      headers: {
        'x-api-key': EMBEDLY_STAGING_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log("Response from Embedly for banks:", res, EMBEDLY_PAYOUT_URL);
    return res.json();
  },

  verifyBank: async (bankCode, accountNumber) => {
    const res = await fetch(`${EMBEDLY_BASE_URL}/wallets/utils/verify_bank`, {
      method: 'POST',
      headers: {
        'x-api-key': EMBEDLY_STAGING_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bankCode, accountNumber })
    });
    return res.json();
  },

  verifyName: async (body) => {
    const res = await fetch(`${EMBEDLY_PAYOUT_URL}/name-enquiry`, {
      method: 'POST',
      headers: {
        'x-api-key': EMBEDLY_STAGING_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return res.json();
  }
};
