
import { requestEmailVerification, confirmEmailVerification } from '../services/emailVerificationService.js';
import { v4 as uuidv4 } from 'uuid';
// import User from '../models/user.js'; // if you create the user here

export async function requestCode(req, res) {
  try {
    const { email, purpose = 'signup' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // Optionally generate a session id to correlate pre-signup
    const sessionId = req.body.sessionId || uuidv4();

    const result = await requestEmailVerification({ email, purpose, sessionId });
    return res.status(200).json({ success: true, message: 'Code sent', sessionId, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function confirmCode(req, res) {
  try {
    const { email, code, purpose = 'signup' } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, message: 'Email and code are required' });

    const result = await confirmEmailVerification({ email, code, purpose });

    return res.status(200).json({ success: true, message: 'Email verified', verified: result.verified });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
