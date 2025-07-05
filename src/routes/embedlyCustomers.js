// src/routes/embedlyCustomers.js
import express from 'express';
import auth from '../middlewares/authmiddleware.js';
import { customers } from '../services/embedlyClients.js';

const router = express.Router();

// Create a new Embedly customer (e.g. during sign-up)
router.post(
  '/',
  auth,
  async (req, res, next) => {
    try {
      const result = await customers.add(req.body);
      res.status(201).json({ success: true, data: result.data });
    } catch (err) {
      next(err);
    }
  }
);

// Get the current user's Embedly customer record
router.get(
  '/me',
  auth,
  async (req, res, next) => {
    try {
      const embedlyId = req.user.embedly_customer_id;
      if (!embedlyId) {
        return res
          .status(404)
          .json({ success: false, message: 'No Embedly customer linked' });
      }
      const result = await customers.get(embedlyId);
      res.json({ success: true, data: result.data });
    } catch (err) {
      next(err);
    }
  }
);

// Update the current user's Embedly customer record
router.patch(
  '/me',
  auth,
  async (req, res, next) => {
    try {
      const embedlyId = req.user.embedly_customer_id;
      if (!embedlyId) {
        return res
          .status(404)
          .json({ success: false, message: 'No Embedly customer linked' });
      }
      const result = await customers.update(embedlyId, req.body);
      res.json({ success: true, data: result.data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
