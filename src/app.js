import express from 'express';
import {PORT} from './config/env.js'
import userRoutes from './routes/user.routes.js';

const app = express();
app.use(express.json());


app.use('',userRoutes);
app.listen(PORT,() => console.log(`server is running on http://localhost:${PORT}`));