const request = require('supertest');
const app = require('./app');
const User = require('../models/User');
const LaundryRequest = require('../models/LaundryRequest');
const Payment = require('../models/Payment');

// Mock axios for Paystack API calls
jest.mock('axios');
const axios = require('axios');

describe('Payments Routes', () => {
    let customerToken;
    let customerId;
    let requestId;

    const customerUser = {
        email: 'customer@example.com',
        password: 'password123',
        fullName: 'Test Customer',
        phoneNumber: '+2348012345678',
        userType: 'customer'
    };

    const testRequest = {
        pickupAddress: '123 Lagos Street, Victoria Island',
        deliveryAddress: '456 Ikeja Road, Lagos',
        pickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        items: [{ type: 'shirt', quantity: 5, price: 500 }],
        totalAmount: 2500,
        notes: 'Test order'
    };

    beforeEach(async () => {
        await Payment.destroy({ where: {} });
        await LaundryRequest.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Create customer
        const customerRes = await request(app)
            .post('/api/auth/register')
            .send(customerUser);
        customerToken = customerRes.body.token;
        customerId = customerRes.body.user.id;

        // Create a laundry request
        const reqRes = await request(app)
            .post('/api/requests')
            .set('Authorization', `Bearer ${customerToken}`)
            .send(testRequest);
        requestId = reqRes.body.id;
    });

    describe('POST /api/payments/initialize', () => {
        it('should initialize payment successfully', async () => {
            // Mock Paystack response
            axios.post.mockResolvedValueOnce({
                data: {
                    status: true,
                    data: {
                        authorization_url: 'https://checkout.paystack.com/test123',
                        access_code: 'test_access_code',
                        reference: 'test_reference'
                    }
                }
            });

            const res = await request(app)
                .post('/api/payments/initialize')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    requestId,
                    amount: 2500,
                    email: customerUser.email,
                    callbackUrl: 'https://example.com/callback'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data).toHaveProperty('authorizationUrl');
            expect(res.body.data).toHaveProperty('reference');
        });

        it('should fail for non-existent request', async () => {
            const res = await request(app)
                .post('/api/payments/initialize')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    requestId: '00000000-0000-0000-0000-000000000000',
                    amount: 2500,
                    email: customerUser.email,
                    callbackUrl: 'https://example.com/callback'
                });

            expect(res.statusCode).toBe(404);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/payments/initialize')
                .send({
                    requestId,
                    amount: 2500,
                    email: customerUser.email
                });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/payments/verify/:reference', () => {
        let paymentReference;

        beforeEach(async () => {
            // Create a payment
            const payment = await Payment.create({
                requestId,
                userId: customerId,
                amount: 2500,
                reference: `LB_${Date.now()}_test123`,
                status: 'pending'
            });
            paymentReference = payment.reference;
        });

        it('should verify successful payment', async () => {
            // Mock Paystack verification response
            axios.get.mockResolvedValueOnce({
                data: {
                    status: true,
                    data: {
                        status: 'success',
                        reference: paymentReference,
                        channel: 'card',
                        paid_at: new Date().toISOString()
                    }
                }
            });

            const res = await request(app)
                .get(`/api/payments/verify/${paymentReference}`)
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.paymentStatus).toBe('success');
        });

        it('should return 404 for non-existent payment', async () => {
            const res = await request(app)
                .get('/api/payments/verify/nonexistent_reference')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('GET /api/payments/history', () => {
        beforeEach(async () => {
            // Create some payments
            await Payment.bulkCreate([
                {
                    requestId,
                    userId: customerId,
                    amount: 2500,
                    reference: `LB_${Date.now()}_hist1`,
                    status: 'success'
                },
                {
                    requestId,
                    userId: customerId,
                    amount: 3000,
                    reference: `LB_${Date.now()}_hist2`,
                    status: 'pending'
                }
            ]);
        });

        it('should get payment history', async () => {
            const res = await request(app)
                .get('/api/payments/history')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
        });
    });

    describe('POST /api/payments/webhook', () => {
        let paymentReference;

        beforeEach(async () => {
            const payment = await Payment.create({
                requestId,
                userId: customerId,
                amount: 2500,
                reference: `LB_${Date.now()}_webhook`,
                status: 'pending'
            });
            paymentReference = payment.reference;
        });

        it('should reject invalid webhook signature', async () => {
            const res = await request(app)
                .post('/api/payments/webhook')
                .set('x-paystack-signature', 'invalid_signature')
                .send({
                    event: 'charge.success',
                    data: { reference: paymentReference }
                });

            expect(res.statusCode).toBe(401);
        });
    });
});
