import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { EMBEDLY_STAGING_KEY, EMBEDLY_BASE_URL, NODE_ENV, PAYOUT_URL } = process.env;

if (!EMBEDLY_STAGING_KEY) throw new Error('Missing EMBEDLY_STAGING_KEY in your environment');

const baseURL =
  EMBEDLY_BASE_URL ||
  (NODE_ENV === 'production'
    ? 'https://waas-prod.embedly.ng/api/v1'
    : 'https://waas-staging.embedly.ng/api/v1');

export const embedlyAPI = axios.create({
  baseURL,
  timeout: 15000,
  validateStatus: () => true,
  headers: {
    'x-api-key': EMBEDLY_STAGING_KEY,
    'Accept': 'application/json'  // good to have globally
    // ❌ don't set Content-Type here
  }
});

export const embedlyPayoutAPI = axios.create({
  baseURL: PAYOUT_URL,
  timeout: 15000,
  validateStatus: () => true,
  headers: {
    'x-api-key': EMBEDLY_STAGING_KEY,
    'Accept': 'application/json'  
  }
});

// Set Content-Type ONLY when there is a JSON body; strip it otherwise
embedlyAPI.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  const bodyMethod = method === 'post' || method === 'put' || method === 'patch';

  // Axios normalizes headers, but be thorough
  const hdrs = config.headers || {};
  delete hdrs['Content-Type'];
  delete hdrs['content-type'];

  const hasBody = bodyMethod && config.data != null && config.data !== '';

  if (hasBody) {
    hdrs['Content-Type'] = 'application/json';
  }

  // (optional) trim string query params
  if (config.params) {
    for (const [k, v] of Object.entries(config.params)) {
      if (typeof v === 'string') config.params[k] = v.trim();
    }
  }

  config.headers = hdrs;
  return config;
});


// import dotenv from 'dotenv';
// import path from 'path';
// import axios from 'axios';

// // Load .env first, BEFORE destructuring variables
// dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// const {
//   EMBEDLY_API_KEY,
//   EMBEDLY_BASE_URL,
//   NODE_ENV
// } = process.env;

// if (!EMBEDLY_API_KEY) {
//   throw new Error('Missing EMBEDLY_API_KEY in your environment');
// }

// const baseURL =
//   EMBEDLY_BASE_URL ||
//   (NODE_ENV === 'production'
//     ? 'https://waas-prod.embedly.ng/api/v1'
//     : 'https://waas-staging.embedly.ng/api/v1');

// export const embedlyAPI = axios.create({
//   baseURL,
//   headers: {
//     'x-api-key': EMBEDLY_API_KEY,
//     'Content-Type': 'application/json'
//   },
//   timeout: 15000,
//   validateStatus: () => true
// });

// embedlyAPI.interceptors.request.use((config) => {
//   const m = (config.method || 'get').toLowerCase();
//   if (m === 'get' || m === 'head') {
//     delete config.headers?.['Content-Type'];
//     delete config.headers?.['content-type'];
//   }
//   return config;
// });

// // import axios from 'axios';
// // import { 
// //     EMBEDLY_API_KEY, 
// //     EMBEDLY_BASE_URL, 
// //     EMBEDLY_STAGING_KEY,
// //     EMBEDLY_ORGANIZATION_ID,
// //     EMBEDLY_NIN_KYC_KEY 
// // } from '../config/env.js';

// // // Create Embedly API instance
// // export const embedlyAPI = axios.create({
// //     baseURL: EMBEDLY_BASE_URL,
// //     timeout: 30000,
// //     headers: {
// //         'Content-Type': 'application/json',
// //         'API-KEY': process.env.NODE_ENV === 'production' ? EMBEDLY_API_KEY : EMBEDLY_STAGING_KEY
// //     }
// // });

// // // Create separate instance for NIN KYC operations
// // export const embedlyKYCAPI = axios.create({
// //     baseURL: EMBEDLY_BASE_URL,
// //     timeout: 30000,
// //     headers: {
// //         'Content-Type': 'application/json',
// //         'API-KEY': EMBEDLY_NIN_KYC_KEY
// //     }
// // });

// // // Add request interceptor for logging
// // embedlyAPI.interceptors.request.use(
// //     (config) => {
// //         console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
// //         return config;
// //     },
// //     (error) => {
// //         console.error('Request error:', error);
// //         return Promise.reject(error);
// //     }
// // );

// // // Add response interceptor for error handling
// // embedlyAPI.interceptors.response.use(
// //     (response) => {
// //         return response;
// //     },
// //     (error) => {
// //         console.error('API Error:', error.response?.data || error.message);
        
// //         // Handle common Embedly API errors
// //         if (error.response?.status === 401) {
// //             throw new Error('Invalid API key or authentication failed');
// //         } else if (error.response?.status === 404) {
// //             throw new Error('Requested resource not found');
// //         } else if (error.response?.status >= 500) {
// //             throw new Error('Server error occurred. Please try again later');
// //         }
        
// //         throw error;
// //     }
// // );

// // // Apply same interceptors to KYC API
// // embedlyKYCAPI.interceptors.request.use(embedlyAPI.interceptors.request.handlers[0].fulfilled);
// // embedlyKYCAPI.interceptors.response.use(
// //     embedlyAPI.interceptors.response.handlers[0].fulfilled,
// //     embedlyAPI.interceptors.response.handlers[0].rejected
// // );

// // export { EMBEDLY_ORGANIZATION_ID };