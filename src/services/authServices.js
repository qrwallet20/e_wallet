import bcrypt from 'bcrypt';
import User from '../models/user.js';
import {v4 as uuid} from 'uuid';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utilities/tokenUtils.js';
import RefreshToken from '../models/refreshToken.js';
import { embedlyAPI, EMBEDLY_ORGANIZATION_ID } from '../utilities/embedlyConnection.js';

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

const registerUser = async (firstname, lastname, email, password, phone_number) => {
    // Validation
    if (!firstname || !lastname || !email || !password || !phone_number) {
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
    const existingUser = await User.findOne({ 
        where: { 
            $or: [
                { phone_number },
                { email }
            ]
        } 
    });
    
    if (existingUser) {
        throw new Error('Phone number or email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const customer_id = uuid();

    // Create user in local database first
    const new_user = await User.create({
        customer_id,
        firstname,
        lastname,
        email,
        password: hashedPassword,
        phone_number,
        organization_id: EMBEDLY_ORGANIZATION_ID
    });

    // Create customer in Embedly
    try {
        await createEmbedlyCustomer(new_user);
    } catch (error) {
        console.error('Failed to create Embedly customer:', error);
        // Don't fail registration if Embedly creation fails
        // User can complete this during KYC
    }

    return {
        customer_id: new_user.customer_id,
        firstname: new_user.firstname,
        lastname: new_user.lastname,
        email: new_user.email,
        phone_number: new_user.phone_number,
        kyc_status: new_user.kyc_status
    };
};

const createEmbedlyCustomer = async (user) => {
    try {
        const customerData = {
            organizationId: EMBEDLY_ORGANIZATION_ID,
            firstName: user.firstname,
            lastName: user.lastname,
            email: user.email,
            phoneNumber: user.phone_number,
            // Add other required fields based on Embedly documentation
        };

        const response = await embedlyAPI.post('/customers', customerData);
        
        if (response.data && response.data.customerId) {
            // Update user with Embedly customer ID
            await User.update(
                { 
                    embedly_customer_id: response.data.customerId,
                    organization_id: EMBEDLY_ORGANIZATION_ID
                },
                { where: { customer_id: user.customer_id } }
            );
            
            console.log('Embedly customer created successfully:', response.data.customerId);
            return response.data;
        }
    } catch (error) {
        console.error('Error creating Embedly customer:', error.response?.data || error.message);
        throw error;
    }
};

const authenticateUser = async (phone_number, password) => {
    const current_user = await User.findOne({ where: { phone_number } });

    if (!current_user) {
        throw new Error('User does not exist');
    }

    const isPasswordValid = await bcrypt.compare(password, current_user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid phone number or password');
    }

    const outputMessage = (current_user.kyc_status !== 'VERIFIED') 
        ? 'Login successful, but KYC verification is required for full access.' 
        : 'Login successful';

    const accessToken = generateAccessToken(current_user);
    const refreshToken = generateRefreshToken(current_user);

    await RefreshToken.create({
        customer_id: current_user.customer_id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    });

    return { 
        accessToken, 
        refreshToken, 
        outputMessage,
        user: {
            customer_id: current_user.customer_id,
            firstname: current_user.firstname,
            lastname: current_user.lastname,
            email: current_user.email,
            kyc_status: current_user.kyc_status
        }
    };
};

const refreshAccessToken = async (refreshToken) => {
    const storedToken = await RefreshToken.findOne({ where: { token: refreshToken } });
    if (!storedToken) {
        throw new Error('Invalid or expired refresh token');
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
        throw new Error('Invalid or expired refresh token');
    }

    const user = await User.findOne({ where: { customer_id: decoded.customer_id } });
    if (!user) {
        throw new Error('User not found');
    }

    const accessToken = generateAccessToken(user);
    return accessToken;
};

const logoutUser = async (refreshToken) => {
    await RefreshToken.destroy({ where: { token: refreshToken } });
};

export { authenticateUser, refreshAccessToken, registerUser, logoutUser, createEmbedlyCustomer };