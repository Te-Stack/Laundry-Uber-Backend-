import express from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import { requireAuth, checkUserType } from '../middleware/auth.js';

const router = express.Router();

// Get nearby providers
router.get('/nearby-providers', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query; // radius in kilometers

    const providers = await User.findAll({
      where: {
        userType: 'provider',
        isOnline: true,
        latitude: {
          [Op.between]: [latitude - radius / 111.32, latitude + radius / 111.32]
        },
        longitude: {
          [Op.between]: [longitude - radius / (111.32 * Math.cos(latitude * Math.PI / 180)),
          longitude + radius / (111.32 * Math.cos(latitude * Math.PI / 180))]
        }
      },
      attributes: { exclude: ['password'] }
    });

    res.json(providers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user location
router.patch('/location', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const user = await User.findByPk(req.user.id);
    await user.update({
      latitude,
      longitude
    });

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { fullName, phoneNumber } = req.body;

    const user = await User.findByPk(req.user.id);
    await user.update({
      name: fullName,
      phoneNumber
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.name,
        phoneNumber: user.phoneNumber,
        userType: user.userType
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get provider profile (for customers)
router.get('/provider/:id', requireAuth, checkUserType('customer'), async (req, res) => {
  try {
    const provider = await User.findOne({
      where: {
        id: req.params.id,
        userType: 'provider'
      },
      attributes: { exclude: ['password'] }
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json(provider);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Toggle provider availability (online/offline)
router.patch('/availability', requireAuth, checkUserType('provider'), async (req, res) => {
  try {
    const { isOnline } = req.body;

    const user = await User.findByPk(req.user.id);
    await user.update({ isOnline });

    res.json({
      message: `You are now ${isOnline ? 'online' : 'offline'}`,
      isOnline
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Set provider working hours/schedule
router.post('/schedule', requireAuth, checkUserType('provider'), async (req, res) => {
  try {
    const { schedule } = req.body;
    // schedule format: { monday: { start: "09:00", end: "18:00" }, ... }

    const user = await User.findByPk(req.user.id);
    await user.update({ schedule: JSON.stringify(schedule) });

    res.json({
      message: 'Schedule updated successfully',
      schedule
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get provider schedule
router.get('/provider/:id/schedule', requireAuth, async (req, res) => {
  try {
    const provider = await User.findOne({
      where: {
        id: req.params.id,
        userType: 'provider'
      },
      attributes: ['id', 'name', 'schedule', 'isOnline']
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json(provider);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;