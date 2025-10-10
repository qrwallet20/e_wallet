// src/routes/embedlyCustomers.js
import express from 'express';
import {authMiddleware} from '../middlewares/authmiddleware.js';
import { customers } from '../transactions/embedlyClients.js';

const router = express.Router();

// Create a new Embedly customer (e.g. during sign-up)
router.post(
  '/',
  authMiddleware,
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
  authMiddleware,
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
  authMiddleware,
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
