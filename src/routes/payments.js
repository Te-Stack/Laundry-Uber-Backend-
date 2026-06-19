import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import Payment from '../models/Payment.js';
import LaundryRequest from '../models/LaundryRequest.js';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { initializePaymentSchema } from '../validators/paymentSchemas.js';

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (process.env.NODE_ENV === 'production' && !PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY must be set in production.');
}

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * Handles a confirmed successful Paystack payment.
 * Shared between the /verify endpoint and the webhook handler to avoid duplication.
 *
 * @param {object} payment      - Payment Sequelize instance
 * @param {object} paystackData - Data object from the Paystack API response
 */
async function handlePaymentSuccess(payment, paystackData) {
  await payment.update({
    status: 'success',
    paystackReference: paystackData.reference,
    paymentMethod: paystackData.channel,
    paidAt: new Date(paystackData.paid_at),
    metadata: paystackData,
  });

  await LaundryRequest.update(
    { paymentStatus: 'paid' },
    { where: { id: payment.requestId } }
  );

  await Notification.create({
    userId: payment.userId,
    title: 'Payment Successful',
    message: `Your payment of ₦${payment.amount} was successful.`,
    type: 'payment',
    metadata: { paymentId: payment.id },
  });
}

// ─── Initialize payment ───────────────────────────────────────────────────────

router.post('/initialize', requireAuth, validate(initializePaymentSchema), async (req, res, next) => {
  try {
    const { requestId, amount, email, callbackUrl } = req.body;

    // Verify the laundry request belongs to this customer
    const laundryRequest = await LaundryRequest.findOne({
      where: { id: requestId, customerId: req.user.id },
    });

    if (!laundryRequest) {
      return res.status(404).json({ error: 'Laundry request not found' });
    }

    const reference = `LB_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const payment = await Payment.create({
      requestId,
      userId: req.user.id,
      amount,
      reference,
      status: 'pending',
    });

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount: amount * 100, // Paystack expects amount in kobo
        reference,
        callback_url: callbackUrl,
        metadata: { requestId, paymentId: payment.id },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      status: 'success',
      message: 'Payment initialized',
      data: {
        paymentId: payment.id,
        reference,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
      },
    });
  } catch (error) {
    console.error('Payment initialization error:', error.response?.data || error.message);
    next(error);
  }
});

// ─── Verify payment ───────────────────────────────────────────────────────────

router.get('/verify/:reference', requireAuth, async (req, res, next) => {
  try {
    const { reference } = req.params;

    const payment = await Payment.findOne({ where: { reference } });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    const paystackData = response.data.data;

    if (paystackData.status === 'success') {
      await handlePaymentSuccess(payment, paystackData);
    } else {
      await payment.update({ status: 'failed', metadata: paystackData });
    }

    res.json({
      status: 'success',
      data: {
        paymentStatus: payment.status,
        amount: payment.amount,
        reference: payment.reference,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    next(error);
  }
});

// ─── Paystack webhook ─────────────────────────────────────────────────────────

router.post('/webhook', async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const payment = await Payment.findOne({ where: { reference: data.reference } });

      if (payment && payment.status !== 'success') {
        await handlePaymentSuccess(payment, data);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.sendStatus(500);
  }
});

// ─── Payment history ──────────────────────────────────────────────────────────

router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const payments = await Payment.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [{
        model: LaundryRequest,
        as: 'request',
        attributes: ['id', 'status', 'pickupAddress'],
      }],
    });

    res.json(payments);
  } catch (error) {
    next(error);
  }
});

// ─── Single payment ───────────────────────────────────────────────────────────

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
});

export default router;
