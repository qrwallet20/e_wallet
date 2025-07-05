import bcrypt from 'bcrypt';
import User from '../models/user.js';
import { v4 as uuid } from 'uuid';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../utilities/tokenUtils.js';
import RefreshToken from '../models/refreshToken.js';
import { embedlyAPI, EMBEDLY_ORGANIZATION_ID } from '../utilities/embedlyConnection.js';

// Utility function to validate phone numbers (Nigerian format)
const isValidPhoneNumber = (phone_number) => {
  const regex = /^(?:\+234|0)[7-9][01]\d{8}$/;
  return regex.test(phone_number);
};

// Utility function to validate passwords (Minimum 8 chars, letters & numbers)
const isValidPassword = (password) => {
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+.,?-]{8,}$/;
  return regex.test(password);
};

/**
 * Register a new user locally and in Embedly
 */
const registerUser = async (
  firstname,
  lastname,
  email,
  password,
  phone_number
) => {
  // Validation
  if (!firstname || !lastname || !email || !password || !phone_number) {
    throw new Error('All fields are required');
  }
  if (firstname.length < 2 || lastname.length < 2) {
    throw new Error('First name and last name must be at least 2 characters long');
  }
  if (!isValidPhoneNumber(phone_number)) {
    throw new Error('Invalid phone number format');
  }
  if (!isValidPassword(password)) {
    throw new Error('Password must be at least 8 characters long and include letters & numbers');
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    where: {
      [User.sequelize.Op.or]: [{ phone_number }, { email }]
    }
  });
  if (existingUser) {
    throw new Error('Phone number or email already registered');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  const customer_id = uuid();

  // Create user locally
  const new_user = await User.create({
    customer_id,
    firstname,
    lastname,
    email,
    password: hashedPassword,
    phone_number,
    organization_id: EMBEDLY_ORGANIZATION_ID
  });

  // Create customer in Embedly (best effort)
  try {
    await createEmbedlyCustomer(new_user);
  } catch (error) {
    console.error('Failed to create Embedly customer:', error);
  }

  return {
    customer_id: new_user.customer_id,
    firstname: new_user.firstname,
    lastname: new_user.lastname,
    email: new_user.email,
    phone_number: new_user.phone_number,
    kyc_status: new_user.kyc_status
  };
};

/**
 * Wrap Embedly customer creation
 */
const createEmbedlyCustomer = async (user) => {
  const customerData = {
    organizationId: EMBEDLY_ORGANIZATION_ID,
    firstName: user.firstname,
    lastName: user.lastname,
    email: user.email,
    phoneNumber: user.phone_number
  };
  const response = await embedlyAPI.post('/customers', customerData);
  if (response.data?.customerId) {
    await User.update(
      { embedly_customer_id: response.data.customerId },
      { where: { customer_id: user.customer_id } }
    );
    console.log('Embedly customer created:', response.data.customerId);
    return response.data;
  }
};

/**
 * Authenticate user and issue tokens
 */
const authenticateUser = async (phone_number, password) => {
  const current_user = await User.findOne({ where: { phone_number } });
  if (!current_user) {
    throw new Error('User does not exist');
  }
  const isPasswordValid = await bcrypt.compare(password, current_user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid phone number or password');
  }

  // Issue tokens
  const accessToken = signAccessToken(current_user);
  const rawRefresh = signRefreshToken(current_user);

  // Hash & store refresh token
  const hash = await bcrypt.hash(rawRefresh, 10);
  const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    token_hash: hash,
    customer_id: current_user.customer_id,
    expires_at: expiresAt
  });

  const outputMessage =
    current_user.kyc_status !== 'VERIFIED'
      ? 'Login successful, but KYC verification is required for full access.'
      : 'Login successful';

  return {
    accessToken,
    refreshToken: rawRefresh,
    outputMessage,
    user: {
      customer_id: current_user.customer_id,
      firstname: current_user.firstname,
      lastname: current_user.lastname,
      email: current_user.email,
      kyc_status: current_user.kyc_status
    }
  };
};

/**
 * Refresh access and rotate refresh token
 */
const refreshAccessToken = async (rawRefreshToken) => {
  // Verify incoming token
  const decoded = verifyRefreshToken(rawRefreshToken);

  // Find matching hashed token
  const tokens = await RefreshToken.findAll({
    where: { customer_id: decoded.customer_id }
  });
  let matched = null;
  for (const t of tokens) {
    if (await bcrypt.compare(rawRefreshToken, t.token_hash)) {
      matched = t;
      break;
    }
  }
  if (!matched) {
    throw new Error('Invalid or revoked refresh token');
  }

  // Check expiry
  if (matched.expires_at < new Date()) {
    await matched.destroy();
    throw new Error('Refresh token expired');
  }

  // Revoke old token
  await matched.destroy();

  // Issue new tokens
  const accessToken = signAccessToken({ customer_id: decoded.customer_id });
  const newRawRefresh = signRefreshToken({ customer_id: decoded.customer_id });

  // Hash & store new refresh token
  const newHash = await bcrypt.hash(newRawRefresh, 10);
  const newExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    token_hash: newHash,
    customer_id: decoded.customer_id,
    expires_at: newExpiresAt
  });

  return { accessToken, refreshToken: newRawRefresh };
};

/**
 * Logout user by revoking their refresh token
 */
const logoutUser = async (rawRefreshToken) => {
  const decoded = verifyRefreshToken(rawRefreshToken);
  const tokens = await RefreshToken.findAll({
    where: { customer_id: decoded.customer_id }
  });
  for (const t of tokens) {
    if (await bcrypt.compare(rawRefreshToken, t.token_hash)) {
      await t.destroy();
      break;
    }
  }
};

export {
  authenticateUser,
  refreshAccessToken,
  registerUser,
  logoutUser,
  createEmbedlyCustomer
};
