import {DATABASE_URL} from './env.js'

import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
});

// const testConnection = async () => {
//     try {
//         await sequelize.authenticate();
//         console.log('✅ Database connection successful');
//     } catch (error) {
//         console.error('❌ Database connection failed:', error);
//     }
// };

// testConnection();

export default sequelize;