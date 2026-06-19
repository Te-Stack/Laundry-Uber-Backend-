import Joi from 'joi';

// ─── Users ────────────────────────────────────────────────────────────────────

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).optional(),
  phoneNumber: Joi.string()
    .trim()
    .pattern(/^\+?[\d\s\-()]{7,20}$/)
    .optional()
    .messages({
      'string.pattern.base': 'phoneNumber must be a valid phone number.',
    }),
}).min(1).messages({
  'object.min': 'At least one field (fullName or phoneNumber) is required.',
});

export const updateLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
});

export const updateAvailabilitySchema = Joi.object({
  isOnline: Joi.boolean().required(),
});

const dayScheduleSchema = Joi.object({
  start: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({ 'string.pattern.base': 'start must be in HH:mm format.' }),
  end: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({ 'string.pattern.base': 'end must be in HH:mm format.' }),
}).allow(null);

export const updateScheduleSchema = Joi.object({
  schedule: Joi.object({
    monday:    dayScheduleSchema.optional(),
    tuesday:   dayScheduleSchema.optional(),
    wednesday: dayScheduleSchema.optional(),
    thursday:  dayScheduleSchema.optional(),
    friday:    dayScheduleSchema.optional(),
    saturday:  dayScheduleSchema.optional(),
    sunday:    dayScheduleSchema.optional(),
  }).required(),
});
