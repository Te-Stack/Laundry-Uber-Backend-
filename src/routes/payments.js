const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const Payment = require('../models/Payment');
const LaundryRequest = require('../models/LaundryRequest');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize payment
router.post('/initialize', auth, async (req, res) => {
    try {
        const { requestId, amount, email, callbackUrl } = req.body;

        // Verify the laundry request exists
        const laundryRequest = await LaundryRequest.findOne({
            where: { id: requestId, customerId: req.user.id }
        });

        if (!laundryRequest) {
            return res.status(404).json({ error: 'Laundry request not found' });
        }

        // Generate unique reference
        const reference = `LB_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        // Create payment record
        const payment = await Payment.create({
            requestId,
            userId: req.user.id,
            amount,
            reference,
            status: 'pending'
        });

        // Initialize Paystack transaction
        const response = await axios.post(
            `${PAYSTACK_BASE_URL}/transaction/initialize`,
            {
                email,
                amount: amount * 100, // Paystack expects amount in kobo
                reference,
                callback_url: callbackUrl,
                metadata: {
                    requestId,
                    paymentId: payment.id
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            status: 'success',
            message: 'Payment initialized',
            data: {
                paymentId: payment.id,
                reference,
                authorizationUrl: response.data.data.authorization_url,
                accessCode: response.data.data.access_code
            }
        });
    } catch (error) {
        console.error('Payment initialization error:', error.response?.data || error.message);
        res.status(400).json({ error: 'Failed to initialize payment' });
    }
});

// Verify payment
router.get('/verify/:reference', auth, async (req, res) => {
    try {
        const { reference } = req.params;

        const payment = await Payment.findOne({ where: { reference } });
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Verify with Paystack
        const response = await axios.get(
            `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
                }
            }
        );

        const paystackData = response.data.data;

        if (paystackData.status === 'success') {
            await payment.update({
                status: 'success',
                paystackReference: paystackData.reference,
                paymentMethod: paystackData.channel,
                paidAt: new Date(paystackData.paid_at),
                metadata: paystackData
            });

            // Update laundry request payment status
            await LaundryRequest.update(
                { paymentStatus: 'paid' },
                { where: { id: payment.requestId } }
            );

            // Create notification
            await Notification.create({
                userId: payment.userId,
                title: 'Payment Successful',
                message: `Your payment of ₦${payment.amount} was successful.`,
                type: 'payment',
                metadata: { paymentId: payment.id }
            });
        } else {
            await payment.update({
                status: 'failed',
                metadata: paystackData
            });
        }

        res.json({
            status: 'success',
            data: {
                paymentStatus: payment.status,
                amount: payment.amount,
                reference: payment.reference
            }
        });
    } catch (error) {
        console.error('Payment verification error:', error.response?.data || error.message);
        res.status(400).json({ error: 'Failed to verify payment' });
    }
});

// Paystack webhook
router.post('/webhook', async (req, res) => {
    try {
        // Verify webhook signature
        const hash = crypto
            .createHmac('sha512', PAYSTACK_SECRET_KEY)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { event, data } = req.body;

        if (event === 'charge.success') {
            const payment = await Payment.findOne({
                where: { reference: data.reference }
            });

            if (payment && payment.status !== 'success') {
                await payment.update({
                    status: 'success',
                    paystackReference: data.reference,
                    paymentMethod: data.channel,
                    paidAt: new Date(data.paid_at),
                    metadata: data
                });

                // Update laundry request
                await LaundryRequest.update(
                    { paymentStatus: 'paid' },
                    { where: { id: payment.requestId } }
                );

                // Create notification
                await Notification.create({
                    userId: payment.userId,
                    title: 'Payment Confirmed',
                    message: `Your payment of ₦${payment.amount} has been confirmed.`,
                    type: 'payment',
                    metadata: { paymentId: payment.id }
                });
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error.message);
        res.sendStatus(500);
    }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
    try {
        const payments = await Payment.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            include: [{
                model: LaundryRequest,
                as: 'request',
                attributes: ['id', 'status', 'pickupAddress']
            }]
        });

        res.json(payments);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get single payment
router.get('/:id', auth, async (req, res) => {
    try {
        const payment = await Payment.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(payment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
