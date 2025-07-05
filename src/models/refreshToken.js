// src/models/refreshToken.js
import { DataTypes }      from 'sequelize';
import { sequelize }      from '../config/database.js';
import User               from './user.js';

const RefreshToken = sequelize.define('refresh_token', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // store the bcrypt hash of the refresh token, not the raw token
  token_hash: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
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
