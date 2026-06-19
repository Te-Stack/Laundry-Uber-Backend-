import express from 'express';
import { Op } from 'sequelize';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all conversations for the current user
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    // Get all messages involving the current user
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id },
          { receiverId: req.user.id }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    // Group by the other user
    const conversationMap = new Map();
    for (const msg of messages) {
      const otherUserId = msg.senderId === req.user.id ? msg.receiverId : msg.senderId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, msg);
      }
    }

    // Fetch other user details
    const conversations = await Promise.all(
      Array.from(conversationMap.entries()).map(async ([otherUserId, lastMessage]) => {
        const otherUser = await User.findByPk(otherUserId, {
          attributes: ['id', 'name', 'email', 'userType', 'isOnline']
        });
        const unreadCount = await Message.count({
          where: {
            senderId: otherUserId,
            receiverId: req.user.id,
            isRead: false
          }
        });
        return { otherUser, lastMessage, unreadCount };
      })
    );

    res.json(conversations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get messages with a specific user
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: req.params.userId },
          { senderId: req.params.userId, receiverId: req.user.id }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'userType'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'userType'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Mark received messages as read
    await Message.update(
      { isRead: true },
      {
        where: {
          senderId: req.params.userId,
          receiverId: req.user.id,
          isRead: false
        }
      }
    );

    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Send a message
router.post('/', requireAuth, async (req, res) => {
  try {
    const { receiverId, content, requestId } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'receiverId and content are required' });
    }

    const message = await Message.create({
      senderId: req.user.id,
      receiverId,
      content,
      requestId: requestId || null
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'userType'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'userType'] }
      ]
    });

    res.status(201).json(fullMessage);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get unread message count
router.get('/unread/count', requireAuth, async (req, res) => {
  try {
    const count = await Message.count({
      where: { receiverId: req.user.id, isRead: false }
    });
    res.json({ count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
