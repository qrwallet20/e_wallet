import User from '../models/user.js';

const UserDetails = async (req, res, next) => {
    try {
        const { customer_id } = req.user; // Extract from token

        const current_user = await User.findOne({ where: { customer_id } });

        if (!current_user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (current_user.kyc_update !== 'Completed') {
            return res.status(403).json({ success: true , message: 'KYC not completed. Complete KYC before making transactions.', name: current_user.firstname + current_user.lastname });
        }

        if (current_user.kyc_update == 'Completed') {
            return res.status(403).json({ success: true , name: current_user.firstname + current_user.lastname,  });
        }

        next(); // Allow transaction if KYC is completed
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export default UserDetails;