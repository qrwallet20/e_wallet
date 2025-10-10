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


// --------- KYC Routes ---------
router.post('/kyc/update', authMiddleware, updateKYC);
router.get('/kyc/status', authMiddleware, getKYCStatus);
router.get('/tier', authMiddleware, getCustomerTierHandler);
router.post('/kyc/upgradeNin', authMiddleware, updateNin);
router.post('/kyc/upgradeBvn', authMiddleware, updateBvn);
router.get('/customerExist', authMiddleware, checkId);


// --------- Wallet Balance ---------
router.get('/wallet/balance', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const user = await Account.findOne({
      where: { customer_id },
      attributes: ['account_number']
    });
    const AccUser = await User.findOne({ where: { customer_id },
    attributes: [ 'firstname', 'lastname', 'email'] });
    const data = await getWallet(user.account_number);
    res.status(200).json({
      success: true,
      data: 
      {
        ledgerBalance: data.data.ledgerBalance,
        balance: data.data.availableBalance,
        name: data.data.name,
        account_number: data.data.virtualAccount.accountNumber,
        bank: data.data.virtualAccount.bankName,
      }
    });
    sendMail(AccUser.email, 'Wallet Balance Checked', ` <p> Dear ${AccUser.firstname} ${AccUser.lastname},<br> Your wallet balance is ${data.data.availableBalance}.</p>`);
  } catch (err) {
    next(err);
  }
});

// --------- Transfer to Bank ---------
router.post('/transfer/bank', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
    const {bankCode, accountNumber, accountName, remarks, amount, pin} = req.body;

    // Basic validation
    console.log("Transfer to bank request data:", req.body);
    if (!amount || !accountNumber || !accountName || !bankCode || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Fields required: amount, account_number, account_name, bank_code, pin'
      });
    }

    const data = await transferToBank({
      customer_id,
      bankCode,
      accountNumber,
      accountName,
      remarks,
      amount,
      pin
    });

    res.status(200).json({ success: true, data });
    const user = await User.findOne({ where: { customer_id },
    attributes: [ 'firstname', 'lastname', 'email'] });
    sendMail(user.email, 'Bank Transfer Initiated', `<p> Dear ${user.firstname} ${user.lastname},<br> Your transfer of ${amount} to account ${accountNumber} has been initiated.</p>`);
  } catch (err) {
    next(err);
  }
});

router.get('/currencies', authMiddleware, async (req, res, next) => {
  try {
    const data = await getSupportedCurrencies();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});


// --------- Transfer to Another Wallet ---------
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
    const input = {
      fromCustomerId: customer_id,
      toCustomerAccount: toAccount,
      amount,
      narration,
      pin
    };
    //console.log("Input data from user:", input);
    const data = await transferToWallet(input);
    const user = await User.findOne({ where: { customer_id },
    attributes: [ 'firstname', 'lastname', 'email'] });

    res.status(200).json({ success: true, data });
    sendMail(user.email, 'Wallet Transfer Initiated', `<p> Dear ${user.firstname} ${user.lastname},<br> Your transfer of ${amount} to account ${toAccount} has been initiated.</p>`);
  } catch (err) {
    next(err);
  }
});

// --------- Transaction History ---------
router.get('/transactions', authMiddleware, checkKYC, async (req, res, next) => {
  try {
    const { customer_id } = req.user;
  
    const data = await getTransactionHistory(customer_id);

    res.status(200).json({ success: true, data });
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

// --------- Bank Account Name ---------
router.post('/bank/name', authMiddleware, async (req, res, next) => {
  try {
    const { bankCode, accountNumber } = req.body;
    const input = { bankCode, accountNumber };
    if (!bankCode || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Fields required: bank_code, account_number'
      });
    }
    const data = await getBankAccountName(input);
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
