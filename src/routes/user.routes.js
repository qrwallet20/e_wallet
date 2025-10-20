// src/routes/user.routes.js
import express from 'express';
import { getSupportedCountries } from '../transactions/transactionServices.js';
import {authMiddleware} from '../middlewares/authmiddleware.js';
import checkKYC from '../middlewares/kycMiddleware.js';
import { getSupportedCurrencies } from '../transactions/transactionServices.js';
import Account from '../models/account.js';
import { sendMail } from '../utilities/nodeMailer.js';
import User from '../models/user.js';
import { checkId,updateKYC, getKYCStatus, getCustomerTierHandler, updateNin, updateBvn } from '../controllers/kycController.js';
import {
  getWallet,
  transferToBank,
  transferToWallet,
  getTransactionHistory,
  listSupportedBanks,
  verifyBankAccount,
  getBankAccountName
} from '../transactions/transactionServices.js';

const router = express.Router();


/**
 * @swagger
 * tags:
 *   - name: KYC
 *     description: Know-Your-Customer operations
 *   - name: Wallet
 *     description: Wallet balance and transfers
 *   - name: Banks
 *     description: Bank lookup and verification
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     KycUpdateRequest:
 *       type: object
 *       required: [pin, gender, dob, address, nin, city]
 *       properties:
 *         pin:
 *           type: string
 *           pattern: '^[0-9]{4}$'
 *           description: 4-digit PIN
 *           example: "1234"
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           example: male
 *         dob:
 *           type: string
 *           format: date
 *           description: Date of birth (YYYY-MM-DD)
 *           example: "1990-05-21"
 *         address:
 *           type: string
 *           example: "12 Ajose Street, Ikeja"
 *         nin:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *           description: National Identification Number (11 digits)
 *           example: "12345678901"
 *         city:
 *           type: string
 *           example: "Lagos"
 *         email:
 *           type: string
 *           format: email
 *           description: Optional — overrides user’s stored email if provided
 *           example: "john@example.com"
 *     NinUpgradeRequest:
 *       type: object
 *       required: []
 *       description: Body may be empty; NIN is read from the user profile in DB.
 *       properties: {}
 *     BvnUpgradeRequest:
 *       type: object
 *       required: [bvn]
 *       properties:
 *         bvn:
 *           type: string
 *           example: "22123456789"
 *           description: BVN associated with the user
 *     TransferToBankRequest:
 *       type: object
 *       required: [bankCode, accountNumber, accountName, amount, pin]
 *       properties:
 *         bankCode:   { type: string, example: "999" }
 *         accountNumber: { type: string, example: "0123456789" }
 *         accountName: { type: string, example: "John Doe" }
 *         remarks:    { type: string, example: "Savings transfer" }
 *         amount:     { type: number, example: 1500 }
 *         pin:        { type: string, example: "1234" }
 *     TransferToWalletRequest:
 *       type: object
 *       required: [toAccount, amount, pin]
 *       properties:
 *         toAccount: { type: string, description: "Recipient wallet/account identifier", example: "2348012345678" }
 *         amount:    { type: number, example: 2000 }
 *         narration: { type: string, example: "Dinner split" }
 *         pin:       { type: string, example: "1234" }
 *     ResolveBankNameRequest:
 *       type: object
 *       required: [bankCode, accountNumber]
 *       properties:
 *         bankCode:      { type: string, example: "999" }
 *         accountNumber: { type: string, example: "0123456789" }
 *     VerifyBankRequest:
 *       type: object
 *       required: [account_number, bank_code]
 *       properties:
 *         account_number: { type: string, example: "0123456789" }
 *         bank_code:      { type: string, example: "999" }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string, example: "Invalid email format" }
 *     SuccessMessageResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         message: { type: string, example: "Operation successful" }
 *     WalletBalanceResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: object
 *           properties:
 *             ledgerBalance:  { type: number, example: 50000 }
 *             balance:        { type: number, example: 48000 }
 *             name:           { type: string, example: "John Doe" }
 *             account_number: { type: string, example: "1234567890" }
 *             bank:           { type: string, example: "Moniepoint MFB" }
 *     KycVerificationResult:
 *       type: object
 *       description: Upstream verification payload echoed back when available
 *       additionalProperties: true
 */

/* =========================
 *         KYC
 * ========================= */

/**
 * @swagger
 * /user/kyc/update:
 *   post:
 *     summary: Update KYC details (sets status to PENDING, ensures Embedly customer, then marks VERIFIED)
 *     description: >
 *       Validates input (PIN=4 digits, NIN=11 digits, required fields), ensures unique NIN, hashes the PIN, and updates local KYC data.
 *       Then ensures/syncs an Embedly customer record. On success, marks user as VERIFIED and returns the Embedly customer ID.
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KycUpdateRequest'
 *     responses:
 *       200:
 *         description: KYC verified and synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessMessageResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "KYC completed and verified successfully"
 *                     embedlyId:
 *                       type: string
 *                       example: "cust_abc123"
 *       400:
 *         description: Validation error (missing fields, bad PIN/NIN, invalid email) or NIN conflict
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized
 *       502:
 *         description: Unable to ensure/create Embedly customer
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/kyc/update', authMiddleware, updateKYC);

/**
 * @swagger
 * /user/kyc/status:
 *   get:
 *     summary: Get Embedly verification properties for the authenticated user
 *     description: >
 *       Queries Embedly for verification properties using the stored embedly_customer_id.
 *       Returns 404 if no properties exist or the customer is not found for the given API key/environment.
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Verification properties returned by provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/KycVerificationResult'
 *       400:
 *         description: Embedly customer ID not found on user
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No verification properties or customer not found
 *       5XX:
 *         description: Upstream error forwarded
 */
