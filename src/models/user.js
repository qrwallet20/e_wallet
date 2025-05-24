import { DataTypes } from 'sequelize';
import {sequelize} from '../config/database.js';


const User = sequelize.define('User', {
    customer_id: {
        type: DataTypes.STRING(55),
        primaryKey: true,
        allowNull: false,
    },
    external_customer_id: {
        type: DataTypes.STRING(55),
        allowNull: true, // Only set after full KYC
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
    account_number: {
        type: DataTypes.STRING(10), 
        allowNull: true,
        unique: true,
    },
    kyc_update:{
        type: DataTypes.ENUM('Completed','Uncompleted'),
        allowNull: false,
        defaultValue: 'Uncompleted',
    }
}, {
    timestamps: true,
    tableName: 'user',
    createdAt: 'created_at',
    updatedAt: 'updated_at', 
});

export default User;
