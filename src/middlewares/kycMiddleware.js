import User from '../models/user.js';

const checkKYC = async (req, res, next) => {
    try {
        const { customer_id } = req.user; // Extract from token

        const new_user = await User.findOne({ where: { customer_id } });

        if (!new_user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (new_user.kyc_update !== 'Completed') {
            return res.status(403).json({ success: false, message: 'KYC not completed. Complete KYC before making transactions.' });
        }

        next(); // Allow transaction if KYC is completed
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export default checkKYC;
