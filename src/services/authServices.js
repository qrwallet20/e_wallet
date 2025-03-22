import bcrypt from 'bcrypt';
import User from '../models/user.js';
import {v4 as uuid} from 'uuid';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utilities/tokenUtils.js';
import RefreshToken from '../models/refreshToken.js';






// Utility function to validate phone numbers (Nigerian format)
const isValidPhoneNumber = (phone_number) => {
    const regex = /^(?:\+234|0)[7-9][01]\d{8}$/;
    return regex.test(phone_number);
};

// Utility function to validate passwords (Minimum 8 chars, letters & numbers)
const isValidPassword = (password) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+.,?-]{8,}$/;
    return regex.test(password);
};


const registerUser = async (firstname, lastname, password, phone_number) => {
    // Validation
    if (!firstname || !lastname || !password || !phone_number) {
        throw new Error('All fields are required');
    }

    if (firstname.length < 2 || lastname.length < 2) {
        throw new Error('First name and last name must be at least 2 characters long');
    }

    if (!isValidPhoneNumber(phone_number)) {
        throw new Error('Invalid phone number format');
    }

    if (!isValidPassword(password)) {
        throw new Error('Password must be at least 8 characters long and include letters & numbers');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { phone_number } });
    if (existingUser) {
        throw new Error('Phone number already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);


    // Create user
    const new_user = await User.create({
        customer_id: uuid(),
        firstname,
        lastname,
        password: hashedPassword,
        phone_number
    });

    return new_user;
};



const authenticateUser = async (phone_number, password) => {
    const current_user = await User.findOne({ where: { phone_number } });

    if (!current_user) {
        throw new Error('User does not exist');
    }

    // Fix: Use `await` for `bcrypt.compare`
    const isPasswordValid = await bcrypt.compare(password, current_user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid phone number or password');
    }

    const outputMessage = (current_user.kyc_update === 'Uncompleted') 
    ? 'Login successful, but KYC is incomplete. You must complete KYC before making transactions.' 
    : 'Login successful';


    const accessToken = generateAccessToken(current_user);
    const refreshToken = generateRefreshToken(current_user);

    // Fix: Use `current_user.customer_id`, not `new_user.customer_id`
    await RefreshToken.create({
        customer_id: current_user.customer_id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    });

    return { accessToken, refreshToken, outputMessage };
};

const refreshAccessToken = async (refreshToken) => {
     // ✅ Check if refresh token exists in the database
     const storedToken = await RefreshToken.findOne({ where: { token: refreshToken } });
     if (!storedToken) {
         throw new Error('Invalid or expired refresh token');
     }
 
     // ✅ Verify refresh token
     const decoded = verifyRefreshToken(refreshToken);
     if (!decoded) {
         throw new Error('Invalid or expired refresh token');
     }
 
     // ✅ Fetch user
     const new_user = await User.findOne({ where: { customer_id: decoded.customer_id } });
     if (!new_user) {
         throw new Error('User not found');
     }
 
     // ✅ Generate new access token
     const accessToken = generateAccessToken(new_user);
 
     return { accessToken };
};

const logoutUser = async (refreshToken) => {
    await RefreshToken.destroy({ where: { token: refreshToken } });
};

export { authenticateUser, refreshAccessToken, registerUser, logoutUser}

