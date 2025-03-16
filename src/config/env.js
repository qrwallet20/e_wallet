import 'dotenv/config'

export const PORT = process.env.PORT || 3000;

export const DATABASE_URL = process.env.DATABASE_URL;

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export const ACCESS_TOKEN_EXPIRY = '15m';

export const REFRESH_TOKEN_EXPIRY = '7d';
