import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '../config/env.js';
  

const generateAccessToken = (user) => 
    jwt.sign({  customer_id: user. customer_id }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

const generateRefreshToken = (user) => 
    jwt.sign({  customer_id: user. customer_id }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

const verifyRefreshToken = (token) => 
    jwt.verify(token, REFRESH_TOKEN_SECRET);

export { generateAccessToken, generateRefreshToken, verifyRefreshToken };
