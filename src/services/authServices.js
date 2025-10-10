import bcrypt from 'bcrypt';
import User from '../models/user.js';
import { v4 as uuid } from 'uuid';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import { safeCall } from '../utilities/apiWrapper.js';
import { customers } from '../transactions/embedlyClients.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../utilities/tokenUtils.js';
import RefreshToken from '../models/refreshToken.js';
import { embedlyAPI as embedlyKYCAPI } from '../utilities/embedlyConnection.js';
import { EMBEDLY_ORGANIZATION_ID,COUNTRY_ID } from '../config/env.js';
import { sendMail } from '../utilities/nodeMailer.js';
//import { verify } from 'jsonwebtoken';

// Utility function to validate phone numbers (Nigerian format)
const isValidPhoneNumber = (phone_number) => {
  const regex = /^(?:\+234|0)[7-9][01]\d{8}$/;
  return regex.test(phone_number);
};

// function toE164Nigeria(msisdn) {
//   const s = String(msisdn).trim();
//   if (s.startsWith('+234')) return s;
//   if (s.startsWith('0') && s.length === 11) return '+234' + s.slice(1);
//   // last resort: if already starts 234
//   if (s.startsWith('234')) return '+' + s;
//   return s; // leave as-is if unknown
// }


// Utility function to validate passwords (Minimum 8 chars, letters & numbers)
const isValidPassword = (password) => {
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+.,?-]{8,}$/;
  return regex.test(password);
};

/**
 * Register a new user locally and in Embedly
 */
const country_id = COUNTRY_ID;
 const registerUser = async (
  firstname,
  lastname,
  middlename,
  email,
  password,
  phone_number
) => {
  // 1) Basic validation
  if (!firstname || !lastname || !middlename || !email || !password || !phone_number) {
    throw new Error('All fields are required');
  }
  if (firstname.length < 2 || lastname.length < 2 || middlename.length < 2) {
    throw new Error('First name, last name, and middle name must be at least 2 characters long');
  }
  if (!isValidPhoneNumber(phone_number)) {
    throw new Error('Invalid phone number format');
  }
  if (!isValidPassword(password)) {
    throw new Error('Password must be at least 8 characters long and include letters & numbers');
  }

  // 2) Uniqueness check
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ phone_number }, { email }]
    }
  });
  if (existingUser) {
    throw new Error('Phone number or email already registered');
  }

  // 3) Pre-generate hash & ID
  const hashedPassword = await bcrypt.hash(password, 10);
  const customer_id = uuid();

  // 4) Atomic create
  return await sequelize.transaction(async (t) => {
    
    // a) Create the local user
    const newUser = await User.create({
      customer_id,
      firstname,
      lastname,
      middlename,
      email,
      password: hashedPassword,
      phone_number,
      country_id
    }, { transaction: t });

    sendMail(email, "Yayyyy you joined the party!!!", `<p>Dear ${firstname} ${lastname},</p><p>Welcome to Wallet Platform</p><p>Your account has been successfully created. Kindly update your profilekj.</p>`);

    // b) Tokens
    const accessToken = signAccessToken(newUser);
    const rawRefresh = signRefreshToken(newUser);
    const refreshHash = await bcrypt.hash(rawRefresh, 10);
    const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days

    await RefreshToken.create({
      token_hash: refreshHash,
      customer_id,
      expires_at: expiresAt
    }, { transaction: t });

    return {
      success: true,
      customer_id,
      accessToken,
      refreshToken: rawRefresh
    };
  });
};

const ensureEmbedlyCustomerAndSyncNames = async (user) => {
  const firstName  = user.firstname;
  const middleName = user.middlename;
  const lastName   = user.lastname;
  const email      = user.email;
  const phoneNumber = user.phone_number;

  // If we already have an Embedly id, try to fetch that customer
  if (user.embedly_customer_id) {
    const getRes = await safeCall(() => customers.get(user.embedly_customer_id));
    const found = getRes?.data?.data ?? getRes?.data ?? getRes;

    if (found?.customerId) {
      // Update names if they changed
      const needsUpdate =
        (firstName && firstName !== found.firstName) ||
        (middleName && middleName !== found.middleName) ||
        (lastName && lastName !== found.lastName);

      if (needsUpdate) {
        await safeCall(() =>
          customers.update(user.embedly_customer_id, {
            firstName,
            middleName,
            lastName
          })
        );
      }
      return found;
    }
    // If lookup failed, fall through and create anew
  }

  // Create a new Embedly customer (minimal fields needed here)
  const createBody = {
    organizationId: process.env.EMBEDLY_ORGANIZATION_ID,
    firstName: user.firstname,
    middleName: user.middlename,
    lastName: user.lastname,
    emailAddress: user.email,        // required & correct casing
    mobileNumber: user.phone_number, // required & correct casing
    dob: user.dob,
    address: user.address,
    city: user.city,
    countryId: user.country_id,
    customerTypeId: process.env.CUSTOMER_TYPE_ID, // Use the environment variable for now
    verify: "1"
  };
  console.log('[EMBEDLY CREATE] body:', createBody);

  const addRes = await safeCall(() => customers.add(createBody));
  const created = addRes?.data?.data ?? addRes?.data ?? addRes;
  console.log('[EMBEDLY CREATE] raw:', addRes);
  const customerId = addRes.data.id;

  if (!customerId) {
    const e = new Error('Failed to create Embedly customer');
    e.status = 502;
    throw e;
  }

  // Persist the id locally
  await User.update(
    { embedly_customer_id: customerId },
    { where: { customer_id: user.customer_id } }
  );

  return created;
};

// const createEmbedlyCustomer = async (user) => {
//   const customerData = {
//     organizationId: EMBEDLY_ORGANIZATION_ID,
//     firstName: user.firstname,
//     lastName: user.lastname,
//     middleName: user.middlename,
//     emailAddress: user.email,
//     mobileNumber: user.phone_number,
//     dob: user.dob,
//     address: user.address,
//     city: user.city,
//     customerTypeId: user.customer_type_id,
//     countryId: user.country_id,
//     verify: 1
//   };

//   const res = await safeCall(() => customers.add(customerData));
//   const customer = res.data.data;

//   await User.update(
//     { embedly_customer_id: customer.customerId },
//     { where: { customer_id: user.customer_id } }
//   );

//   return customer;
//};

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
      middleName: current_user.middlename,
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
 // createEmbedlyCustomer,
  ensureEmbedlyCustomerAndSyncNames
};
