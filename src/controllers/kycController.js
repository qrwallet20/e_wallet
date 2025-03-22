import User from '../models/user.js';
import bcrypt from 'bcrypt';
import validator from 'validator';

const isValidPin = (pin) => {
    const regex = /^\d{4}$/;
    return regex.test(pin);
}

const isValidEmail = (email) => validator.isEmail(email);

const updateKYC = async (req, res) => {
    try {
        const {pin, email, gender, DOB, address } = req.body;
        const customer_id = req.user.customer_id;

        console.log(customer_id);

        if (!pin, !email || !gender || !DOB || !address) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (!isValidPin) {
            throw new Error('pin format incorrect');
        }

        if (!isValidEmail(email)) {
            throw new Error('Email format incorrect');
        }


        // Hash pin
        const hashedPin = await bcrypt.hash(pin, 5);

        await User.update(
            {pin:hashedPin, email, gender, DOB, address, kyc_update: 'Completed' },
            { where: { customer_id } }
        );

        return res.status(200).json({ success: true, message: 'KYC updated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export { updateKYC };
