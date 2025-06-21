import { DataTypes } from 'sequelize';
import {sequelize} from '../config/database.js';

const User = sequelize.define('User', {
    customer_id: {
        type: DataTypes.STRING(55),
        primaryKey: true,
        allowNull: false,
    },
    // Embedly customer ID after successful registration
    embedly_customer_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    // Organization ID for Embedly
    organization_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    firstname: {
        type: DataTypes.STRING(55),
        allowNull: false,
    },
    lastname: {
        type: DataTypes.STRING(55),
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING(125),
        allowNull: false,
    },
    pin: {
        type: DataTypes.STRING(60), 
        allowNull: true,
    },
    phone_number: {
        type: DataTypes.STRING(20), 
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING(55),
        allowNull: true,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    gender: {
        type: DataTypes.ENUM('Male', 'Female'),
        allowNull: true,
    },
    DOB: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    address: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    // NIN for Nigerian customers
    nin: {
        type: DataTypes.STRING(11),
        allowNull: true,
        unique: true,
    },
    // KYC status
    kyc_status: {
        type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED', 'INCOMPLETE'),
        allowNull: false,
        defaultValue: 'INCOMPLETE',
    },
    // Wallet information
    wallet_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    account_number: {
        type: DataTypes.STRING(10), 
        allowNull: true,
        unique: true,
    },
    // Customer tier/level
    customer_tier: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'TIER_1'
    }
}, {
    timestamps: true,
    tableName: 'user',
    createdAt: 'created_at',
    updatedAt: 'updated_at', 
});

export default User;