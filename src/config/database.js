const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE_URL ||
    {
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      // port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'laundryber',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
  {
    dialectOptions: process.env.DATABASE_URL
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {}
  }
);

module.exports = sequelize; 