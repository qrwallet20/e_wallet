import dotenv from 'dotenv';
dotenv.config();


export const PORT = process.env.PORT || 3000;


export const DATABASE_URL = process.env.DATABASE_URL;

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export const ACCESS_TOKEN_EXPIRY = '15m';

export const REFRESH_TOKEN_EXPIRY = '15d';

export const MAX_RETRIES = process.env.MAX_RETRIES;

export const RETRY_DELAY = process.env.RETRY_DELAY;

export const MAX_REQUEST = process.env.MAX_REQUEST;

export const API_KEY = process.env.API_KEY;

export const WEBHOOK_SECRET = "";

// Embedly.ng API Configuration
export const EMBEDLY_API_KEY = process.env.EMBEDLY_API_KEY; 

export const EMBEDLY_BASE_URL = process.env.EMBEDLY_BASE_URL; //test URL CHANGE TO PROD EVENTUALLY

// For staging/testing - remove in production
export const EMBEDLY_STAGING_KEY = process.env.EMBEDLY_STAGING_KEY;
export const EMBEDLY_ORGANIZATION_ID = process.env.EMBEDLY_ORGANIZATION_ID;
export const EMBEDLY_NIN_KYC_KEY = process.env.EMBEDLY_NIN_KYC_KEY;

export const NODE_ENV = process.env.NODE_ENV || 'development';

export const COUNTRY_ID = process.env.COUNTRY_ID;

export const CURRENCY_ID = process.env.CURRENCY_ID;

export const EMAIL_USER = process.env.EMAIL_USER;

export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

export const MAX_EMAIL_RETRIES = process.env.MAX_EMAIL_RETRIES;

export const RETRY_DELAY_MS = process.env.RETRY_DELAY;