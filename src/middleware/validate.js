/**
 * Generic Joi validation middleware factory.
 * Validates req.body against the provided schema.
 * Returns 400 with a user-friendly message on failure.
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema to validate against
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join('; ');
    return res.status(400).json({ error: message });
  }
  next();
};
