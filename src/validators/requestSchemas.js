import Joi from 'joi';

// ─── Laundry Requests ────────────────────────────────────────────────────────

export const createRequestSchema = Joi.object({
  pickupAddress: Joi.string().trim().min(5).max(500).required(),
  deliveryAddress: Joi.string().trim().min(5).max(500).required(),
  pickupTime: Joi.string().isoDate().required(),
  items: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().trim().min(1).max(100).required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
      })
    )
    .min(1)
    .required(),
  totalAmount: Joi.number().min(0).required(),
  notes: Joi.string().trim().max(1000).allow('', null).optional(),
});

export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('picked_up', 'washing', 'ready', 'out_for_delivery', 'delivered')
    .required(),
});

export const rateRequestSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  review: Joi.string().trim().max(1000).allow('', null).optional(),
});
