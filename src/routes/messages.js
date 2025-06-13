const express = require('express');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get conversation history between two users
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          {
            senderId: req.user.id,
            receiverId: req.params.userId
          },
          {
            senderId: req.params.userId,
            receiverId: req.user.id
          }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get messages for a specific request
router.get('/request/:requestId', auth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: {
        requestId: req.params.requestId
      },
      order: [['createdAt', 'ASC']]
    });

    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark messages as read
router.patch('/read', auth, async (req, res) => {
  try {
    const { messageIds } = req.body;

    await Message.update(
      { isRead: true },
      {
        where: {
          id: {
            [Op.in]: messageIds
          },
          receiverId: req.user.id
        }
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.count({
      where: {
        receiverId: req.user.id,
        isRead: false
      }
    });

    res.json({ count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 