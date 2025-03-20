import bcrypt from 'bcrypt';
import User from '../models/user.js';
import {v4 as uuid} from 'uuid';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utilities/tokenUtils.js';



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
    console.log(phone_number + '' + password + '' + current_user.password);
    if (!current_user) {
        throw new Error('User does not exist');
    }
    if (!bcrypt.compare(password, current_user.password)) {
        throw new Error('Invalid phone number or password');
    }

    const accessToken = generateAccessToken(current_user);
    const refreshToken = generateRefreshToken(current_user);

    return { accessToken, refreshToken };
};

const refreshAccessToken = async (refreshToken) => {
    const current_user = verifyRefreshToken(refreshToken);
    return generateAccessToken(current_user);
};

export { authenticateUser, refreshAccessToken, registerUser}