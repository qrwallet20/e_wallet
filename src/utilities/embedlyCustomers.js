// src/routes/embedlyCustomers.js
import express from 'express';
import auth     from '../middlewares/authmiddleware.js';
import {
  addCustomer,
  getCustomer,
  updateCustomer
} from '../services/embedlyCustomerService.js';

const router = express.Router();

router.post('/',    auth, async (req,res,next) => {
  try {
    const data = await addCustomer(req.body);
    res.status(201).json({ success:true, data });
  } catch(e){ next(e); }
});

router.get('/me',   auth, async (req,res,next) => {
  try {
    const embedlyId = req.user.embedly_customer_id;
    if (!embedlyId) throw Object.assign(new Error('No Embedly customer linked'), { status:404 });
    const data = await getCustomer(embedlyId);
    res.json({ success:true, data });
  } catch(e){ next(e); }
});

router.patch('/me', auth, async (req,res,next) => {
  try {
    const embedlyId = req.user.embedly_customer_id;
    if (!embedlyId) throw Object.assign(new Error('No Embedly customer linked'), { status:404 });
    const data = await updateCustomer(embedlyId, req.body);
    res.json({ success:true, data });
  } catch(e){ next(e); }
});

export default router;
