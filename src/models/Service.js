import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Service = sequelize.define('Service', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    basePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    unit: {
        type: DataTypes.ENUM('per_kg', 'per_item', 'flat_rate'),
        defaultValue: 'per_kg'
    },
    estimatedDuration: {
        type: DataTypes.INTEGER, // in hours
        allowNull: true,
        defaultValue: 24
    },
    category: {
        type: DataTypes.ENUM('washing', 'dry_cleaning', 'ironing', 'folding', 'special'),
        defaultValue: 'washing'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    providerId: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

export default Service;