router.get('/kyc/status', authMiddleware, getKYCStatus);

/**
 * @swagger
 * /user/tier:
 *   get:
 *     summary: Get customer tier
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Customer tier information
 *       401:
 *         description: Unauthorized
 */
router.get('/tier', authMiddleware, getCustomerTierHandler);

/**
 * @swagger
 * /user/kyc/upgradeNin:
 *   post:
 *     summary: Verify NIN and (if needed) create wallet
 *     description: >
 *       Uses user’s stored NIN and Embedly customer ID to perform NIN verification.
 *       On failure sets `nin_status=REJECTED`. On success (or already verified), sets `nin_status=VERIFIED`,
 *       creates an Account if missing, and creates an Embedly wallet.
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NinUpgradeRequest' }
 *     responses:
 *       200:
 *         description: NIN verification successful (or already completed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:  { type: boolean, example: true }
 *                 message:  { type: string,  example: "NIN verification successful" }
 *                 verification:
 *                   $ref: '#/components/schemas/KycVerificationResult'
 *       400:
 *         description: Verification failed or missing data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized
 */
router.post('/kyc/upgradeNin', authMiddleware, updateNin);

/**
 * @swagger
 * /user/kyc/upgradeBvn:
 *   post:
 *     summary: Verify BVN (premium KYC)
 *     description: >
 *       Sends BVN to the provider. If `verification.success === "false"` marks `bvn_status=REJECTED`;
 *       if `"true"` (or already completed) marks `bvn_status=VERIFIED`.
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BvnUpgradeRequest' }
 *     responses:
 *       200:
 *         description: BVN verification successful (or already completed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:  { type: boolean, example: true }
 *                 message:  { type: string,  example: "BVN verification successful" }
 *                 verification:
 *                   $ref: '#/components/schemas/KycVerificationResult'
 *       400:
 *         description: BVN verification failed / invalid payload
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized
 */
router.post('/kyc/upgradeBvn', authMiddleware, updateBvn);

/**
 * @swagger
 * /user/customerExist:
 *   get:
 *     summary: Check if current user has an Embedly customer ID (and optionally probe upstream)
 *     description: Returns upstream lookup result for the user’s `embedly_customer_id`, primarily for internal diagnostics.
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Upstream response (diagnostic)
 *       401:
 *         description: Unauthorized
 */
router.get('/customerExist', authMiddleware, checkId);

/* =========================
 *       WALLET
 * ========================= */

/**
 * @swagger
 * /user/wallet/balance:
 *   get:
 *     summary: Get wallet balance and virtual account details
 *     tags: [Wallet]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balances and account info
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/WalletBalanceResponse' }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: KYC required
 */
router.get('/wallet/balance', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const user = await Account.findOne({ where: { customer_id }, attributes: ['account_number'] });
    const AccUser = await User.findOne({ where: { customer_id }, attributes: ['firstname', 'lastname', 'email'] });
    const data = await getWallet(user.account_number);

    res.status(200).json({
      success: true,
      data: {
        ledgerBalance: data.data.ledgerBalance,
        balance: data.data.availableBalance,
        name: data.data.name,
        account_number: data.data.virtualAccount.accountNumber,
        bank: data.data.virtualAccount.bankName
      }
    });

    sendMail(
      AccUser.email,
      'Wallet Balance Checked',
      ` <p> Dear ${AccUser.firstname} ${AccUser.lastname},<br> Your wallet balance is ${data.data.availableBalance}.</p>`
    );
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /user/transfer/bank:
 *   post:
 *     summary: Transfer funds to a bank account
 *     tags: [Wallet]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TransferToBankRequest' }
 *     responses:
 *       200:
 *         description: Transfer initiated
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: KYC required or PIN invalid
 */
router.post('/transfer/bank', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const { bankCode, accountNumber, accountName, remarks, amount, pin } = req.body;

    if (!amount || !accountNumber || !accountName || !bankCode || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Fields required: amount, account_number, account_name, bank_code, pin'
      });
    }

    const data = await transferToBank({ customer_id, bankCode, accountNumber, accountName, remarks, amount, pin });
    res.status(200).json({ success: true, data });

    const user = await User.findOne({ where: { customer_id }, attributes: ['firstname', 'lastname', 'email'] });
    sendMail(
      user.email,
      'Bank Transfer Initiated',
      `<p> Dear ${user.firstname} ${user.lastname},<br> Your transfer of ${amount} to account ${accountNumber} has been initiated.</p>`
    );
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /user/transfer/wallet:
 *   post:
 *     summary: Transfer funds to another wallet
 *     tags: [Wallet]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TransferToWalletRequest' }
 *     responses:
 *       200:
 *         description: Wallet transfer initiated
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: KYC required or PIN invalid
 */
