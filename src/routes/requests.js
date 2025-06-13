const express = require('express');
const { Op } = require('sequelize');
const LaundryRequest = require('../models/LaundryRequest');
const User = require('../models/User');
const { auth, checkUserType } = require('../middleware/auth');

const router = express.Router();

// Create new laundry request (customers only)
router.post('/', auth, checkUserType('customer'), async (req, res) => {
  try {
    const {
      pickupAddress,
      deliveryAddress,
      pickupTime,
      items,
      totalAmount,
      notes
    } = req.body;

    const request = await LaundryRequest.create({
      customerId: req.user.id,
      pickupAddress,
      deliveryAddress,
      pickupTime,
      items,
      totalAmount,
      notes
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all requests for a provider
router.get('/provider', auth, checkUserType('provider'), async (req, res) => {
  try {
    const requests = await LaundryRequest.findAll({
      where: {
        providerId: req.user.id
      },
      include: [{
        model: User,
        as: 'customer',
        attributes: ['id', 'fullName', 'phoneNumber']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all requests for a customer
router.get('/customer', auth, checkUserType('customer'), async (req, res) => {
  try {
    const requests = await LaundryRequest.findAll({
      where: {
        customerId: req.user.id
      },
      include: [{
        model: User,
        as: 'provider',
        attributes: ['id', 'fullName', 'phoneNumber']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Accept a request (providers only)
router.patch('/:id/accept', auth, checkUserType('provider'), async (req, res) => {
  try {
    const request = await LaundryRequest.findOne({
      where: {
        id: req.params.id,
        status: 'pending'
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    await request.update({
      providerId: req.user.id,
      status: 'accepted'
    });

    res.json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Decline a request (providers only)
router.patch('/:id/decline', auth, checkUserType('provider'), async (req, res) => {
  try {
    const request = await LaundryRequest.findOne({
      where: {
        id: req.params.id,
        status: 'pending'
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    await request.update({
      status: 'declined'
    });

    res.json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update request status (providers only)
router.patch('/:id/status', auth, checkUserType('provider'), async (req, res) => {
  try {
    const { status } = req.body;
    const request = await LaundryRequest.findOne({
      where: {
        id: req.params.id,
        providerId: req.user.id
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await request.update({ status });
    res.json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Rate and review a request (customers only)
router.patch('/:id/rate', auth, checkUserType('customer'), async (req, res) => {
  try {
    const { rating, review } = req.body;
    const request = await LaundryRequest.findOne({
      where: {
        id: req.params.id,
        customerId: req.user.id,
        status: 'delivered'
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or not delivered' });
    }

    await request.update({ rating, review });

    // Update provider's average rating
    const provider = await User.findByPk(request.providerId);
    const providerRequests = await LaundryRequest.findAll({
      where: {
        providerId: request.providerId,
        rating: { [Op.not]: null }
      }
    });

    const newTotalRatings = providerRequests.length;
    const newAverageRating = providerRequests.reduce((acc, req) => acc + req.rating, 0) / newTotalRatings;

    await provider.update({
      rating: newAverageRating,
      totalRatings: newTotalRatings
    });

    res.json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 