import User from '../models/user.js';
import bcrypt from 'bcrypt';
import validator from 'validator';
import { embedlyKYCAPI, EMBEDLY_ORGANIZATION_ID } from '../utilities/embedlyConnection.js';

const isValidPin = (pin) => {
    const regex = /^\d{4}$/;
    return regex.test(pin);
};

const isValidNIN = (nin) => {
    const regex = /^\d{11}$/;
    return regex.test(nin);
};

const isValidEmail = (email) => validator.isEmail(email);

const updateKYC = async (req, res) => {
    try {
        const { pin, gender, DOB, address, nin, email } = req.body;
        const customer_id = req.user.customer_id;

        console.log('Updating KYC for customer:', customer_id);

        // Validation
        if (!pin || !gender || !DOB || !address || !nin || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required: pin, gender, DOB, address, nin, email' 
            });
        }

        if (!isValidPin(pin)) {
            return res.status(400).json({ 
                success: false, 
                message: 'PIN must be exactly 4 digits' 
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email format' 
            });
        }

        if (!isValidNIN(nin)) {
            return res.status(400).json({ 
                success: false, 
                message: 'NIN must be exactly 11 digits' 
            });
        }

        // Check if NIN is already used
        const existingNIN = await User.findOne({ 
            where: { nin },
            // Exclude current user
            customer_id: { $ne: customer_id }
        });

        if (existingNIN) {
            return res.status(400).json({ 
                success: false, 
                message: 'NIN is already registered to another account' 
            });
        }

        // Get current user
        const current_user = await User.findOne({ where: { customer_id } });
        if (!current_user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Hash pin
        const hashedPin = await bcrypt.hash(pin, 5);

        // Update user with KYC data
        await User.update(
            {
                pin: hashedPin,
                email,
                gender,
                DOB,
                address,
                nin,
                kyc_status: 'PENDING'
            },
            { where: { customer_id } }
        );

        // Verify NIN with Embedly
        try {
            const verificationResult = await verifyNINWithEmbedly({
                nin,
                firstName: current_user.firstname,
                lastName: current_user.lastname,
                dateOfBirth: DOB
            });

            if (verificationResult.verified) {
                // Update KYC status to verified
                await User.update(
                    { kyc_status: 'VERIFIED' },
                    { where: { customer_id } }
                );

                // Create wallet if verification successful
                await createEmbedlyWallet(customer_id);

                return res.status(200).json({ 
                    success: true, 
                    message: 'KYC completed and verified successfully',
                    verification: verificationResult
                });
            } else {
                await User.update(
                    { kyc_status: 'REJECTED' },
                    { where: { customer_id } }
                );

                return res.status(400).json({ 
                    success: false, 
                    message: 'NIN verification failed. Please check your details.',
                    verification: verificationResult
                });
            }
        } catch (error) {
            console.error('NIN verification error:', error);
            
            // Keep status as PENDING if verification service fails
            return res.status(200).json({ 
                success: true, 
                message: 'KYC data updated. Verification is in progress.',
                note: 'Verification will be completed shortly.'
            });
        }

    } catch (error) {
        console.error('KYC update error:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'An error occurred during KYC update'
        });
    }
};

const verifyNINWithEmbedly = async ({ nin, firstName, lastName, dateOfBirth }) => {
    try {
        const verificationData = {
            nin,
            firstName,
            lastName,
            dateOfBirth,
            organizationId: EMBEDLY_ORGANIZATION_ID
        };

        // Make request to Embedly NIN verification endpoint
        const response = await embedlyKYCAPI.post('/nin-kyc/verify', verificationData);
        
        return {
            verified: response.data.verified || false,
            details: response.data,
            message: response.data.message
        };
    } catch (error) {
        console.error('Embedly NIN verification error:', error.response?.data || error.message);
        throw new Error('NIN verification service temporarily unavailable');
    }
};

const createEmbedlyWallet = async (customer_id) => {
    try {
        const current_user = await User.findOne({ where: { customer_id } });
        if (!current_user || !current_user.embedly_customer_id) {
            throw new Error('Embedly customer ID not found');
        }

        const walletData = {
            customerId: current_user.embedly_customer_id,
            organizationId: EMBEDLY_ORGANIZATION_ID,
            currency: 'NGN',
            productId: 'DEFAULT_WALLET', // This should be configured based on your Embedly setup
        };

        const response = await embedlyAPI.post('/wallets', walletData);
        
        if (response.data && response.data.walletId) {
            // Update user with wallet information
            await User.update(
                { 
                    wallet_id: response.data.walletId,
                    account_number: response.data.accountNumber || null
                },
                { where: { customer_id } }
            );
            
            console.log('Embedly wallet created successfully:', response.data.walletId);
            return response.data;
        }
    } catch (error) {
        console.error('Error creating Embedly wallet:', error.response?.data || error.message);
        throw error;
    }
};

const getKYCStatus = async (req, res) => {
    try {
        const customer_id = req.user.customer_id;
        
        const user = await User.findOne({ 
            where: { customer_id },
            attributes: ['customer_id', 'firstname', 'lastname', 'email', 'kyc_status', 'wallet_id', 'account_number']
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        return res.status(200).json({ 
            success: true, 
            user: {
                customer_id: user.customer_id,
                name: `${user.firstname} ${user.lastname}`,
                email: user.email,
                kyc_status: user.kyc_status,
                has_wallet: !!user.wallet_id,
                account_number: user.account_number
            }
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

export { updateKYC, getKYCStatus };