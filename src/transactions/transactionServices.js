import { embedlyAPI } from '../utilities/embedlyConnection.js';
import User from '../models/user.js';

// Get wallet balance
export const getWalletBalance = async (customer_id) => {
    try {
        const user = await User.findOne({ where: { customer_id } });
        if (!user || !user.wallet_id) {
            throw new Error('Wallet not found');
        }

        const response = await embedlyAPI.get(`/wallets/${user.wallet_id}/balance`);
        return response.data;
    } catch (error) {
        console.error('Error fetching wallet balance:', error.response?.data || error.message);
        throw new Error('Failed to fetch wallet balance');
    }
};

// Transfer funds to bank account
export const transferToBank = async ({
    customer_id,
    amount,
    bankCode,
    accountNumber,
    accountName,
    narration
}) => {
    try {
        const user = await User.findOne({ where: { customer_id } });
        if (!user || !user.wallet_id) {
            throw new Error('Wallet not found');
        }

        if (user.kyc_status !== 'VERIFIED') {
            throw new Error('KYC verification required for bank transfers');
        }

        const transferData = {
            walletId: user.wallet_id,
            amount: parseFloat(amount),
            bankCode,
            accountNumber,
            accountName,
            narration: narration || 'Bank transfer',
            currency: 'NGN'
        };

        const response = await embedlyAPI.post('/payouts/bank', transferData);
        return response.data;
    } catch (error) {
        console.error('Bank transfer error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Bank transfer failed');
    }
};

// Transfer funds between wallets
export const transferToWallet = async ({
    fromCustomerId,
    toCustomerId,
    amount,
    narration
}) => {
    try {
        const fromUser = await User.findOne({ where: { customer_id: fromCustomerId } });
        const toUser = await User.findOne({ where: { customer_id: toCustomerId } });

        if (!fromUser || !fromUser.wallet_id) {
            throw new Error('Sender wallet not found');
        }

        if (!toUser || !toUser.wallet_id) {
            throw new Error('Recipient wallet not found');
        }

        if (fromUser.kyc_status !== 'VERIFIED') {
            throw new Error('Sender KYC verification required');
        }

        const transferData = {
            fromWalletId: fromUser.wallet_id,
            toWalletId: toUser.wallet_id,
            amount: parseFloat(amount),
            narration: narration || 'Wallet transfer',
            currency: 'NGN'
        };

        const response = await embedlyAPI.post('/transfers/wallet', transferData);
        return response.data;
    } catch (error) {
        console.error('Wallet transfer error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Wallet transfer failed');
    }
};

// Get transaction history
export const getTransactionHistory = async (customer_id, { page = 1, limit = 20 } = {}) => {
    try {
        const user = await User.findOne({ where: { customer_id } });
        if (!user || !user.wallet_id) {
            throw new Error('Wallet not found');
        }

        const response = await embedlyAPI.get(`/wallets/${user.wallet_id}/transactions`, {
            params: { page, limit }
        });

        return response.data;
    } catch (error) {
        console.error('Error fetching transaction history:', error.response?.data || error.message);
        throw new Error('Failed to fetch transaction history');
    }
};

// Get list of supported banks
export const getSupportedBanks = async () => {
    try {
        const response = await embedlyAPI.get('/banks');
        return response.data;
    } catch (error) {
        console.error('Error fetching banks:', error.response?.data || error.message);
        throw new Error('Failed to fetch supported banks');
    }
};

// Verify bank account details
export const verifyBankAccount = async ({ bankCode, accountNumber }) => {
    try {
        const response = await embedlyAPI.get('/banks/verify', {
            params: { bankCode, accountNumber }
        });
        return response.data;
    } catch (error) {
        console.error('Bank verification error:', error.response?.data || error.message);
        throw new Error('Failed to verify bank account');
    }
};