// src/controllers/kycController.js
import bcrypt from 'bcrypt';
import validator from 'validator';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import User from '../models/user.js';
import Account from '../models/account.js';
import Transaction from '../models/transaction.js';
import { ensureEmbedlyCustomerAndSyncNames } from '../services/authServices.js';
import { safeCall } from '../utilities/apiWrapper.js';
import { embedlyAPI } from '../utilities/embedlyConnection.js';
import { createEmbedlyWallet, getCustomerTier } from '../transactions/transactionServices.js';
import { sendMail } from '../utilities/nodeMailer.js';

// Validation helpers
const isValidPin = (pin) => /^\d{4}$/.test(pin);
const isValidNIN = (nin) => /^\d{11}$/.test(nin);
const isValidEmail = (email) => validator.isEmail(email);

/**
 * Update user KYC:
 * 1) Save local data (PENDING)
 * 2) Ensure/Sync Embedly customer (create if missing)
 * 3) Verify NIN against that customerId
 * 4) If verified → set VERIFIED and create wallet
 */
export const updateKYC = async (req, res, next) => {
  try {
    const { pin, gender, dob, address, nin, email: emailInput, city } = req.body;
    const customer_id = req.user.customer_id;

    // 1) Basic validation
    if (!pin || !gender || !dob || !address || !nin || !city) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: pin, gender, dob, address, nin, city'
      });
    }
    if (!isValidPin(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
    }
    if (!isValidNIN(nin)) {
      return res.status(400).json({ success: false, message: 'NIN must be exactly 11 digits' });
    }

    // Prefer email from body (if user is updating it), else fall back to their stored email
    const email = emailInput || req.user.email;
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // 2) Ensure NIN uniqueness
    const conflict = await User.findOne({
      where: { nin, customer_id: { [Op.ne]: customer_id } }
    });
    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'NIN is already registered to another account'
      });
    }

    // 3) Save/update local KYC fields (status = PENDING)
    const hashedPin = await bcrypt.hash(pin, 5);
    await User.update(
      { pin: hashedPin, email, gender, dob, address, nin, city, kyc_status: 'PENDING' },
      { where: { customer_id } }
    );

    const freshUser = await User.findOne({ where: { customer_id: req.user.customer_id } });

    // Normalize DOB to YYYY-MM-DD for Embedly
    const dobISO = new Date(freshUser.dob).toISOString().slice(0, 10);
    
    const fullUserData = {
    customer_id: freshUser.customer_id,
    embedly_customer_id: freshUser.embedly_customer_id || null,
    firstname: freshUser.firstname,
    middlename: freshUser.middlename,
    lastname: freshUser.lastname,
    email: freshUser.email,                  
    phone_number: freshUser.phone_number,
    dob: dobISO,
    address: freshUser.address,                
    city: freshUser.city,                   
    country_id: freshUser.country_id,
    customer_type_id: freshUser.customer_type_id
  };


    // 4) Ensure/Sync Embedly customer first (create if missing), and sync names
    const embedlyCustomer = await ensureEmbedlyCustomerAndSyncNames(fullUserData);
    const embedlyId = embedlyCustomer.customerId || embedlyCustomer.id;
    if (!embedlyId) {
      return res.status(502).json({
        success: false,
        message: 'Unable to ensure/create Embedly customer'
      });
    }

    
    

    // 6) Mark VERIFIED and create wallet
    const result = await sequelize.transaction(async (t) => {
      await User.update(
        { embedly_customer_id: embedlyId, kyc_status: 'VERIFIED' },
        { where: { customer_id }, transaction: t }
      );

      

      return { embedlyId };
    });

    return res.status(200).json({
      success: true,
      message: 'KYC completed and verified successfully',
      embedlyId: result.embedlyId
    });
  } catch (err) {
    console.error('updateKYC error:', err);
    next(err);
  }
};

