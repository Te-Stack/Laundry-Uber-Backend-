import express from 'express';
import { Op } from 'sequelize';
import LaundryRequest from '../models/LaundryRequest.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { requireAuth, checkUserType } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createRequestSchema,
  updateStatusSchema,
  rateRequestSchema,
} from '../validators/requestSchemas.js';
import {
  isValidTransition,
  allowedTransitions,
} from '../constants/statusTransitions.js';

const router = express.Router();

const STATUS_NOTIFICATION = {
  picked_up:        { title: 'Order Picked Up',     message: 'Your laundry has been picked up.' },
  washing:          { title: 'Washing in Progress', message: 'Your laundry is being washed.' },
  ready:            { title: 'Order Ready',         message: 'Your laundry is ready for delivery.' },
  out_for_delivery: { title: 'Out for Delivery',    message: 'Your laundry is on its way.' },
  delivered:        { title: 'Order Delivered',     message: 'Your laundry has been delivered.' },
};

// Create new laundry request (customers only)
router.post('/', requireAuth, checkUserType('customer'), validate(createRequestSchema), async (req, res, next) => {
  try {
    const { pickupAddress, deliveryAddress, pickupTime, items, totalAmount, notes } = req.body;

    const request = await LaundryRequest.create({
      customerId: req.user.id,
      pickupAddress,
      deliveryAddress,
      pickupTime,
      items,
      totalAmount,
      notes,
    });

    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

// Get all requests for a provider
router.get('/provider', requireAuth, checkUserType('provider'), async (req, res, next) => {
  try {
    const requests = await LaundryRequest.findAll({
      where: { providerId: req.user.id },
      include: [{ model: User, as: 'customer', attributes: ['id', 'name', 'phoneNumber'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Get all requests for a customer
router.get('/customer', requireAuth, checkUserType('customer'), async (req, res, next) => {
  try {
    const requests = await LaundryRequest.findAll({
      where: { customerId: req.user.id },
      include: [{ model: User, as: 'provider', attributes: ['id', 'name', 'phoneNumber'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Get all pending requests (for providers to browse)
router.get('/pending', requireAuth, checkUserType('provider'), async (req, res, next) => {
  try {
    const requests = await LaundryRequest.findAll({
      where: { status: 'pending', providerId: null },
      include: [{ model: User, as: 'customer', attributes: ['id', 'name', 'phoneNumber'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Accept a request (providers only)
router.patch('/:id/accept', requireAuth, checkUserType('provider'), async (req, res, next) => {
  try {
    const request = await LaundryRequest.findOne({
      where: { id: req.params.id, status: 'pending' },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    await request.update({ providerId: req.user.id, status: 'accepted' });
    res.json(request);
  } catch (error) {
    next(error);
  }
});

// Decline a request (providers only)
router.patch('/:id/decline', requireAuth, checkUserType('provider'), async (req, res, next) => {
  try {
    const request = await LaundryRequest.findOne({
      where: { id: req.params.id, status: 'pending' },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    await request.update({ status: 'declined' });
    res.json(request);
  } catch (error) {
    next(error);
  }
});

// Update request status (providers only)
router.patch('/:id/status', requireAuth, checkUserType('provider'), validate(updateStatusSchema), async (req, res, next) => {
  try {
    const { status } = req.body;

    const request = await LaundryRequest.findOne({
      where: { id: req.params.id, providerId: req.user.id },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (!isValidTransition(request.status, status)) {
      return res.status(400).json({
        error: `Cannot transition from '${request.status}' to '${status}'`,
        allowedTransitions: allowedTransitions(request.status),
      });
    }

    await request.update({ status });

    const notif = STATUS_NOTIFICATION[status];
    await Notification.create({
      userId: request.customerId,
      title: notif.title,
      message: notif.message,
      type: 'order',
      metadata: { requestId: request.id, status },
    });

    res.json(request);
  } catch (error) {
    next(error);
  }
});

// Rate and review a request (customers only)
router.patch('/:id/rate', requireAuth, checkUserType('customer'), validate(rateRequestSchema), async (req, res, next) => {
  try {
    const { rating, review } = req.body;
    const request = await LaundryRequest.findOne({
      where: { id: req.params.id, customerId: req.user.id, status: 'delivered' },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or not delivered' });
    }

    await request.update({ rating, review });

    // Update provider's average rating
    const provider = await User.findByPk(request.providerId);
    const providerRequests = await LaundryRequest.findAll({
      where: { providerId: request.providerId, rating: { [Op.not]: null } },
    });

    const newTotalRatings = providerRequests.length;
    const newAverageRating =
      providerRequests.reduce((acc, r) => acc + r.rating, 0) / newTotalRatings;

    await provider.update({ rating: newAverageRating, totalRatings: newTotalRatings });

    res.json(request);
  } catch (error) {
    next(error);
  }
});

export default router;