import User from '../models/user.js';
import Account from '../models/account.js';

export const updateUserBalance = async (customer_id, amount, type = 'credit') => {
    const account = await Account.findOne({ where: { customer_id } });
    if (!account) {
        throw new Error('Account not found');
    }

    const currentBalance = parseFloat(account.balance);
    const transactionAmount = parseFloat(amount);
    
    const newBalance = type === 'credit' 
        ? currentBalance + transactionAmount 
        : currentBalance - transactionAmount;

    if (newBalance < 0) {
        throw new Error('Insufficient balance');
    }

    await Account.update(
        { balance: newBalance },
        { where: { customer_id } }
    );

    return newBalance;
};

export const createTransactionRecord = async (transactionData) => {
    const Transaction = (await import('../models/transaction.js')).default;
    return await Transaction.create(transactionData);
};

export const sendNotification = async (customer_id, notificationData) => {
    try {
        // Get user details
        const user = await User.findOne({ 
            where: { customer_id },
            attributes: ['firstname', 'lastname', 'email', 'phone_number']
        });

        if (!user) {
            console.log(`User not found for notification: ${customer_id}`);
            return;
        }

        // Here you can integrate with:
        // - Email service (SendGrid, Mailgun, etc.)
        // - SMS service (Twilio, Termii, etc.)
        // - Push notifications
        // - In-app notifications

        console.log(`Notification sent to ${user.firstname} ${user.lastname}:`, notificationData);
        
        // Example: Send email notification
        // await sendEmailNotification(user.email, notificationData);
        
        // Example: Send SMS notification
        // await sendSMSNotification(user.phone_number, notificationData);
        
    } catch (error) {
        console.error('Failed to send notification:', error);
    }
};

// Utility function to retry failed webhook processing
export const retryWebhookProcessing = async (webhookData, maxRetries = 3) => {
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            // Process webhook based on type
            await processWebhookByType(webhookData);
            return true;
        } catch (error) {
            attempt++;
            console.error(`Webhook retry attempt ${attempt} failed:`, error);
            
            if (attempt >= maxRetries) {
                // Log to dead letter queue or alert system
                console.error('Webhook processing failed after max retries:', webhookData);
                return false;
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
};

const processWebhookByType = async (webhookData) => {
    const { type, data } = webhookData;
    
    switch (type) {
        case 'payment':
            await handlePaymentWebhook({ body: data }, { status: () => ({ json: () => {} }) });
            break;
        case 'transfer':
            await handleTransferWebhook({ body: data }, { status: () => ({ json: () => {} }) });
            break;
        case 'customer':
            await handleCustomerWebhook({ body: data }, { status: () => ({ json: () => {} }) });
            break;
        default:
            throw new Error(`Unknown webhook type: ${type}`);
    }
};