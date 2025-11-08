import jwt from 'jsonwebtoken';
import { TRANSACTION_TOKEN_EXPIRY, TRANSACTION_TOKEN_SECRET} from '../config/env.js';

export function signTransactionToken(accountNumber, amount) {
  const payload = { accName: accountNumber, amount: amount };
  return jwt.sign(payload,TRANSACTION_TOKEN_SECRET, {
    expiresIn: TRANSACTION_TOKEN_EXPIRY
  });
}

export function verifyTransactionToken(token) {
  return jwt.verify(token, TRANSACTION_TOKEN_SECRET);
}