import express from 'express';
import { authMiddleware } from '../middlewares/authmiddleware.js'

const router = express.Router();

router.get('/', authMiddleware, (req,res)=>{
    res.send('Hello from express');
})





export default router;