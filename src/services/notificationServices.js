import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { 
    SENDGRID_API_KEY, 
    TWILIO_ACCOUNT_SID, 
    TWILIO_AUTH_TOKEN, 
    TWILIO_PHONE_NUMBER 
} from '../config/env.js';

// Initialize services
if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

let twilioClient;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export const sendEmailNotification = async (email, notificationData) => {
    if (!SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping email notification');
        return;
    }

    try {
        const { type, amount, reference } = notificationData;
        
        let subject, html;
        
        switch (type) {
            case 'payment_success':
                subject = 'Payment Successful';
                html = `
                    <h2>Payment Confirmation</h2>
                    <p>Your payment of ₦${amount} has been processed successfully.</p>
                    <p>Reference: ${reference}</p>
                    <p>Your wallet balance has been updated.</p>
                `;
                break;
                
            case 'transfer_success':
                subject = 'Transfer Successful';
                html = `
                    <h2>Transfer Confirmation</h2>
                    <p>Your transfer of ₦${amount} has been completed successfully.</p>
                    <p>Reference: ${reference}</p>
                `;
                break;
                
            case 'transfer_failed':
                subject = 'Transfer Failed';
                html = `
                    <h2>Transfer Failed</h2>
                    <p>Your transfer of ₦${amount} could not be completed.</p>
                    <p>Reference: ${reference}</p>
                    <p>The amount has been refunded to your wallet.</p>
                `;
                break;
                
            default:
                subject = 'Account Notification';
                html = `<p>You have a new notification regarding your account.</p>`;
        }

        const msg = {
            to: email,
            from: 'noreply@yourewallet.com',
            subject,
            html
        };

        await sgMail.send(msg);
        console.log(`Email sent to ${email}: ${subject}`);
    } catch (error) {
        console.error('Email notification error:', error);
    }
};

export const sendSMSNotification = async (phoneNumber, notificationData) => {
    if (!twilioClient) {
        console.log('Twilio not configured, skipping SMS notification');
        return;
    }

    try {
        const { type, amount, reference } = notificationData;
        
        let message;
        
        switch (type) {
            case 'payment_success':
                message = `Payment successful! ₦${amount} added to your wallet. Ref: ${reference}`;
                break;
                
            case 'transfer_success':
                message = `Transfer successful! ₦${amount} sent. Ref: ${reference}`;
                break;
                
            case 'transfer_failed':
                message = `Transfer failed! ₦${amount} refunded to your wallet. Ref: ${reference}`;
                break;
                
            default:
                message = 'You have a new account notification.';
        }

        await twilioClient.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        console.log(`SMS sent to ${phoneNumber}: ${message}`);
    } catch (error) {
        console.error('SMS notification error:', error);
    }
};