import express from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import { requireAuth, checkUserType } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  updateProfileSchema,
  updateLocationSchema,
  updateAvailabilitySchema,
  updateScheduleSchema,
} from '../validators/userSchemas.js';

const router = express.Router();

// Get nearby providers
router.get('/nearby-providers', requireAuth, async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query; // radius in kilometres

    const providers = await User.findAll({
      where: {
        userType: 'provider',
        isOnline: true,
        latitude: {
          [Op.between]: [latitude - radius / 111.32, latitude + radius / 111.32],
        },
        longitude: {
          [Op.between]: [
            longitude - radius / (111.32 * Math.cos((latitude * Math.PI) / 180)),
            longitude + radius / (111.32 * Math.cos((latitude * Math.PI) / 180)),
          ],
        },
      },
      attributes: { exclude: ['password'] },
    });

    res.json(providers);
  } catch (error) {
    next(error);
  }
});

// Update user location
router.patch('/location', requireAuth, validate(updateLocationSchema), async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    const user = await User.findByPk(req.user.id);
    await user.update({ latitude, longitude });

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch('/profile', requireAuth, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { fullName, phoneNumber } = req.body;

    const user = await User.findByPk(req.user.id);
    await user.update({ name: fullName, phoneNumber });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.name,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get provider profile (for customers)
router.get('/provider/:id', requireAuth, checkUserType('customer'), async (req, res, next) => {
  try {
    const provider = await User.findOne({
      where: { id: req.params.id, userType: 'provider' },
      attributes: { exclude: ['password'] },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json(provider);
  } catch (error) {
    next(error);
  }
});

// Toggle provider availability (online/offline)
router.patch('/availability', requireAuth, checkUserType('provider'), validate(updateAvailabilitySchema), async (req, res, next) => {
  try {
    const { isOnline } = req.body;

    const user = await User.findByPk(req.user.id);
    await user.update({ isOnline });

    res.json({ message: `You are now ${isOnline ? 'online' : 'offline'}`, isOnline });
  } catch (error) {
    next(error);
  }
});

// Set provider working hours/schedule
router.post('/schedule', requireAuth, checkUserType('provider'), validate(updateScheduleSchema), async (req, res, next) => {
  try {
    const { schedule } = req.body;

    const user = await User.findByPk(req.user.id);
    await user.update({ schedule: JSON.stringify(schedule) });

    res.json({ message: 'Schedule updated successfully', schedule });
  } catch (error) {
    next(error);
  }
});

// Get provider schedule
router.get('/provider/:id/schedule', requireAuth, async (req, res, next) => {
  try {
    const provider = await User.findOne({
      where: { id: req.params.id, userType: 'provider' },
      attributes: ['id', 'name', 'schedule', 'isOnline'],
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json(provider);
  } catch (error) {
    next(error);
  }
});

export default router;