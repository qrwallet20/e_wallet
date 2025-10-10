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
    middlename: {
        type: DataTypes.STRING(55),
        allowNull: false,
    },

    city: {
        type: DataTypes.STRING(55),
        allowNull: true,
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
    dob: {
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
    country_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: false,
    },
    // KYC status
    nin_status: {
        type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED', 'INCOMPLETE'),
        allowNull: false,
        defaultValue: 'INCOMPLETE',
    },
    bvn_status: {
        type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED', 'INCOMPLETE'),
        allowNull: false,
        defaultValue: 'INCOMPLETE',
    },
    // Customer tier/level
    customer_tier: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'TIER_1'
    },
    customerType:{
        type: DataTypes.STRING(55),
        allowNull: true,
        defaultValue: 'Individual'
    }
}, {
    timestamps: true,
    tableName: 'user',
    createdAt: 'created_at',
    updatedAt: 'updated_at', 
});

export default User;