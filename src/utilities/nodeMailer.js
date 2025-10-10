import nodemailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASSWORD, MAX_EMAIL_RETRIES, RETRY_DELAY_MS } from '../config/env.js';

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

export async function sendMail(to, subject, html) {
  await transporter.sendMail({
    from: `"Wallet" <${EMAIL_USER}>`,
    to,
    subject,
    html: html,
  });

}

export async function retrySendMail(email, subject, body, maxRetries = MAX_EMAIL_RETRIES) {  
  const emailType = subject.toLowerCase();
  let attempt = 0;
    while (attempt < maxRetries) {
        try {
            await sendMail(email, subject, body);
            return; // success, exit function
        } catch (error) {
            attempt++;
            console.error(`Email attempt ${attempt} failed:`, error.message);

            if (attempt >= maxRetries) {
                throw new APIError(`Failed to send ${emailType} email after multiple attempts`, { status: 500 });
            }

            // Optional delay before retrying
            await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
        }
    }
}