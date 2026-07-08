// src/models/pointHistory.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import User from './user.js';
import Store from './store.js';
import Transaction from './transaction.js';

const PointHistory = sequelize.define(
  'PointHistory',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
      onUpdate: 'CASCADE',
    },

    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Store,
        key: 'store_id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },

    transaction_id: {
      type: DataTypes.STRING(125),
      allowNull: false,
      unique: true, // one point record per transaction (prevents double-crediting)
      references: {
        model: Transaction,
        key: 'transaction_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    purchase_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },

    point_rate_applied: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
      validate: { min: 0 },
    },

    points_earned: {
      // keep as decimal so you can support fractional points if needed
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
      validate: { min: 0 },
    },
  },
  {
    tableName: 'point_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['store_id'] },
      { fields: ['customer_id', 'store_id'] },
      { unique: true, fields: ['transaction_id'] },
    ],
  }
);

export default PointHistory;
