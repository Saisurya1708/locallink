import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { io } from '../index';

const router = Router();
const prisma = new PrismaClient();

// Nearby requests
router.get('/nearby', requireAuth, apiLimiter,
  [query('lat').isFloat({ min: -90, max: 90 }), query('lng').isFloat({ min: -180, max: 180 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    try {
      const requests = await prisma.$queryRaw`
        SELECT
          r.id, r."displayName", r.title, r.description, r.category, r.status,
          r."centerLat", r."centerLng", r."radiusMeters", r."createdAt",
          r."posterId", r."helperId",
          u.username as "posterUsername", u.rating as "posterRating",
          ST_Distance(
            ST_MakePoint(r."centerLng", r."centerLat")::geography,
            ST_MakePoint(${lng}::float, ${lat}::float)::geography
          ) AS distance_meters
        FROM requests r
        JOIN users u ON u.id = r."posterId"
        WHERE r.status = 'OPEN'
          AND ST_DWithin(
            ST_MakePoint(r."centerLng", r."centerLat")::geography,
            ST_MakePoint(${lng}::float, ${lat}::float)::geography,
            r."radiusMeters"
          )
          AND (r."expiresAt" IS NULL OR r."expiresAt" > NOW())
        ORDER BY r."createdAt" DESC LIMIT 100
      `;
      return res.json(requests);
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }
  }
);

// Create request
router.post('/', requireAuth, apiLimiter,
  [
    body('displayName').trim().isLength({ min: 1, max: 50 }),
    body('title').trim().isLength({ min: 5, max: 120 }),
    body('description').trim().isLength({ min: 10, max: 2000 }),
    body('category').isIn(['GENERAL','ERRANDS','TECH_HELP','MOVING','FOOD','MEDICAL','EDUCATION','EMERGENCY','PETS','HOME_REPAIR']),
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 }),
    body('radiusMeters').isFloat({ min: 100, max: 900000 }),
    body('expiresAt').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { displayName, title, description, category, lat, lng, radiusMeters, expiresAt } = req.body;
    const request = await prisma.request.create({
      data: { posterId: req.userId!, displayName, title, description, category, centerLat: lat, centerLng: lng, radiusMeters, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    return res.status(201).json(request);
  }
);

// Get single request
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: {
      poster: { select: { id: true, username: true, rating: true, publicKey: true } },
      helper: { select: { id: true, username: true, rating: true, publicKey: true } },
      interests: {
        include: { user: { select: { id: true, username: true, rating: true, publicKey: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!request) return res.status(404).json({ error: 'Not found' });
  // Only show interests to poster
  const result = { ...request, interests: request.posterId === req.userId ? request.interests : [] };
  return res.json(result);
});

// Express interest
router.post('/:id/interest', requireAuth, apiLimiter,
  [body('message').optional().trim().isLength({ max: 300 })],
  async (req: AuthRequest, res: Response) => {
    const request = await prisma.request.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.status !== 'OPEN') return res.status(409).json({ error: 'Request is no longer open' });
    if (request.posterId === req.userId) return res.status(400).json({ error: 'Cannot express interest in your own request' });

    const interest = await prisma.requestInterest.upsert({
      where: { requestId_userId: { requestId: req.params.id, userId: req.userId! } },
      update: { status: 'PENDING', message: req.body.message },
      create: { requestId: req.params.id, userId: req.userId!, message: req.body.message },
    });

    io.to(`user:${request.posterId}`).emit('notification', {
      type: 'NEW_INTEREST',
      payload: { requestId: request.id, requestTitle: request.title },
    });

    return res.status(201).json(interest);
  }
);

// Withdraw interest
router.delete('/:id/interest', requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.requestInterest.deleteMany({ where: { requestId: req.params.id, userId: req.userId! } });
  return res.json({ success: true });
});

// Accept a specific helper (poster only) - opens chat
router.post('/:id/accept/:helperId', requireAuth, apiLimiter, async (req: AuthRequest, res: Response) => {
  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.posterId !== req.userId) return res.status(403).json({ error: 'Only poster can accept' });
  if (request.status !== 'OPEN') return res.status(409).json({ error: 'Request is no longer open' });

  await prisma.requestInterest.updateMany({
    where: { requestId: req.params.id, userId: req.params.helperId },
    data: { status: 'ACCEPTED' },
  });
  await prisma.requestInterest.updateMany({
    where: { requestId: req.params.id, userId: { not: req.params.helperId } },
    data: { status: 'REJECTED' },
  });

  const updated = await prisma.request.update({
    where: { id: req.params.id },
    data: { helperId: req.params.helperId, status: 'IN_PROGRESS' },
  });

  io.to(`user:${req.params.helperId}`).emit('notification', {
    type: 'INTEREST_ACCEPTED',
    payload: { requestId: request.id, requestTitle: request.title },
  });

  return res.json(updated);
});

// Complete request
router.post('/:id/complete', requireAuth, apiLimiter, async (req: AuthRequest, res: Response) => {
  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.posterId !== req.userId) return res.status(403).json({ error: 'Only poster can complete' });
  if (request.status !== 'IN_PROGRESS') return res.status(409).json({ error: 'Request not in progress' });
  const updated = await prisma.request.update({ where: { id: req.params.id }, data: { status: 'COMPLETED' } });
  io.to(`user:${request.helperId}`).emit('notification', { type: 'RATE_PROMPT', payload: { requestId: request.id } });
  return res.json(updated);
});

// Cancel request
router.post('/:id/cancel', requireAuth, apiLimiter, async (req: AuthRequest, res: Response) => {
  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.posterId !== req.userId && request.helperId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
  const updated = await prisma.request.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  return res.json(updated);
});

export { router as requestsRouter };
