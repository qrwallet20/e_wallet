import express from 'express';
import { PORT } from './config/env.js';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/authRoutes.js';
import { syncDatabaseWithRetry } from './config/database.js';
import { limiter } from './middlewares/rateLimit.js';




const app = express();
app.use(express.json());
app.use(limiter);

app.use('/auth', authRoutes);
app.use('/user', userRoutes);



// Start the server
(async () => {
    await syncDatabaseWithRetry(); // Try syncing the database with retries

    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
})();