router.post('/transfer/wallet', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const { toAccount, amount, narration, pin } = req.body;

    if (!amount || !toAccount || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Fields required: amount, recipient_phone, pin'
      });
    }

    const input = { fromCustomerId: customer_id, toCustomerAccount: toAccount, amount, narration, pin };
    const data = await transferToWallet(input);

    const user = await User.findOne({ where: { customer_id }, attributes: ['firstname', 'lastname', 'email'] });
    res.status(200).json({ success: true, data });

    sendMail(
      user.email,
      'Wallet Transfer Initiated',
      `<p> Dear ${user.firstname} ${user.lastname},<br> Your transfer of ${amount} to account ${toAccount} has been initiated.</p>`
    );
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /user/transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Wallet]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction history for the authenticated user
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: KYC required
 */
router.get('/transactions', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const data = await getTransactionHistory(customer_id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /user/currencies:
 *   get:
 *     summary: Get supported currencies
 *     tags: [Wallet]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of supported currencies
 *       401:
 *         description: Unauthorized
 */
router.get('/currencies', authMiddleware, async (req, res, next) => {
  try {
    const data = await getSupportedCurrencies();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/* =========================
 *         BANKS
 * ========================= */

/**
 * @swagger
 * /user/banks:
 *   get:
 *     summary: List supported banks
 *     tags: [Banks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of supported banks
 *       401:
 *         description: Unauthorized
 */
router.get('/banks', authMiddleware, async (req, res, next) => {
  try {
    const data = await listSupportedBanks();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /user/bank/name:
 *   post:
 *     summary: Resolve bank account name
 *     tags: [Banks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResolveBankNameRequest' }
 *     responses:
 *       200:
 *         description: Resolved account name
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post('/bank/name', authMiddleware, async (req, res, next) => {
  try {
    const { bankCode, accountNumber } = req.body;
    if (!bankCode || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Fields required: bank_code, account_number'
      });
    }
    const data = await getBankAccountName({ bankCode, accountNumber });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /user/banks/verify:
 *   post:
 *     summary: Verify a bank account number
 *     tags: [Banks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VerifyBankRequest' }
 *     responses:
 *       200:
 *         description: Bank account verified
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post('/banks/verify', authMiddleware, async (req, res, next) => {
  try {
    const { account_number: accountNumber, bank_code: bankCode } = req.body;
    if (!accountNumber || !bankCode) {
      return res.status(400).json({
        success: false,
        message: 'Fields required: account_number, bank_code'
      });
    }
    const data = await verifyBankAccount({ accountNumber, bankCode });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// --------- User Profile ---------
// router.get('/profile', authMiddleware, async (req, res, next) => {
//   try {
//     const User = (await import('../models/user.js')).default;
//     const { customer_id } = req.user;
//     const user = await User.findOne({
//       where: { customer_id },
//       attributes: ['customer_id', 'firstname', 'lastname', 'email', 'phone_number', 'kyc_status']
//     });
//     if (!user) return res.status(404).json({ success: false, message: 'User not found' });
//     res.status(200).json({ success: true, data: user });
//   } catch (err) {
//     next(err);
//   }
// });

// // --------- Update Profile ---------
// router.put('/profile', authMiddleware, async (req, res, next) => {
//   try {
//     const User = (await import('../models/user.js')).default;
//     const { customer_id } = req.user;
//     const { firstname, lastname, email } = req.body;
//     const updateData = {};
//     if (firstname) updateData.firstname = firstname;
//     if (lastname)  updateData.lastname  = lastname;
//     if (email)     updateData.email     = email;
//     if (!Object.keys(updateData).length) {
//       return res.status(400).json({ success: false, message: 'No valid fields to update' });
//     }
//     await User.update(updateData, { where: { customer_id } });
//     res.status(200).json({ success: true, message: 'Profile updated' });
//   } catch (err) {
//     next(err);
//   }
// });

// --------- Change PIN ---------
router.put('/pin/change', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const User   = (await import('../models/user.js')).default;
    const bcrypt = (await import('bcrypt')).default;
    const { customer_id } = req.user;
    const { current_pin, new_pin } = req.body;
    if (!current_pin || !new_pin) {
      return res.status(400).json({ success: false, message: 'Current and new PIN required' });
    }
    if (!/^\d{4}$/.test(new_pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be 4 digits' });
    }
    const user = await User.findOne({ where: { customer_id } });
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (!(await bcrypt.compare(current_pin, user.pin))) {
      return res.status(400).json({ success:false, message:'Current PIN incorrect' });
    }
    const hashed = await bcrypt.hash(new_pin, 10);
    await User.update({ pin: hashed }, { where: { customer_id } });
    res.status(200).json({ success: true, message: 'PIN changed' });
  } catch (err) {
    next(err);
  }
});

// --------- Supported Countries ---------
router.get('/countries', async (req, res, next) => {
  try {
    const data = await getSupportedCountries();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});


export default router;
