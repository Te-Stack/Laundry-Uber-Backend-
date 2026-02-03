const request = require('supertest');
const app = require('./app');
const User = require('../models/User');

describe('Auth Routes', () => {
    const testUser = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        phoneNumber: '+2348012345678',
        userType: 'customer'
    };

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('user');
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.body.user.fullName).toBe(testUser.fullName);
            expect(res.body.user.userType).toBe(testUser.userType);
            expect(res.body.user).not.toHaveProperty('password');
        });

        it('should not register user with existing email', async () => {
            // First registration
            await request(app).post('/api/auth/register').send(testUser);

            // Second registration with same email
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toBe('Email already registered');
        });

        it('should register a provider user', async () => {
            const providerUser = {
                ...testUser,
                email: 'provider@example.com',
                userType: 'provider'
            };

            const res = await request(app)
                .post('/api/auth/register')
                .send(providerUser);

            expect(res.statusCode).toBe(201);
            expect(res.body.user.userType).toBe('provider');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await User.destroy({ where: {} });
            await request(app).post('/api/auth/register').send(testUser);
        });

        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('user');
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe(testUser.email);
        });

        it('should not login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });

        it('should not login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: testUser.password
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });
    });

    describe('GET /api/auth/me', () => {
        let authToken;

        beforeEach(async () => {
            await User.destroy({ where: {} });
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send(testUser);
            authToken = registerRes.body.token;
        });

        it('should get current user with valid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.email).toBe(testUser.email);
            expect(res.body).not.toHaveProperty('password');
        });

        it('should reject request without token', async () => {
            const res = await request(app).get('/api/auth/me');

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Please authenticate.');
        });

        it('should reject request with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalidtoken123');

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Please authenticate.');
        });
    });
});
