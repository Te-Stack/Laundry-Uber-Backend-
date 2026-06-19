import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Sequelize model for querying the Better Auth 'user' table.
// Better Auth manages user creation and password hashing.
// This model is used by other routes (requests, messages, etc.) to query user data.
const User = sequelize.define('user', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'customer'
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  totalRatings: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  schedule: {
    type: DataTypes.TEXT,
    defaultValue: null
  }
}, {
  tableName: 'user',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

export default User;