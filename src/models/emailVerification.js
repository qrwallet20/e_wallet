
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const EmailVerification = sequelize.define('EmailVerification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { isEmail: true },
  },
  purpose: {
    type: DataTypes.ENUM('signup', 'reset', 'change_email'),
    allowNull: false,
    defaultValue: 'signup',
  },
  // Optional correlation key before a user/customer exists
  session_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // store only hash of 4-digit code
  code_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  consumed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true, // mark false when consumed/invalidated
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  last_sent_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  send_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  // for audit after you create the customer
  customer_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'email_verifications',
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['email', 'purpose', 'active'] }, // allow one active per email+purpose
    { fields: ['expires_at'] },
  ],
  // optional: ensure only one active per (email,purpose) at the app level
});

export default EmailVerification;
