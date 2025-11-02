import express from 'express';
import { login, refreshToken, logout, signUp } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authmiddleware.js';

import { requestCode, confirmCode } from '../controllers/emailVerificationController.js';



const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Endpoints for user registration, login, token refresh, and logout.
 */

/**
 * @swagger
 * /auth/sign-up:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with personal information and credentials.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - email
 *               - password
 *               - phone_number
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: John
 *               middlename:
 *                 type: string
 *                 example: Michael
 *               lastname:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPassword123
 *               phone_number:
 *                 type: string
 *                 example: "+2348012345678"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   type: object
 *                   description: The newly created user record
 *       400:
 *         description: Invalid input or user already exists
 */
router.post('/sign-up', signUp);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in an existing user
 *     description: Authenticates a user by phone number and password, returning access and refresh tokens.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *               - password
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "+2348012345678"
 *               password:
 *                 type: string
 *                 example: StrongPassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *                 message:
 *                   type: string
 *                   example: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authMiddleware, login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Generates a new access token using a valid refresh token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Access token successfully refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   description: New access token
 *                 refreshToken:
 *                   type: string
 *                   description: Newly issued refresh token
 *       400:
 *         description: Refresh token required
 *       403:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh-token', refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out a user
 *     description: Invalidates the provided refresh token and logs the user out.
 *     security:
 *       - BearerAuth: []
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       400:
 *         description: Refresh token is required
 *       500:
 *         description: Internal server error
 */
router.post('/logout', authMiddleware, logout);
/**
 * @swagger
 * tags:
 *   - name: Email Verification
 *     description: Request and confirm 4-digit email verification codes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailVerificationRequest:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         purpose:
 *           type: string
 *           description: Optional flow discriminator
 *           enum: [signup, reset, change_email]
 *           example: signup
 *     EmailVerificationConfirm:
 *       type: object
 *       required: [email, code]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         code:
 *           type: string
 *           description: 4-digit code sent to email
 *           pattern: '^[0-9]{4}$'
 *           example: "1234"
 *         purpose:
 *           type: string
 *           enum: [signup, reset, change_email]
 *           example: signup
 *     EmailVerificationInfo:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         message: { type: string, example: "Code sent" }
 *         sessionId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           example: "c2e7c7c7-1d44-4a8a-a58c-8a6a1b7c3f3b"
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           example: "2025-11-02T10:00:00.000Z"
 *         cooldownSeconds:
 *           type: integer
 *           example: 60
 *     GenericSuccess:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         message: { type: string, example: "Email verified" }
 *     GenericError:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string, example: "Invalid code. 2 attempt(s) left." }
 */

/**
 * @swagger
 * /auth/email/request-code:
 *   post:
 *     summary: Request a 4-digit verification code (expires in 10 minutes)
 *     description: |
 *       Sends a 4-digit code to the given email. One active code per (email, purpose).
 *       Resend is limited by a short cooldown (e.g., 60s). Code TTL is 10 minutes.
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailVerificationRequest'
 *     responses:
 *       200:
 *         description: Code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailVerificationInfo'
 *       400:
 *         description: Bad request or resend cooldown active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericError'
 */

/**
 * @swagger
 * /auth/email/confirm-code:
 *   post:
 *     summary: Confirm a 4-digit email verification code
 *     description: |
 *       Verifies the code for the email and purpose. Single-use; fails after expiry (10m)
 *       or after too many attempts. After success, you typically create the customer/account.
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailVerificationConfirm'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 *       400:
 *         description: Invalid/expired code or attempts exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericError'
 */

router.post('/email/request-code', requestCode);
router.post('/email/confirm-code', confirmCode);
export default router;
