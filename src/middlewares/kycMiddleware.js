import User from '../models/user.js';
import axios from 'axios';

const checkKYC = async (req, res, next) => {
    try {
        const { customer_id } = req.user; // Extract from token

        const new_user = await User.findOne({ where: { customer_id } });

        if (!new_user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (new_user.nin_status !== 'VERIFIED') {
            return res.status(403).json({ success: false, message: 'NIN verification not completed. Complete NIN verification before making transactions.' });
        }

        next(); // Allow transaction if KYC is completed
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export default checkKYC;
