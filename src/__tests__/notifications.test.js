const request = require('supertest');
const app = require('./app');
const User = require('../models/User');
const Notification = require('../models/Notification');

describe('Notifications Routes', () => {
    let authToken;
    let userId;

    const testUser = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        phoneNumber: '+2348012345678',
        userType: 'customer'
    };

    beforeEach(async () => {
        await Notification.destroy({ where: {} });
        await User.destroy({ where: {} });

        const registerRes = await request(app)
            .post('/api/auth/register')
            .send(testUser);
        authToken = registerRes.body.token;
        userId = registerRes.body.user.id;

        // Create some test notifications
        await Notification.bulkCreate([
            {
                userId,
                title: 'Order Accepted',
                message: 'Your laundry order has been accepted',
                type: 'order',
                isRead: false
            },
            {
                userId,
                title: 'Payment Successful',
                message: 'Your payment of ₦2000 was successful',
                type: 'payment',
                isRead: false
            },
            {
                userId,
                title: 'Old Notification',
                message: 'This is an old notification',
                type: 'system',
                isRead: true
            }
        ]);
    });

    describe('GET /api/notifications', () => {
        it('should get all notifications for user', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(3);
        });

        it('should filter unread notifications only', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .query({ unreadOnly: 'true' })
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(2);
            expect(res.body.every(n => n.isRead === false)).toBe(true);
        });

        it('should filter by notification type', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .query({ type: 'payment' })
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.every(n => n.type === 'payment')).toBe(true);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/notifications');

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/notifications/unread/count', () => {
        it('should get unread notification count', async () => {
            const res = await request(app)
                .get('/api/notifications/unread/count')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('count');
            expect(res.body.count).toBe(2);
        });
    });

    describe('PATCH /api/notifications/:id/read', () => {
        it('should mark notification as read', async () => {
            const notifications = await Notification.findAll({
                where: { userId, isRead: false }
            });
            const notificationId = notifications[0].id;

            const res = await request(app)
                .patch(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.isRead).toBe(true);
        });

        it('should return 404 for non-existent notification', async () => {
            const res = await request(app)
                .patch('/api/notifications/00000000-0000-0000-0000-000000000000/read')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('PATCH /api/notifications/read-all', () => {
        it('should mark all notifications as read', async () => {
            const res = await request(app)
                .patch('/api/notifications/read-all')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('All notifications marked as read');

            // Verify all are read
            const countRes = await request(app)
                .get('/api/notifications/unread/count')
                .set('Authorization', `Bearer ${authToken}`);

            expect(countRes.body.count).toBe(0);
        });
    });

    describe('DELETE /api/notifications/:id', () => {
        it('should delete a notification', async () => {
            const notifications = await Notification.findAll({ where: { userId } });
            const notificationId = notifications[0].id;

            const res = await request(app)
                .delete(`/api/notifications/${notificationId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Notification deleted');
        });
    });
});
