import Joi from 'joi';

// ─── Services ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['washing', 'dry_cleaning', 'ironing', 'folding', 'special'];
const UNITS      = ['per_kg', 'per_item', 'flat_rate'];

export const createServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(500).allow('', null).optional(),
  basePrice: Joi.number().min(0).required(),
  unit: Joi.string().valid(...UNITS).required(),
  estimatedDuration: Joi.number().integer().min(1).optional(),
  category: Joi.string().valid(...CATEGORIES).required(),
});

export const updateServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(500).allow('', null).optional(),
  basePrice: Joi.number().min(0).optional(),
  unit: Joi.string().valid(...UNITS).optional(),
  estimatedDuration: Joi.number().integer().min(1).optional(),
  category: Joi.string().valid(...CATEGORIES).optional(),
  isActive: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided.',
});
