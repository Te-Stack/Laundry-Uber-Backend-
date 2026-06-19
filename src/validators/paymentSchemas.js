import Joi from 'joi';

// ─── Payments ──────────────────────────────────────────────────────────────────

export const initializePaymentSchema = Joi.object({
  requestId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  email: Joi.string().email().required(),
  callbackUrl: Joi.string().uri().required(),
});
