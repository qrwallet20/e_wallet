import User from '../models/user.js';
import Account from '../models/account';
import bcrypt from 'bcrypt';
import validator from 'validator';
import axios from 'axios';
import { response } from 'express';

const isValidPin = (pin) => {
    const regex = /^\d{4}$/;
    return regex.test(pin);
}

const isValidEmail = (email) => validator.isEmail(email);

const updateKYC = async (req, res) => {
    try {
        const {pin, gender, DOB, address} = req.body;
        const customer_id = req.user.customer_id;

        console.log(customer_id);

        if (!pin && !gender && !DOB && !address) {
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

        //createWalletXpress();

        return res.status(200).json({ success: true, message: 'KYC updated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
        
    }
 
    };
    
    // const createWalletXpress = async () => {
    //     try{
    //     const current_user = await User.findOne({ where: { customer_id } });
    //     if(current_user.kyc_update = 'Completed'){
        
        
    //     let data = {
    //     "bvn": "",
    //     "firstName": current_user.firstName,
    //     "lastName": current_user.lastName,
    //     "accountPrefix": "11",
    //     "dateOfBirth": current_user.DOB,
    //     "phoneNumber": current_user.phoneNumber,
    //     "email": current_user.email,
    //     "address": current_user.address,
    //     "metadata": {
    //     "even-more": "Other data",
    //     "additional-data": "some more data"
    //     }}
    //     axios(config)
    //     .then((response) => {
    //     console.log(JSON.stringify(response.data));
    //     })

    //     .catch((error) => {
    //     console.log(error);
    //     });
    //     }
    //     await User.update(
    //         { external_customer_id: response.customer.id, account_tier: response.customer.tier },
    //         { where: { customer_id } }
    //     );
    //     await Account.update(
    //         { status: response.wallet.status, account_number: response.data.accountNumber, bank_name: response.wallet.bankName},
    //         { where: {customer_id}}
    //     );
    // }
    //     catch(error){
    //         console.error('Error creating user wallet:', error);
    //     }
    
    // }
  


export { updateKYC };
