import express from 'express';
import { authMiddleware } from '../middlewares/authmiddleware.js'
import {updateKYC} from '../controllers/kycController.js'
const router = express.Router();


router.post('/update', authMiddleware, updateKYC);


router.get('/', authMiddleware, (req,res)=>{
    res.send('Hello from express');
})





export default router;