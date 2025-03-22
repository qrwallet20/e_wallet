import express from 'express';
import { PORT } from './config/env.js';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/authRoutes.js';
import { syncDatabase } from './config/database.js';

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Sync database before starting the server
(async () => {
    try {
        await syncDatabase(); // Ensures DB connection & schema sync
        app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    } catch (error) {
        console.error('❌ Failed to start server:', error);
    }
})();
