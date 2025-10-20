import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PORT } from './config/env.js';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/authRoutes.js';
import { syncDatabaseWithRetry } from './config/database.js';
import { limiter } from './middlewares/rateLimit.js';
import transactionsRouter from './routes/user.routes.js';
import customersRouter from './routes/embedlyCustomers.js';
import  embedlyWebhook  from './routes/webhookRoutes.js';
import swaggerUi, { serve } from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import userRoute from './routes/user.js';
//const userRoute = require('./routes/user');





const app = express();

// Webhook routes (must come before express.json() middleware)
// Webhooks need raw body for signature verification


// Regular middleware
app.use(express.json());
app.use(limiter);

// Swagger API documentation
//const router = express.Router();
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'E-Wallet API',
            version: '1.0.0',
            description: 'API documentation for the E-Wallet application',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Local server'
            },
            {
                url: 'https://ewallet-production.up.railway.app',
                description: 'Staging server'
            }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
            },
        },
        },
    apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use('/api', userRoute);


// Regular routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/webhooks', embedlyWebhook);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'E-Wallet API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 404 handler


// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
});


// Embedly specific routes
// These routes handle transactions and customer management for Embedly


app.use('/api/v1/embedly/transactions', transactionsRouter);
app.use('/api/v1/embedly/customers', customersRouter);

// 404 catcher
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});



app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// central error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message
  });
});


// Start the server

(async () => {
    await syncDatabaseWithRetry(); // Try syncing the database with retries

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 Webhook endpoints available at http://localhost:${PORT}/webhooks`);
        console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
    });
})();
