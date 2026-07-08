// src/models/store.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Store = sequelize.define(
  'Store',
  {
    store_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    store_code: {
      type: DataTypes.STRING(55),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    // points per 1 currency unit (e.g. 0.02 = 2 points per 100 spent)
    points_rate: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    tableName: 'stores',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['store_code'] }],
  }
);

export default Store; 


