// import jwt from 'jsonwebtoken';
// import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '../config/env.js';
  

// const generateAccessToken = (user) => 
//     jwt.sign({  customer_id: user. customer_id }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

// const generateRefreshToken = (user) => 
//     jwt.sign({  customer_id: user. customer_id }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

// const verifyRefreshToken = (token) => 
//     jwt.verify(token, REFRESH_TOKEN_SECRET);

// export { generateAccessToken, generateRefreshToken, verifyRefreshToken };

import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
} from '../config/env.js';

export function signAccessToken(user) {
  const payload = { customer_id: user.customer_id };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
}

export function signRefreshToken(user) {
  const payload = { customer_id: user.customer_id };
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}



