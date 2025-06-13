require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const sequelize = require('./config/database');

// Import models
const User = require('./models/User');
const LaundryRequest = require('./models/LaundryRequest');
const Message = require('./models/Message');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const requestRoutes = require('./routes/requests');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('user:connect', async (userId) => {
    connectedUsers.set(userId, socket.id);
    await User.update({ isOnline: true }, { where: { id: userId } });
    io.emit('user:status', { userId, isOnline: true });
  });

  socket.on('user:disconnect', async (userId) => {
    connectedUsers.delete(userId);
    await User.update({ isOnline: false }, { where: { id: userId } });
    io.emit('user:status', { userId, isOnline: false });
  });

  socket.on('message:send', async (data) => {
    const { senderId, receiverId, content, requestId } = data;
    const message = await Message.create({
      senderId,
      receiverId,
      content,
      requestId
    });
    
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:receive', message);
    }
  });

  socket.on('request:update', async (data) => {
    const { requestId, status } = data;
    const request = await LaundryRequest.findByPk(requestId);
    if (request) {
      await request.update({ status });
      io.emit('request:status', { requestId, status });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Database sync and server start
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized.');

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
}

startServer(); 