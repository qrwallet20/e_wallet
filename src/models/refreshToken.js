import { DataTypes } from 'sequelize';
import {sequelize} from '../config/database.js';
import User from './user.js';

const RefreshToken = sequelize.define('refresh_token', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    token: {
        type: DataTypes.STRING(500), // Store the refresh token
        allowNull: false,
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
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    timestamps: true,
    tableName: 'refresh_token',
});

export default RefreshToken;
