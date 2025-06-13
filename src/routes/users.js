const express = require('express');
const { Op } = require('sequelize');
const User = require('../models/User');
const { auth, checkUserType } = require('../middleware/auth');

const router = express.Router();

// Get nearby providers
router.get('/nearby-providers', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query; // radius in kilometers

    const providers = await User.findAll({
      where: {
        userType: 'provider',
        isOnline: true,
        latitude: {
          [Op.between]: [latitude - radius/111.32, latitude + radius/111.32]
        },
        longitude: {
          [Op.between]: [longitude - radius/(111.32 * Math.cos(latitude * Math.PI/180)), 
                        longitude + radius/(111.32 * Math.cos(latitude * Math.PI/180))]
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
router.patch('/location', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    await req.user.update({
      latitude,
      longitude
    });

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const { fullName, phoneNumber } = req.body;
    
    await req.user.update({
      fullName,
      phoneNumber
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        phoneNumber: req.user.phoneNumber,
        userType: req.user.userType
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get provider profile (for customers)
router.get('/provider/:id', auth, checkUserType('customer'), async (req, res) => {
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

module.exports = router; 