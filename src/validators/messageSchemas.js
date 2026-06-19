import Joi from 'joi';

// ─── Messages ──────────────────────────────────────────────────────────────────

export const sendMessageSchema = Joi.object({
  receiverId: Joi.string().min(1).required(),
  content: Joi.string().trim().min(1).max(2000).required(),
  requestId: Joi.string().uuid().allow(null, '').optional(),
});
