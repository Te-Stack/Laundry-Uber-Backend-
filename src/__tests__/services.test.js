const request = require('supertest');
const app = require('./app');
const User = require('../models/User');
const Service = require('../models/Service');

describe('Services Routes', () => {
    let providerToken;
    let customerToken;
    let providerId;

    const providerUser = {
        email: 'provider@example.com',
        password: 'password123',
        fullName: 'Test Provider',
        phoneNumber: '+2348012345678',
        userType: 'provider'
    };

    const customerUser = {
        email: 'customer@example.com',
        password: 'password123',
        fullName: 'Test Customer',
        phoneNumber: '+2348087654321',
        userType: 'customer'
    };

    const testService = {
        name: 'Wash & Fold',
        description: 'Standard washing and folding service',
        basePrice: 500,
        unit: 'per_kg',
        estimatedDuration: 24,
        category: 'washing'
    };

    beforeEach(async () => {
        await Service.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Create provider
        const providerRes = await request(app)
            .post('/api/auth/register')
            .send(providerUser);
        providerToken = providerRes.body.token;
        providerId = providerRes.body.user.id;

        // Create customer
        const customerRes = await request(app)
            .post('/api/auth/register')
            .send(customerUser);
        customerToken = customerRes.body.token;
    });

    describe('GET /api/services', () => {
        it('should get all services (public endpoint)', async () => {
            // Create a service first
            await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${providerToken}`)
                .send(testService);

            const res = await request(app).get('/api/services');

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('should filter services by category', async () => {
            await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${providerToken}`)
                .send(testService);

            const res = await request(app)
                .get('/api/services')
                .query({ category: 'washing' });

            expect(res.statusCode).toBe(200);
            expect(res.body.every(s => s.category === 'washing')).toBe(true);
        });
    });

    describe('POST /api/services', () => {
        it('should allow provider to create a service', async () => {
            const res = await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${providerToken}`)
                .send(testService);

            expect(res.statusCode).toBe(201);
            expect(res.body.name).toBe(testService.name);
            expect(parseFloat(res.body.basePrice)).toBe(testService.basePrice);
            expect(res.body.providerId).toBe(providerId);
        });

        it('should not allow customer to create a service', async () => {
            const res = await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(testService);

            expect(res.statusCode).toBe(403);
            expect(res.body.error).toBe('Access denied. Insufficient permissions.');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/services')
                .send(testService);

            expect(res.statusCode).toBe(401);
        });
    });

    describe('PATCH /api/services/:id', () => {
        let serviceId;

        beforeEach(async () => {
            const createRes = await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${providerToken}`)
                .send(testService);
            serviceId = createRes.body.id;
        });

        it('should allow provider to update their service', async () => {
            const res = await request(app)
                .patch(`/api/services/${serviceId}`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ basePrice: 750 });

            expect(res.statusCode).toBe(200);
            expect(parseFloat(res.body.basePrice)).toBe(750);
        });

        it('should not allow updating non-existent service', async () => {
            const res = await request(app)
                .patch('/api/services/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ basePrice: 750 });

            expect(res.statusCode).toBe(404);
        });
    });

    describe('DELETE /api/services/:id', () => {
        let serviceId;

        beforeEach(async () => {
            const createRes = await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${providerToken}`)
                .send(testService);
            serviceId = createRes.body.id;
        });

        it('should allow provider to delete their service', async () => {
            const res = await request(app)
                .delete(`/api/services/${serviceId}`)
                .set('Authorization', `Bearer ${providerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Service deleted successfully');
        });
    });
});
