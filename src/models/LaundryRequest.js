import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LaundryRequest = sequelize.define('LaundryRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  providerId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'declined', 'picked_up', 'washing', 'ready', 'out_for_delivery', 'delivered'),
    defaultValue: 'pending'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  pickupAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  pickupTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  deliveryTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  review: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

export default LaundryRequest;