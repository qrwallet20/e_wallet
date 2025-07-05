// src/services/embedlyClients.js
import axios from 'axios';
import { EMBEDLY_API_KEY } from '../config/env.js';

if (!EMBEDLY_API_KEY) throw new Error('Missing EMBEDLY_API_KEY');

const api = axios.create({
  baseURL: 'https://api.embedly.ng/v1',
  headers: { Authorization: `Bearer ${EMBEDLY_API_KEY}` }
});

export const customers = {
  add:    body => api.post('/customers/add', body),
  get:    id   => api.get(`/customers/get/id/${id}`),
  update: (id,body) => api.patch(`/customers/update/${id}`, body),
  list:   params => api.get('/customers/get/all', params)
};

export const transactions = {
  balance: walletId => api.get(`/wallets/${walletId}/balance`),
  history: (walletId, page, limit, type, status) =>
    api.get(`/wallets/${walletId}/transactions`, { params: { page, limit, type, status } }),
  toBank:   body => api.post('/payouts/bank', body),
  toWallet: body => api.post('/transfers/wallet', body),
  banks:    ()   => api.get('/banks'),
  verifyBank: (bankCode,accountNumber) =>
    api.get('/banks/verify', { params: { bankCode, accountNumber } })
};
