require('dotenv').config();
const sequelize = require('../config/database');

// Import all models to ensure associations are set up
require('../models/User');
require('../models/LaundryRequest');
require('../models/Message');
require('../models/Payment');
require('../models/Service');
require('../models/Notification');

// Global test timeout - increase for database operations
jest.setTimeout(60000);

// Track if database has been synced
let dbSynced = false;

beforeAll(async () => {
    // Only sync once per test run
    if (!dbSynced) {
        // Disable Sequelize logging during tests
        sequelize.options.logging = false;
        await sequelize.sync({ force: true });
        dbSynced = true;
    }
});

afterAll(async () => {
    // Close database connection after all tests complete
    await sequelize.close();
});

// Helper to clean up tables between tests
global.cleanupDatabase = async () => {
    const Payment = require('../models/Payment');
    const Service = require('../models/Service');
    const Notification = require('../models/Notification');
    const LaundryRequest = require('../models/LaundryRequest');
    const Message = require('../models/Message');
    const User = require('../models/User');

    await Payment.destroy({ where: {}, force: true });
    await Service.destroy({ where: {}, force: true });
    await Notification.destroy({ where: {}, force: true });
    await Message.destroy({ where: {}, force: true });
    await LaundryRequest.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
};
