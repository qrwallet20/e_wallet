import { DATABASE_URL, MAX_RETRIES, RETRY_DELAY } from './env.js';
import { Sequelize } from 'sequelize';


if (!DATABASE_URL) {
  console.log('DATABASE_URL is not defined. Check your .env file or environment variables');
}

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
});

// Function to sync database models
const syncDatabase = async () => {
    try {
        await sequelize.authenticate(); // Test connection
        console.log('✅ Database connected successfully');

        await sequelize.sync({ alter: true }); // Updates schema without dropping tables
        console.log('✅ Database synced successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    }
};


// Sync database before starting the server
const syncDatabaseWithRetry = async (retries = 0) => {
    try {
        await syncDatabase();
        console.log('✅ Database synchronized successfully.');
        return true;
    } catch (error) {
        console.error(`⚠️ Database sync failed (Attempt ${retries + 1}/${MAX_RETRIES}):`, error);

        if (retries < MAX_RETRIES - 1) {
            console.log(`🔄 Retrying in ${RETRY_DELAY / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            return syncDatabaseWithRetry(retries + 1);
        } else {
            console.error('❌ Max retry attempts reached. Server shutting down.');
            process.exit(1);
        }
    }
};

// Call syncDatabase only once in your `server.js`
export { sequelize, syncDatabaseWithRetry };
