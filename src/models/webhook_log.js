import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const WebhookLog = sequelize.define('webhook_log', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    event_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    event_data: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    processing_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    last_error: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    source_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
    },
    signature_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: 'webhook_logs',
});

export default WebhookLog;