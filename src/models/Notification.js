const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('order', 'payment', 'message', 'promo', 'system'),
        defaultValue: 'system'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
    }
});

module.exports = Notification;
