import { DataTypes } from 'sequelize';
import {sequelize} from '../config/database.js';
import User from './user.js'; 

const Account = sequelize.define('Account', {
    account_number: {
        type: DataTypes.STRING(10), 
        allowNull: true,
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
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(55),
        allowNull: true
    },
    account_number: {
        type: DataTypes.STRING(10), 
        allowNull: true,
        unique: true,
    },
    walletId: {
        type: DataTypes.STRING(55),
        allowNull: true
    },
    bank_name: {
        type: DataTypes.STRING(55),
        allowNull: true
    },
    bank_code: {
        type: DataTypes.STRING(55),
        allowNull: true
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false,
        defaultValue: 0.00, 
        validate: {
            min: 0, 
        },
    },
    ledgerBalance: {
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false,
        defaultValue: 0.00, 
    },
}, {
    timestamps: true,
    tableName: 'account',
});

export default Account;
