import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.js';

const loginhistory = sequelize.define('loginhistory', {
    login_id: {
        type: DataTypes.STRING(125), 
        allowNull: false,
        primaryKey: true,
    },
    customer_id: {
        type: DataTypes.STRING(55),
        allowNull: false,
        references: {
            model: User,
            key: 'customer_id',
        },
        onDelete: 'CASCADE', 
    },
    login_date: {
        type: DataTypes.DATE, 
        allowNull: false,
        defaultValue: DataTypes.NOW, 
    },
    ip_address: {
        type: DataTypes.STRING(125), 
        allowNull: false,
    },
    os: {
        type: DataTypes.JSON, 
        allowNull: false,
    },
}, {
    timestamps: true, 
    tableName: 'login_history',
});

export default loginhistory;
