import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ── Submit rating ─────────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  [
    body('requestId').isUUID(),
    body('stars').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().isLength({ max: 500 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { requestId, stars, comment } = req.body;

    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'COMPLETED') return res.status(409).json({ error: 'Request not completed' });

    const isPoster = request.posterId === req.userId;
    const isHelper = request.helperId === req.userId;

    if (!isPoster && !isHelper) return res.status(403).json({ error: 'Not a participant' });

    const rateeId = isPoster ? request.helperId! : request.posterId;
    const role = isPoster ? 'POSTER_RATES_HELPER' : 'HELPER_RATES_POSTER';

    const existing = await prisma.rating.findUnique({ where: { requestId_raterId: { requestId, raterId: req.userId! } } });
    if (existing) return res.status(409).json({ error: 'Already rated this request' });

    const rating = await prisma.rating.create({
      data: { requestId, raterId: req.userId!, rateeId, stars, comment, role },
    });

    // Recompute ratee's average rating
    const agg = await prisma.rating.aggregate({
      where: { rateeId },
      _avg: { stars: true },
      _count: { stars: true },
    });

    await prisma.user.update({
      where: { id: rateeId },
      data: { rating: agg._avg.stars ?? 0, ratingCount: agg._count.stars },
    });

    return res.status(201).json(rating);
  }
);

// ── Get ratings for a user ────────────────────────────────────────────────────
router.get('/user/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { id: true, username: true, rating: true, ratingCount: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const reviews = await prisma.rating.findMany({
    where: { rateeId: req.params.userId },
    select: {
      id: true, stars: true, comment: true, role: true, createdAt: true,
      rater: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return res.json({ ...user, reviews });
});

export { router as ratingsRouter };
