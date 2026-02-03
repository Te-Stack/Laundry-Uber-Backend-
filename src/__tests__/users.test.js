const request = require('supertest');
const app = require('./app');
const User = require('../models/User');

describe('Users Routes', () => {
    let customerToken;
    let providerToken;
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

    beforeEach(async () => {
        await User.destroy({ where: {} });

        // Create customer
        const customerRes = await request(app)
            .post('/api/auth/register')
            .send(customerUser);
        customerToken = customerRes.body.token;

        // Create provider with location
        const providerRes = await request(app)
            .post('/api/auth/register')
            .send(providerUser);
        providerToken = providerRes.body.token;
        providerId = providerRes.body.user.id;

        // Set provider location and online status
        await User.update(
            { latitude: 6.5244, longitude: 3.3792, isOnline: true },
            { where: { id: providerId } }
        );
    });

    describe('GET /api/users/nearby-providers', () => {
        it('should get nearby providers', async () => {
            const res = await request(app)
                .get('/api/users/nearby-providers')
                .query({ latitude: 6.5244, longitude: 3.3792, radius: 5 })
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/users/nearby-providers')
                .query({ latitude: 6.5244, longitude: 3.3792 });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('PATCH /api/users/location', () => {
        it('should update user location', async () => {
            const res = await request(app)
                .patch('/api/users/location')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ latitude: 6.4541, longitude: 3.3947 });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Location updated successfully');
        });
    });

    describe('PATCH /api/users/profile', () => {
        it('should update user profile', async () => {
            const res = await request(app)
                .patch('/api/users/profile')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    fullName: 'Updated Name',
                    phoneNumber: '+2349012345678'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Profile updated successfully');
            expect(res.body.user.fullName).toBe('Updated Name');
        });
    });

    describe('GET /api/users/provider/:id', () => {
        it('should get provider profile (customers only)', async () => {
            const res = await request(app)
                .get(`/api/users/provider/${providerId}`)
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(providerId);
            expect(res.body.userType).toBe('provider');
            expect(res.body).not.toHaveProperty('password');
        });

        it('should return 404 for non-existent provider', async () => {
            const res = await request(app)
                .get('/api/users/provider/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('PATCH /api/users/availability', () => {
        it('should toggle provider availability', async () => {
            const res = await request(app)
                .patch('/api/users/availability')
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ isOnline: false });

            expect(res.statusCode).toBe(200);
            expect(res.body.isOnline).toBe(false);
            expect(res.body.message).toBe('You are now offline');
        });

        it('should not allow customers to toggle availability', async () => {
            const res = await request(app)
                .patch('/api/users/availability')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ isOnline: true });

            expect(res.statusCode).toBe(403);
        });
    });

    describe('POST /api/users/schedule', () => {
        it('should set provider schedule', async () => {
            const schedule = {
                monday: { start: '09:00', end: '18:00' },
                tuesday: { start: '09:00', end: '18:00' },
                wednesday: { start: '09:00', end: '18:00' }
            };

            const res = await request(app)
                .post('/api/users/schedule')
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ schedule });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Schedule updated successfully');
            expect(res.body.schedule).toEqual(schedule);
        });
    });

    describe('GET /api/users/provider/:id/schedule', () => {
        it('should get provider schedule', async () => {
            // Set schedule first
            await request(app)
                .post('/api/users/schedule')
                .set('Authorization', `Bearer ${providerToken}`)
                .send({
                    schedule: { monday: { start: '09:00', end: '18:00' } }
                });

            const res = await request(app)
                .get(`/api/users/provider/${providerId}/schedule`)
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('schedule');
            expect(res.body).toHaveProperty('isOnline');
        });
    });
});
