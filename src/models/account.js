import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.js'; 

const Account = sequelize.define('Account', {
    account_number: {
        type: DataTypes.STRING(10), 
        allowNull: false,
        unique: true,
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
    account_tier:{
        type: DataTypes.STRING(55),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(55),
        allowNull: false
    },
    bank_name: {
        type: DataTypes.STRING(55),
        allowNull: false
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false,
        defaultValue: 0.00, 
        validate: {
            min: 0, 
        },
    },
}, {
    timestamps: true,
    tableName: 'account',
});

export default Account;
