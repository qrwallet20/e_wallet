import express from 'express';
import { login, refreshToken, logout, signUp } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authmiddleware.js'

const router = express.Router();


router.post('/sign-up', signUp);

router.post('/login',login);

router.post('/refresh-token', refreshToken);

router.post('/logout', authMiddleware, logout);

export default router;
