/**
 * Centralised Express error-handling middleware.
 * Must be mounted AFTER all routes (last app.use call in index.js).
 *
 * Handles:
 *  - Sequelize validation errors      → 400
 *  - Sequelize unique-constraint      → 409
 *  - Explicit res.status(...) errors  → forwarded as-is
 *  - Everything else                  → 500
 *
 * IMPORTANT: never send raw error.stack to clients in production.
 */

const isProduction = process.env.NODE_ENV === 'production';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message).join('; ');
    return res.status(400).json({ error: messages });
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }

  // Sequelize foreign-key constraint
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  // Operational errors that have already set a status code
  const status = err.status || err.statusCode || 500;
  const message =
    status < 500
      ? err.message || 'Bad request.'
      : isProduction
        ? 'Internal server error.'
        : (err.message || 'Internal server error.');

  if (!isProduction) {
    console.error('[errorHandler]', err);
  }

  res.status(status).json({ error: message });
};