export const checkId = async (req, res, next) => {
  const customer_id = req.user.customer_id;

  const user = await User.findOne({
    where: { customer_id },
    attributes: ['embedly_customer_id']
  });

  const resp = await embedlyAPI.get(`/customers/get/id/${user.embedly_customer_id}`,null);
  console.log(resp);
};

export const updateNin = async (req, res, next) => {
  const customer_id = req.user.customer_id;

  const user = await User.findOne({
      where: { customer_id },
      attributes: ['embedly_customer_id', 'nin', 'firstname', 'lastname', 'dob']
    });
  const body = {
      "firstname":user.firstname,
      "lastname":user.lastname,
      "dob":user.dob,
    };

    console.log(body, user.embedly_customer_id, user.nin);

    const resp = await embedlyAPI.post('/customers/kyc/customer/nin', body, {params: {customerId:user.embedly_customer_id, nin:user.nin, verify:1}});
      //console.log(resp);
    const verification = resp.data;
    console.log(verification.success);
    if (verification.success === false) {
      await User.update({ nin_status: 'REJECTED' }, { where: { customer_id } });
      return res.status(400).json({
        success: false,
        message: 'NIN verification failed',
        verification
      });
    }
    if (verification.success === true || verification.message === 'Customer has already completed NIN verification!') {
      console.log('NIN verification successful:', verification);
      await User.update({ nin_status: 'VERIFIED' }, { where: { customer_id } });
      const user_exists = await Account.findOne({ where: { customer_id } });
      if (!user_exists) {
        await Account.create({ customer_id: customer_id });
      }
      await createEmbedlyWallet(customer_id); // Create wallet after NIN verification
      return res.status(200).json({
      success: true,
      message: 'NIN verification successful',
      verification
    });
    } 
    
}




/// Under Testing
///



export const updateBvn = async (req, res, next) => {
  const customer_id = req.user.customer_id;
  const { bvn } = req.body;

  const user = await User.findOne({
      where: { customer_id },
      attributes: ['embedly_customer_id', 'bvn']
    });
  const bvnPayload = {
      customerId: user.embedly_customer_id,
      bvn: bvn
    };

    console.log(bvnPayload);

    const resp = await embedlyAPI.post(`/customers/kyc/premium-kyc`, bvnPayload);
    const verification = resp.data;
    console.log(verification.success);
    if (verification.success === "false") {
      await User.update({ bvn_status: 'REJECTED' }, { where: { customer_id } });
      return res.status(400).json({
        success: false,
        message: 'BVN verification failed',
        verification
      });
    }
    if (verification.success === "true" || verification.message === 'Customer has already completed BVN verification!') {
      console.log('BVN verification successful:', verification);
      await User.update({ bvn_status: 'VERIFIED' }, { where: { customer_id } });
      //await createEmbedlyWallet(customer_id); // Create wallet after NIN verification
      return res.status(200).json({
      success: true,
      message: 'BVN verification successful',
      verification
    });
    } 
    
}

