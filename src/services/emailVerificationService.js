// src/services/emailVerificationService.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Op } from 'sequelize';
import EmailVerification from '../models/emailVerification.js';
import { sendMail } from '../utilities/nodeMailer.js';

const EXP_MINUTES = 10;
const RESEND_COOLDOWN_SEC = 60;
const MAX_ATTEMPTS = 5;

function generate4DigitCode() {
  return String(crypto.randomInt(1000, 10000));
}

export async function requestEmailVerification({ email, purpose = 'signup', sessionId = null }) {
  const now = new Date();

  // Enforce one active record per email+purpose; also handle cooldown
  const last = await EmailVerification.findOne({
    where: { email, purpose, active: true },
    order: [['createdAt', 'DESC']],
  });

  if (last) {
    const deltaSec = (now - last.last_sent_at) / 1000;
    if (deltaSec < RESEND_COOLDOWN_SEC) {
      const remaining = Math.ceil(RESEND_COOLDOWN_SEC - deltaSec);
      throw new Error(`Please wait ${remaining}s before requesting another code`);
    }
    // rotate: deactivate the last active record
    await last.update({ active: false });
  }

  const code = generate4DigitCode();
  const code_hash = await bcrypt.hash(code, 10);
  const expires_at = new Date(now.getTime() + EXP_MINUTES * 60 * 1000);

  const record = await EmailVerification.create({
    email,
    purpose,
    session_id: sessionId,
    code_hash,
    expires_at,
    consumed_at: null,
    active: true,
    attempts: 0,
    last_sent_at: now,
    send_count: (last?.send_count ?? 0) + 1,
  });

  await sendMail(
    email,
    'Your verification code',
    `
      <p>Your verification code is <strong>${code}</strong>.</p>
      <p>This code expires in <strong>${EXP_MINUTES} minutes</strong>.</p>
      <p>If you didn’t request this, ignore this email.</p>
    `
  );

  return { id: record.id, expiresAt: expires_at, cooldownSeconds: RESEND_COOLDOWN_SEC };
}

export async function confirmEmailVerification({ email, code, purpose = 'signup' }) {
  const now = new Date();

  const record = await EmailVerification.findOne({
    where: {
      email,
      purpose,
      active: true,
      consumed_at: null,
      expires_at: { [Op.gt]: now },
    },
    order: [['createdAt', 'DESC']],
  });
  if (!record) throw new Error('No active code found or it has expired');

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new Error('Too many attempts. Request a new code.');
  }

  const ok = await bcrypt.compare(code, record.code_hash);
  if (!ok) {
    await record.update({ attempts: record.attempts + 1 });
    const remaining = Math.max(0, MAX_ATTEMPTS - (record.attempts + 1));
    throw new Error(remaining > 0 ? `Invalid code. ${remaining} attempt(s) left.` : 'Invalid code. Attempts exceeded.');
  }

  // consume
  await record.update({ consumed_at: now, active: false });

  return {
    verified: true,
    sessionId: record.session_id ?? null,
    // after this, YOU create the user/customer and can set record.customer_id = newId
    linkCustomerId: async (customer_id) => {
      await record.update({ customer_id });
    },
  };
}
