import { API_KEY } from '../config/env.js';

export const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '',
    method: '',
    headers: {
      Authorization: API_KEY,
      'Content-Type': 'application/json'
    }
  }