export const getKYCStatus = async (req, res, next) => {
  try {
    const customer_id = req.user?.customer_id;
    if (!customer_id) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findOne({
      where: { customer_id },
      attributes: ['embedly_customer_id']
    });
    const rawId = user?.embedly_customer_id;
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Embedly customer ID not found' });
    }

    const embedlyId = String(rawId).trim();
    const kycUrl = `/customers/customer-verification-properties/${encodeURIComponent(embedlyId)}`;

    const kycResp = await embedlyAPI.get(kycUrl); // axios instance with x-api-key + Accept

    if (kycResp.status >= 200 && kycResp.status < 300) {
      // Guard against empty body
      const empty = kycResp.data == null ||
                    (typeof kycResp.data === 'string' && kycResp.data.trim() === '') ||
                    (typeof kycResp.data === 'object' && !Object.keys(kycResp.data).length);
      if (empty) {
        return res.status(404).json({
          success: false,
          message: 'No verification properties found (empty upstream response)',
          embedlyId
        });
      }
      return res.status(200).json({ success: true, data: kycResp.data });
    }

    // If 404, check whether the customer exists at all
    if (kycResp.status === 404) {
      const custResp = await embedlyAPI.get(`/customers/${encodeURIComponent(embedlyId)}`);
      if (custResp.status === 404) {
        // Case 1: wrong ID / wrong env / wrong key
        return res.status(404).json({
          success: false,
          message: 'Embedly customer not found in staging for this API key',
          embedlyId
        });
      }
      // Case 2: customer exists, but no verification record yet
      return res.status(404).json({
        success: false,
        message: 'Verification properties not found — KYC likely not initiated for this customer',
        embedlyId
      });
    }

    // Other upstream errors
    return res.status(kycResp.status).json({
      success: false,
      message: `Upstream error (${kycResp.status} ${kycResp.statusText || ''})`,
      details: typeof kycResp.data === 'string' ? kycResp.data : (kycResp.data ?? null)
    });
  } catch (err) {
    if (err.response) {
      const { status, statusText, data } = err.response;
      return res.status(status).json({
        success: false,
        message: `Upstream error (${status} ${statusText || ''})`,
        details: typeof data === 'string' ? data : (data ?? null)
      });
    }
    return next(err);
  }
};


// export const getKYCStatus = async (req, res, next) => {
//   try {
//     const customer_id = req.user?.customer_id;
//     if (!customer_id) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const user = await User.findOne({
//       where: { customer_id },
//       attributes: ['embedly_customer_id']
//     });
//     if (!user?.embedly_customer_id) {
//       return res.status(400).json({ success: false, message: 'Embedly customer ID not found' });
//     }

//     const embedlyId = String(user.embedly_customer_id).trim();
//     const urlPath = `/customers/customer-verification-properties/${encodeURIComponent(embedlyId)}`;

//     const resp = await embedlyAPI.get(urlPath); // axios: { status, data, headers, statusText }

//     const { status, data, headers, statusText } = resp;
//     const contentType = headers?.['content-type'] || headers?.['Content-Type'];
//     const contentLen  = headers?.['content-length'] || headers?.['Content-Length'];

//     // Treat empty response bodies explicitly
//     const isEmpty =
//       data == null ||
//       (typeof data === 'string' && data.trim() === '') ||
//       (typeof data === 'object' && Object.keys(data).length === 0);

//     if (status >= 200 && status < 300) {
//       if (isEmpty) {
//         // Helpful extra checks to guide you
//         return res.status(404).json({
//           success: false,
//           message: 'No verification properties found (empty upstream response)',
//           details: {
//             upstreamStatus: status,
//             contentType,
//             contentLength: contentLen ?? null,
//             hint: 'If the customer exists but has not started KYC, this endpoint often returns empty/404.'
//           }
//         });
//       }
//       return res.status(200).json({ success: true, data });
//     }

//     // Non-2xx: surface what we can
//     return res.status(status).json({
//       success: false,
//       message: `Upstream error (${status} ${statusText || ''})`,
//       details: typeof data === 'string' ? data : (data ?? null)
//     });

//   } catch (err) {
//     // If axios threw, show upstream details if present
//     if (err.response) {
//       const { status, statusText, data } = err.response;
//       return res.status(status).json({
//         success: false,
//         message: `Upstream error (${status} ${statusText || ''})`,
//         details: typeof data === 'string' ? data : (data ?? null)
//       });
//     }
//     return next(err);
//   }
// };






export const getCustomerTierHandler = async (req, res, next) => {
  try {
    console.log('[TIER DEBUG] req.user:', req.user);
    const customer_id = req.user.customer_id;
    const tier = await getCustomerTier(customer_id);
    return res.status(200).json({ success: true, tier });
  } catch (err) {
    console.error('[TIER DEBUG] Error in getCustomerTierHandler:', err.message);
    next(err);
  }
};