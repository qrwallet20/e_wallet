import { DataTypes } from 'sequelize';
import {sequelize} from '../config/database.js';
import User from './user.js';

const transaction = sequelize.define('transaction', {
    transaction_id: {
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
    transaction_date: {
        type: DataTypes.DATE, 
        allowNull: false,
        defaultValue: DataTypes.NOW, 
    },
    transaction_type: {
        type: DataTypes.ENUM('credit', 'debit'), 
        allowNull: false,
    },
    transaction_amount: {
        type: DataTypes.DECIMAL(10,2), 
        allowNull: false,
    },
    initial_amount: {
        type: DataTypes.DECIMAL(10,2), 
        allowNull: false,
    },
    final_amount: {
        type: DataTypes.DECIMAL(10,2), 
        allowNull: false,
    },
    transaction_fee: {
        type: DataTypes.DECIMAL(10,2), 
        allowNull: false,
        defaultValue: 0.00, 
    },
    receiver_name: {
        type: DataTypes.STRING(55), 
        allowNull: true,
    },
    sender_name: {
        type: DataTypes.STRING(55), 
        allowNull: true,
    },
    receiver_bank: {
        type: DataTypes.STRING(10), 
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'), 
        allowNull: false,
        defaultValue: 'pending', 
    },
}, {
    timestamps: true, 
    tableName: 'transaction',
});

export default transaction;
