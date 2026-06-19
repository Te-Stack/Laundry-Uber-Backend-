import express from 'express';
import Service from '../models/Service.js';
import { requireAuth, checkUserType } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createServiceSchema, updateServiceSchema } from '../validators/serviceSchemas.js';

const router = express.Router();

// Get all services (public)
router.get('/', async (req, res, next) => {
  try {
    const { category, providerId } = req.query;

    const where = { isActive: true };
    if (category) where.category = category;
    if (providerId) where.providerId = providerId;

    const services = await Service.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']],
    });

    res.json(services);
  } catch (error) {
    next(error);
  }
});

// Get provider's own services (must be before /:id to avoid route conflict)
router.get('/provider/my-services', requireAuth, checkUserType('provider'), async (req, res, next) => {
  try {
    const services = await Service.findAll({
      where: { providerId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(services);
  } catch (error) {
    next(error);
  }
});

// Get single service
router.get('/:id', async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    next(error);
  }
});

// Create new service (providers only)
router.post('/', requireAuth, checkUserType('provider'), validate(createServiceSchema), async (req, res, next) => {
  try {
    const { name, description, basePrice, unit, estimatedDuration, category } = req.body;

    const service = await Service.create({
      name,
      description,
      basePrice,
      unit,
      estimatedDuration,
      category,
      providerId: req.user.id,
    });

    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
});

// Update service (providers only — their own)
router.patch('/:id', requireAuth, checkUserType('provider'), validate(updateServiceSchema), async (req, res, next) => {
  try {
    const service = await Service.findOne({
      where: { id: req.params.id, providerId: req.user.id },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found or not owned by you' });
    }

    const { name, description, basePrice, unit, estimatedDuration, category, isActive } = req.body;

    await service.update({
      name:              name              ?? service.name,
      description:       description       !== undefined ? description       : service.description,
      basePrice:         basePrice         ?? service.basePrice,
      unit:              unit              ?? service.unit,
      estimatedDuration: estimatedDuration ?? service.estimatedDuration,
      category:          category          ?? service.category,
      isActive:          isActive          !== undefined ? isActive          : service.isActive,
    });

    res.json(service);
  } catch (error) {
    next(error);
  }
});

// Delete service (providers only — their own)
router.delete('/:id', requireAuth, checkUserType('provider'), async (req, res, next) => {
  try {
    const service = await Service.findOne({
      where: { id: req.params.id, providerId: req.user.id },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found or not owned by you' });
    }

    await service.destroy();
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
