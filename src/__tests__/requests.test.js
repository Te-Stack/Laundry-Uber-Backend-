const request = require('supertest');
const app = require('./app');
const User = require('../models/User');
const LaundryRequest = require('../models/LaundryRequest');

describe('Requests Routes', () => {
    let customerToken;
    let providerToken;
    let customerId;
    let providerId;

    const customerUser = {
        email: 'customer@example.com',
        password: 'password123',
        fullName: 'Test Customer',
        phoneNumber: '+2348012345678',
        userType: 'customer'
    };

    const providerUser = {
        email: 'provider@example.com',
        password: 'password123',
        fullName: 'Test Provider',
        phoneNumber: '+2348087654321',
        userType: 'provider'
    };

    const testRequest = {
        pickupAddress: '123 Lagos Street, Victoria Island',
        deliveryAddress: '456 Ikeja Road, Lagos',
        pickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        items: [
            { type: 'shirt', quantity: 5, price: 500 },
            { type: 'trousers', quantity: 3, price: 450 }
        ],
        totalAmount: 3850,
        notes: 'Please handle with care'
    };

    beforeEach(async () => {
        await LaundryRequest.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Create customer
        const customerRes = await request(app)
            .post('/api/auth/register')
            .send(customerUser);
        customerToken = customerRes.body.token;
        customerId = customerRes.body.user.id;

        // Create provider
        const providerRes = await request(app)
            .post('/api/auth/register')
            .send(providerUser);
        providerToken = providerRes.body.token;
        providerId = providerRes.body.user.id;
    });

    describe('POST /api/requests', () => {
        it('should allow customer to create a laundry request', async () => {
            const res = await request(app)
                .post('/api/requests')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(testRequest);

            expect(res.statusCode).toBe(201);
            expect(res.body.pickupAddress).toBe(testRequest.pickupAddress);
            expect(res.body.status).toBe('pending');
            expect(res.body.customerId).toBe(customerId);
        });

        it('should not allow provider to create a request', async () => {
            const res = await request(app)
                .post('/api/requests')
                .set('Authorization', `Bearer ${providerToken}`)
                .send(testRequest);

            expect(res.statusCode).toBe(403);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/requests')
                .send(testRequest);

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/requests/customer', () => {
        it('should get customer requests', async () => {
            // Create a request first
            await request(app)
                .post('/api/requests')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(testRequest);

            const res = await request(app)
                .get('/api/requests/customer')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
        });
    });

    describe('GET /api/requests/provider', () => {
        it('should get provider requests', async () => {
            // Create and accept a request
            const createRes = await request(app)
                .post('/api/requests')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(testRequest);

            await request(app)
                .patch(`/api/requests/${createRes.body.id}/accept`)
                .set('Authorization', `Bearer ${providerToken}`);

            const res = await request(app)
                .get('/api/requests/provider')
                .set('Authorization', `Bearer ${providerToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('PATCH /api/requests/:id/accept', () => {
        let requestId;

        beforeEach(async () => {
            const createRes = await request(app)
                .post('/api/requests')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(testRequest);
            requestId = createRes.body.id;
        });

        it('should allow provider to accept a request', async () => {
            const res = await request(app)
                .patch(`/api/requests/${requestId}/accept`)
                .set('Authorization', `Bearer ${providerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('accepted');
            expect(res.body.providerId).toBe(providerId);
        });

        it('should not allow customer to accept a request', async () => {
            const res = await request(app)
                .patch(`/api/requests/${requestId}/accept`)
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.statusCode).toBe(403);
        });
    });

    describe('PATCH /api/requests/:id/decline', () => {
        let requestId;

        beforeEach(async () => {
            const createRes = await request(app)
                .post('/api/requests')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(testRequest);
            requestId = createRes.body.id;
        });

        it('should allow provider to decline a request', async () => {
            const res = await request(app)
                .patch(`/api/requests/${requestId}/decline`)
                .set('Authorization', `Bearer ${providerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('declined');
        });
    });

    describe('PATCH /api/requests/:id/status', () => {
        let requestId;

        beforeEach(async () => {
            const createRes = await request(app)
                .post('/api/requests')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(testRequest);
            requestId = createRes.body.id;

            // Accept the request first
            await request(app)
                .patch(`/api/requests/${requestId}/accept`)
                .set('Authorization', `Bearer ${providerToken}`);
        });

        it('should allow provider to update request status', async () => {
            const res = await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ status: 'picked_up' });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('picked_up');
        });

        it('should update through status flow', async () => {
            // picked_up -> washing -> delivered
            await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ status: 'picked_up' });

            await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ status: 'washing' });

            const res = await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ status: 'delivered' });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('delivered');
        });

        it('should reject an invalid status value', async () => {
            const res = await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ status: 'unknown_state' });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should reject skipping states (accepted -> delivered)', async () => {
            const res = await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ status: 'delivered' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/Cannot transition from 'accepted' to 'delivered'/);
            expect(res.body.allowedTransitions).toEqual(['picked_up']);
        });

        it('should reject going back to a previous state', async () => {
            await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ status: 'picked_up' });

            const res = await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ status: 'accepted' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/Cannot transition from 'picked_up' to 'accepted'/);
        });

        it('should require a status field', async () => {
            const res = await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('PATCH /api/requests/:id/rate', () => {
        let requestId;

        beforeEach(async () => {
            const createRes = await request(app)
                .post('/api/requests')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(testRequest);
            requestId = createRes.body.id;

            // Complete the request flow
            await request(app)
                .patch(`/api/requests/${requestId}/accept`)
                .set('Authorization', `Bearer ${providerToken}`);

            await request(app)
                .patch(`/api/requests/${requestId}/status`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ status: 'delivered' });
        });

        it('should allow customer to rate a delivered request', async () => {
            const res = await request(app)
                .patch(`/api/requests/${requestId}/rate`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ rating: 5, review: 'Excellent service!' });

            expect(res.statusCode).toBe(200);
            expect(res.body.rating).toBe(5);
            expect(res.body.review).toBe('Excellent service!');
        });

        it('should not allow rating non-delivered request', async () => {
            // Create a new pending request
            const newReqRes = await request(app)
                .post('/api/requests')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(testRequest);

            const res = await request(app)
                .patch(`/api/requests/${newReqRes.body.id}/rate`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ rating: 5, review: 'Great!' });

            expect(res.statusCode).toBe(404);
        });
    });
});
