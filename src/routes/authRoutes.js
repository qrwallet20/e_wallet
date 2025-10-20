import express from 'express';
import { login, refreshToken, logout, signUp } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authmiddleware.js';

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
router.post('/login', login);

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

export default router;
