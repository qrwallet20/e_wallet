import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils.js';

const authenticateUser = async (email, password) => {
    const user = await User.findOne({ where: { email } });
    if (!user || !bcrypt.compareSync(password, user.password)) {
        throw new Error('Invalid email or password');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return { accessToken, refreshToken };
};

const refreshAccessToken = async (refreshToken) => {
    const user = verifyRefreshToken(refreshToken);
    return generateAccessToken(user);
};

export { authenticateUser, refreshAccessToken };
