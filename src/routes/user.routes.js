// src/routes/user.routes.js
import express from 'express';
import authMiddleware from '../middlewares/authmiddleware.js';
import checkKYC from '../middlewares/kycMiddleware.js';
import { updateKYC, getKYCStatus } from '../controllers/kycController.js';
import {
  getWalletBalance,
  transferToBank,
  transferToWallet,
  getTransactionHistory,
  listSupportedBanks,
  verifyBankAccount
} from '../services/embedlyTransactionService.js';

const router = express.Router();

// --------- KYC Routes ---------
router.post('/kyc/update', authMiddleware, updateKYC);
router.get('/kyc/status', authMiddleware, getKYCStatus);

// --------- Wallet Balance ---------
router.get('/wallet/balance', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const data = await getWalletBalance(customer_id);
    res.status(200).json({
      success: true,
      data: {
        balance: data.available_balance,
        currency: data.currency || 'NGN',
        account_number: data.account_number,
        account_name: data.account_name
      }
    });
  } catch (err) {
    next(err);
  }
});

// --------- Transfer to Bank ---------
router.post('/transfer/bank', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const {
      amount,
      account_number: accountNumber,
      account_name: accountName,
      bank_code: bankCode,
      narration,
      pin
    } = req.body;

    // Basic validation
    if (!amount || !accountNumber || !accountName || !bankCode || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Fields required: amount, account_number, account_name, bank_code, pin'
      });
    }

    const data = await transferToBank({
      customer_id,
      amount,
      bankCode,
      accountNumber,
      accountName,
      narration,
      pin
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// --------- Transfer to Another Wallet ---------
router.post('/transfer/wallet', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const { recipient_phone: toCustomerId, amount, narration, pin } = req.body;

    if (!amount || !toCustomerId || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Fields required: amount, recipient_phone, pin'
      });
    }

    const data = await transferToWallet({
      fromCustomerId: customer_id,
      toCustomerId,
      amount,
      narration,
      pin
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// --------- Transaction History ---------
router.get('/transactions', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const { page = 1, limit = 20, type, status } = req.query;

    const result = await getTransactionHistory(customer_id, {
      page: Number(page),
      limit: Number(limit),
      type,
      status
    });

    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

// --------- Supported Banks ---------
router.get('/banks', authMiddleware, async (req, res, next) => {
  try {
    const data = await listSupportedBanks();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// --------- Verify Bank Account ---------
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
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const User = (await import('../models/user.js')).default;
    const { customer_id } = req.user;
    const user = await User.findOne({
      where: { customer_id },
      attributes: ['customer_id', 'firstname', 'lastname', 'email', 'phone_number', 'kyc_status']
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// --------- Update Profile ---------
router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const User = (await import('../models/user.js')).default;
    const { customer_id } = req.user;
    const { firstname, lastname, email } = req.body;
    const updateData = {};
    if (firstname) updateData.firstname = firstname;
    if (lastname)  updateData.lastname  = lastname;
    if (email)     updateData.email     = email;
    if (!Object.keys(updateData).length) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }
    await User.update(updateData, { where: { customer_id } });
    res.status(200).json({ success: true, message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
});

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

export default router;
