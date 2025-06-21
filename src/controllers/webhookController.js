import User from '../models/user.js';
import Account from '../models/account.js';
import Transaction from '../models/transaction.js';
import { updateUserBalance, createTransactionRecord, sendNotification } from '../services/webhookServices.js';
import { v4 as uuid } from 'uuid';

export const handlePaymentWebhook = async (req, res) => {
    try {
        const { event, data } = req.body;
        
        console.log(`Processing payment webhook: ${event}`, data);

        switch (event) {
            case 'payment.success':
            case 'charge.success':
                await processSuccessfulPayment(data);
                break;
                
            case 'payment.failed':
            case 'charge.failed':
                await processFailedPayment(data);
                break;
                
            case 'payment.pending':
                await processPendingPayment(data);
                break;
                
            default:
                console.log('Unhandled payment event:', event);
        }

        res.status(200).json({ message: 'Payment webhook processed successfully' });
    } catch (error) {
        console.error('Payment webhook error:', error);
        res.status(500).json({ error: 'Payment webhook processing failed' });
    }
};

export const handleTransferWebhook = async (req, res) => {
    try {
        const { event, data } = req.body;
        
        console.log(`Processing transfer webhook: ${event}`, data);

        switch (event) {
            case 'transfer.success':
                await processSuccessfulTransfer(data);
                break;
                
            case 'transfer.failed':
                await processFailedTransfer(data);
                break;
                
            case 'transfer.pending':
                await processPendingTransfer(data);
                break;
                
            case 'transfer.reversed':
                await processReversedTransfer(data);
                break;
                
            default:
                console.log('Unhandled transfer event:', event);
        }

        res.status(200).json({ message: 'Transfer webhook processed successfully' });
    } catch (error) {
        console.error('Transfer webhook error:', error);
        res.status(500).json({ error: 'Transfer webhook processing failed' });
    }
};

export const handleCustomerWebhook = async (req, res) => {
    try {
        const { event, data } = req.body;
        
        console.log(`Processing customer webhook: ${event}`, data);

        switch (event) {
            case 'customer.identification.success':
                await processKYCSuccess(data);
                break;
                
            case 'customer.identification.failed':
                await processKYCFailure(data);
                break;
                
            case 'customer.bvn.verified':
                await processBVNVerification(data);
                break;
                
            default:
                console.log('Unhandled customer event:', event);
        }

        res.status(200).json({ message: 'Customer webhook processed successfully' });
    } catch (error) {
        console.error('Customer webhook error:', error);
        res.status(500).json({ error: 'Customer webhook processing failed' });
    }
};

// Payment Processing Functions
const processSuccessfulPayment = async (data) => {
    const { customer_id, amount, reference, channel, fees } = data;
    
    // Find user account
    const account = await Account.findOne({ where: { customer_id } });
    if (!account) {
        throw new Error(`Account not found for customer: ${customer_id}`);
    }

    // Update balance
    const newBalance = parseFloat(account.balance) + parseFloat(amount);
    await Account.update(
        { balance: newBalance },
        { where: { customer_id } }
    );

    // Create transaction record
    await Transaction.create({
        transaction_id: uuid(),
        customer_id,
        transaction_type: 'credit',
        transaction_amount: amount,
        initial_amount: account.balance,
        final_amount: newBalance,
        transaction_fee: fees || 0,
        receiver_name: account.customer_id, // Or get actual name
        receiver_bank: account.bank_name,
        status: 'completed',
        reference: reference,
        channel: channel || 'payment'
    });

    // Send notification
    await sendNotification(customer_id, {
        type: 'payment_success',
        amount,
        reference,
        balance: newBalance
    });

    console.log(`Payment successful for ${customer_id}: ₦${amount}`);
};

const processFailedPayment = async (data) => {
    const { customer_id, amount, reference, reason } = data;
    
    // Create failed transaction record
    await Transaction.create({
        transaction_id: uuid(),
        customer_id,
        transaction_type: 'credit',
        transaction_amount: amount,
        initial_amount: 0,
        final_amount: 0,
        status: 'failed',
        reference: reference,
        failure_reason: reason
    });

    // Send notification
    await sendNotification(customer_id, {
        type: 'payment_failed',
        amount,
        reference,
        reason
    });

    console.log(`Payment failed for ${customer_id}: ₦${amount} - ${reason}`);
};

// Transfer Processing Functions
const processSuccessfulTransfer = async (data) => {
    const { customer_id, amount, reference, recipient_account, recipient_name } = data;
    
    // Find user account
    const account = await Account.findOne({ where: { customer_id } });
    if (!account) {
        throw new Error(`Account not found for customer: ${customer_id}`);
    }

    // Update transaction status
    await Transaction.update(
        { status: 'completed' },
        { where: { reference, customer_id } }
    );

    // Send notification
    await sendNotification(customer_id, {
        type: 'transfer_success',
        amount,
        recipient_name,
        recipient_account,
        reference
    });

    console.log(`Transfer successful for ${customer_id}: ₦${amount} to ${recipient_name}`);
};

const processFailedTransfer = async (data) => {
    const { customer_id, amount, reference, reason } = data;
    
    // Find user account
    const account = await Account.findOne({ where: { customer_id } });
    if (!account) {
        throw new Error(`Account not found for customer: ${customer_id}`);
    }

    // Reverse balance (refund the amount)
    const newBalance = parseFloat(account.balance) + parseFloat(amount);
    await Account.update(
        { balance: newBalance },
        { where: { customer_id } }
    );

    // Update transaction status
    await Transaction.update(
        { 
            status: 'failed',
            failure_reason: reason,
            final_amount: newBalance
        },
        { where: { reference, customer_id } }
    );

    // Send notification
    await sendNotification(customer_id, {
        type: 'transfer_failed',
        amount,
        reference,
        reason,
        refunded: true
    });

    console.log(`Transfer failed for ${customer_id}: ₦${amount} - ${reason} (Refunded)`);
};

// KYC Processing Functions
const processKYCSuccess = async (data) => {
    const { customer_id, verification_level, bvn_verified } = data;
    
    // Update user KYC status
    await User.update(
        { 
            kyc_update: 'Completed',
            verification_level: verification_level || 'basic',
            bvn_verified: bvn_verified || false
        },
        { where: { customer_id } }
    );

    // Send notification
    await sendNotification(customer_id, {
        type: 'kyc_success',
        verification_level
    });

    console.log(`KYC successful for ${customer_id}: Level ${verification_level}`);
};

const processKYCFailure = async (data) => {
    const { customer_id, reason, required_documents } = data;
    
    // Update user KYC status
    await User.update(
        { 
            kyc_update: 'Failed',
            kyc_failure_reason: reason
        },
        { where: { customer_id } }
    );

    // Send notification
    await sendNotification(customer_id, {
        type: 'kyc_failed',
        reason,
        required_documents
    });

    console.log(`KYC failed for ${customer_id}: ${reason}`);
};