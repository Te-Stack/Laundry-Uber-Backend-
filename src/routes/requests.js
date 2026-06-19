import express from 'express';
import { Op } from 'sequelize';
import LaundryRequest from '../models/LaundryRequest.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { requireAuth, checkUserType } from '../middleware/auth.js';

const router = express.Router();

// Valid status transitions for the provider workflow (post-acceptance)
const VALID_TRANSITIONS = {
  accepted:        ['picked_up'],
  picked_up:       ['washing'],
  washing:         ['ready'],
  ready:           ['out_for_delivery'],
  out_for_delivery: ['delivered'],
};

const STATUS_NOTIFICATION = {
  picked_up:        { title: 'Order Picked Up',       message: 'Your laundry has been picked up.' },
  washing:          { title: 'Washing in Progress',   message: 'Your laundry is being washed.' },
  ready:            { title: 'Order Ready',           message: 'Your laundry is ready for delivery.' },
  out_for_delivery: { title: 'Out for Delivery',      message: 'Your laundry is on its way.' },
  delivered:        { title: 'Order Delivered',       message: 'Your laundry has been delivered.' },
};

// Create new laundry request (customers only)
router.post('/', requireAuth, checkUserType('customer'), async (req, res) => {
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
router.get('/provider', requireAuth, checkUserType('provider'), async (req, res) => {
  try {
    const requests = await LaundryRequest.findAll({
      where: {
        providerId: req.user.id
      },
      include: [{
        model: User,
        as: 'customer',
        attributes: ['id', 'name', 'phoneNumber']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all requests for a customer
router.get('/customer', requireAuth, checkUserType('customer'), async (req, res) => {
  try {
    const requests = await LaundryRequest.findAll({
      where: {
        customerId: req.user.id
      },
      include: [{
        model: User,
        as: 'provider',
        attributes: ['id', 'name', 'phoneNumber']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all pending requests (for providers to browse)
router.get('/pending', requireAuth, checkUserType('provider'), async (req, res) => {
  try {
    const requests = await LaundryRequest.findAll({
      where: { status: 'pending', providerId: null },
      include: [{
        model: User,
        as: 'customer',
        attributes: ['id', 'name', 'phoneNumber']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Accept a request (providers only)
router.patch('/:id/accept', requireAuth, checkUserType('provider'), async (req, res) => {
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
router.patch('/:id/decline', requireAuth, checkUserType('provider'), async (req, res) => {
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
router.patch('/:id/status', requireAuth, checkUserType('provider'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const request = await LaundryRequest.findOne({
      where: {
        id: req.params.id,
        providerId: req.user.id
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const allowedNext = VALID_TRANSITIONS[request.status];
    if (!allowedNext || !allowedNext.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from '${request.status}' to '${status}'`,
        allowedTransitions: allowedNext || []
      });
    }

    await request.update({ status });

    const notif = STATUS_NOTIFICATION[status];
    await Notification.create({
      userId: request.customerId,
      title: notif.title,
      message: notif.message,
      type: 'order',
      metadata: { requestId: request.id, status }
    });

    res.json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Rate and review a request (customers only)
router.patch('/:id/rate', requireAuth, checkUserType('customer'), async (req, res) => {
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
    const newAverageRating = providerRequests.reduce((acc, r) => acc + r.rating, 0) / newTotalRatings;

    await provider.update({
      rating: newAverageRating,
      totalRatings: newTotalRatings
    });

    res.json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;