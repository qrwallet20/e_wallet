import rateLimit from 'express-rate-limit';
import { MAX_REQUEST } from '../config/env.js';



export const limiter = rateLimit({
    max: MAX_REQUEST, //number of request from an IP address
    windowMS: 15 * 60 * 1000, // 15mins window
    message: { success: false, message:"Too many requests, try later."}
});
