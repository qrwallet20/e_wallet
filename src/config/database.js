import { DATABASE_URL } from './env.js';
import { Sequelize } from 'sequelize';

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

// Call syncDatabase only once in your `server.js`
export { sequelize, syncDatabase };
