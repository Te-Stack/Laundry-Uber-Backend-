import express from 'express';
import { Op } from 'sequelize';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user's notifications
router.get('/', requireAuth, async (req, res) => {
    try {
        const { unreadOnly, type, limit = 50 } = req.query;

        const where = { userId: req.user.id };
        if (unreadOnly === 'true') where.isRead = false;
        if (type) where.type = type;

        const notifications = await Notification.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit)
        });

        res.json(notifications);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get unread count
router.get('/unread/count', requireAuth, async (req, res) => {
    try {
        const count = await Notification.count({
            where: { userId: req.user.id, isRead: false }
        });

        res.json({ count });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Mark notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notification.update({ isRead: true });
        res.json(notification);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Mark all notifications as read
router.patch('/read-all', requireAuth, async (req, res) => {
    try {
        await Notification.update(
            { isRead: true },
            { where: { userId: req.user.id, isRead: false } }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete notification
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notification.destroy();
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete all read notifications
router.delete('/clear/read', requireAuth, async (req, res) => {
    try {
        await Notification.destroy({
            where: { userId: req.user.id, isRead: true }
        });

        res.json({ message: 'Read notifications cleared' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
