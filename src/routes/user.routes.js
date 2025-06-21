// src/routes/user.routes.js
import express from 'express';
import { authMiddleware } from '../middlewares/authmiddleware.js';
import checkKYC from '../middlewares/kycMiddleware.js';
import { updateKYC, getKYCStatus } from '../controllers/kycController.js';
import { 
    getWalletBalance, 
    transferToBank, 
    transferToWallet, 
    getTransactionHistory, 
    getSupportedBanks, 
    verifyBankAccount 
} from '../transactions/transactionServices.js';

const router = express.Router();

// KYC Routes
router.post('/kyc/update', authMiddleware, updateKYC);
router.get('/kyc/status', authMiddleware, getKYCStatus);

// Wallet Routes (require KYC verification)
router.get('/wallet/balance', authMiddleware, checkKYC, async (req, res) => {
    try {
        const { customer_id } = req.user;
        const balance = await getWalletBalance(customer_id);
        
        res.status(200).json({
            success: true,
            data: {
                balance: balance.available_balance,
                currency: balance.currency || 'NGN',
                account_number: balance.account_number,
                account_name: balance.account_name
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Transfer to Bank
router.post('/transfer/bank', authMiddleware, checkKYC, async (req, res) => {
    try {
        const { customer_id } = req.user;
        const { amount, account_number, account_name, bank_code, narration, pin } = req.body;

        // Validate required fields
        if (!amount || !account_number || !account_name || !bank_code || !pin) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: amount, account_number, account_name, bank_code, pin'
            });
        }

        const transferResult = await transferToBank({
            customer_id,
            amount,
            account_number,
            account_name,
            bank_code,
            narration: narration || 'Bank transfer',
            pin
        });

        res.status(200).json({
            success: true,
            message: 'Transfer initiated successfully',
            data: transferResult
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Transfer to Another Wallet
router.post('/transfer/wallet', authMiddleware, checkKYC, async (req, res) => {
    try {
        const { customer_id } = req.user;
        const { amount, recipient_phone, narration, pin } = req.body;

        // Validate required fields
        if (!amount || !recipient_phone || !pin) {
            return res.status(400).json({
                success: false,
                message: 'Amount, recipient phone number, and PIN are required'
            });
        }

        const transferResult = await transferToWallet({
            sender_customer_id: customer_id,
            amount,
            recipient_phone,
            narration: narration || 'Wallet transfer',
            pin
        });

        res.status(200).json({
            success: true,
            message: 'Transfer completed successfully',
            data: transferResult
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get Transaction History
router.get('/transactions', authMiddleware, checkKYC, async (req, res) => {
    try {
        const { customer_id } = req.user;
        const { page = 1, limit = 20, type, status } = req.query;

        const transactions = await getTransactionHistory({
            customer_id,
            page: parseInt(page),
            limit: parseInt(limit),
            type, // 'credit' or 'debit'
            status // 'pending', 'completed', 'failed'
        });

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get Supported Banks
router.get('/banks', authMiddleware, async (req, res) => {
    try {
        const banks = await getSupportedBanks();
        
        res.status(200).json({
            success: true,
            data: banks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Verify Bank Account
router.post('/banks/verify', authMiddleware, async (req, res) => {
    try {
        const { account_number, bank_code } = req.body;

        if (!account_number || !bank_code) {
            return res.status(400).json({
                success: false,
                message: 'Account number and bank code are required'
            });
        }

        const accountDetails = await verifyBankAccount(account_number, bank_code);

        res.status(200).json({
            success: true,
            data: {
                account_number: accountDetails.account_number,
                account_name: accountDetails.account_name,
                bank_name: accountDetails.bank_name,
                bank_code: accountDetails.bank_code
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get User Profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const { customer_id } = req.user;
        
        // Import User model
        const User = (await import('../models/user.js')).default;
        
        const user = await User.findOne({
            where: { customer_id },
            attributes: ['customer_id', 'firstname', 'lastname', 'email', 'phone_number', 'kyc_update', 'account_number']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update User Profile (non-KYC fields)
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { customer_id } = req.user;
        const { firstname, lastname, email } = req.body;

        // Import User model
        const User = (await import('../models/user.js')).default;

        // Validate email format if provided
        if (email) {
            const validator = (await import('validator')).default;
            if (!validator.isEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }
        }

        const updateData = {};
        if (firstname) updateData.firstname = firstname;
        if (lastname) updateData.lastname = lastname;
        if (email) updateData.email = email;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        await User.update(updateData, { where: { customer_id } });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Change Transaction PIN
router.put('/pin/change', authMiddleware, checkKYC, async (req, res) => {
    try {
        const { customer_id } = req.user;
        const { current_pin, new_pin } = req.body;

        if (!current_pin || !new_pin) {
            return res.status(400).json({
                success: false,
                message: 'Current PIN and new PIN are required'
            });
        }

        // Validate PIN format
        const pinRegex = /^\d{4}$/;
        if (!pinRegex.test(new_pin)) {
            return res.status(400).json({
                success: false,
                message: 'PIN must be 4 digits'
            });
        }

        // Import required modules
        const User = (await import('../models/user.js')).default;
        const bcrypt = (await import('bcrypt')).default;

        // Get user
        const user = await User.findOne({ where: { customer_id } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current PIN
        const isPinValid = await bcrypt.compare(current_pin, user.pin);
        if (!isPinValid) {
            return res.status(400).json({
                success: false,
                message: 'Current PIN is incorrect'
            });
        }

        // Hash new PIN
        const hashedNewPin = await bcrypt.hash(new_pin, 5);

        // Update PIN
        await User.update(
            { pin: hashedNewPin },
            { where: { customer_id } }
        );

        res.status(200).json({
            success: true,
            message: 'PIN changed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Health check route
router.get('/health', authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'User service is healthy',
        timestamp: new Date().toISOString(),
        user_id: req.user.customer_id
    });
});

export default router;