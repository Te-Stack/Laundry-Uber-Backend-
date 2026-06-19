import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { auth } from './config/auth.js';
import sequelize from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { isValidTransition, allowedTransitions } from './constants/statusTransitions.js';

// Import models
import User from './models/User.js';
import LaundryRequest from './models/LaundryRequest.js';
import Message from './models/Message.js';
import Payment from './models/Payment.js';
import Service from './models/Service.js';
import Notification from './models/Notification.js';

// Import routes
import userRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import messageRoutes from './routes/messages.js';
import paymentRoutes from './routes/payments.js';
import serviceRoutes from './routes/services.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const frontendOrigins = (
  process.env.FRONTEND_URL || (isProduction ? '' : 'http://localhost:5173')
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && frontendOrigins.length === 0) {
  throw new Error('FRONTEND_URL must be set in production.');
}

const corsOptions = {
  origin: frontendOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};
const io = new Server(server, {
  cors: corsOptions
});

// CORS — hardened for cookie-based auth
app.use(cors(corsOptions));

// Better Auth handler — MUST be mounted BEFORE express.json()
app.all("/api/auth/*", toNodeHandler(auth));

// JSON body parser — for all other routes
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized error handler — must be mounted after all routes
app.use(errorHandler);

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

// Socket.IO connection handling
const connectedUsers = new Map();

// Authenticate every socket connection via the Better Auth session cookie.
// Rejects the handshake if no valid session is found.
io.use(async (socket, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(socket.request.headers),
    });
    if (!session) {
      return next(new Error('Authentication required'));
    }
    socket.data.user = session.user;
    next();
  } catch {
    next(new Error('Authentication required'));
  }
});

io.on('connection', async (socket) => {
  // Identity comes from the verified session, never from the client payload.
  const userId = socket.data.user.id;

  connectedUsers.set(userId, socket.id);
  await User.update({ isOnline: true }, { where: { id: userId } });
  io.emit('user:status', { userId, isOnline: true });

  if (!isProduction) {
    console.info(`User ${userId} connected`);
  }

  socket.on('message:send', async (data) => {
    const { receiverId, content, requestId } = data;
    // senderId is taken from the verified session, not from the client payload.
    const senderId = socket.data.user.id;
    const message = await Message.create({ senderId, receiverId, content, requestId });

    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:receive', message);
    }
  });

  socket.on('request:update', async (data) => {
    const { requestId, status } = data;

    const request = await LaundryRequest.findByPk(requestId);
    if (!request) return;

    // Only the assigned provider may advance the status.
    if (request.providerId !== userId) {
      socket.emit('request:error', { requestId, error: 'Access denied.' });
      return;
    }

    if (!isValidTransition(request.status, status)) {
      socket.emit('request:error', {
        requestId,
        error: `Cannot transition from '${request.status}' to '${status}'`,
        allowedTransitions: allowedTransitions(request.status),
      });
      return;
    }

    await request.update({ status });
    // Emit the full updated request so the frontend can update its cache directly.
    // Event name matches the frontend 'requestStatusUpdate' listener in useRequestRealtime.ts.
    io.emit('requestStatusUpdate', { request });
  });

  socket.on('disconnect', async () => {
    connectedUsers.delete(userId);
    await User.update({ isOnline: false }, { where: { id: userId } });
    io.emit('user:status', { userId, isOnline: false });
    if (!isProduction) {
      console.info(`User ${userId} disconnected`);
    }
  });
});

// Database sync and server start
async function startServer() {
  try {
    await sequelize.authenticate();
    console.info('Database connection established successfully.');

    // Sync Sequelize models (non-auth tables only — Better Auth manages its own tables)
    await sequelize.sync(isProduction ? {} : { alter: true });
    console.info('Database models synchronized.');

    server.listen(PORT, () => {
      console.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
}

startServer();
