import express from 'express';
import {PORT} from './config/env.js'
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/authRoutes.js';
import sequelize from './config/database.js';

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/user',userRoutes);

sequelize.sync().then(() => {
    console.log('Database connected!');
    app.listen(PORT, () => console.log(`server is running on http://localhost:${PORT}`));
}).catch((err) => console.error('DB Connection Error:', err));
