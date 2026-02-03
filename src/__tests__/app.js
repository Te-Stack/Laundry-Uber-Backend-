const express = require('express');
const cors = require('cors');

// Import models
const User = require('../models/User');
const LaundryRequest = require('../models/LaundryRequest');
const Message = require('../models/Message');
const Payment = require('../models/Payment');
const Service = require('../models/Service');
const Notification = require('../models/Notification');

// Import routes
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/users');
const requestRoutes = require('../routes/requests');
const messageRoutes = require('../routes/messages');
const paymentRoutes = require('../routes/payments');
const serviceRoutes = require('../routes/services');
const notificationRoutes = require('../routes/notifications');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);

// Model Associations
User.hasMany(LaundryRequest, { as: 'customerRequests', foreignKey: 'customerId' });
User.hasMany(LaundryRequest, { as: 'providerRequests', foreignKey: 'providerId' });
LaundryRequest.belongsTo(User, { as: 'customer', foreignKey: 'customerId' });
LaundryRequest.belongsTo(User, { as: 'provider', foreignKey: 'providerId' });

User.hasMany(Payment, { foreignKey: 'userId' });
Payment.belongsTo(User, { foreignKey: 'userId' });
Payment.belongsTo(LaundryRequest, { as: 'request', foreignKey: 'requestId' });
LaundryRequest.hasOne(Payment, { foreignKey: 'requestId' });

User.hasMany(Service, { foreignKey: 'providerId' });
Service.belongsTo(User, { as: 'provider', foreignKey: 'providerId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

module.exports = app;
