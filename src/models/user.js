import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcrypt';

const user = sequelize.define('user', {
    customer_id: {
        type: DataTypes.STRING(55),
        primaryKey: true,
        allowNull: false,
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
        allowNull: false,
    },
    phone_number: {
        type: DataTypes.STRING(20), 
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING(55),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    gender: {
        type: DataTypes.ENUM('Male', 'Female'),
        allowNull: false,
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
        allowNull: false,
        unique: true,
    },
}, {
    timestamps: true,
    tableName: 'user',
});

export default user;
