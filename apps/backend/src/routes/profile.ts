import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { decryptPII } from '../utils/crypto';

const router = Router();
const prisma = new PrismaClient();

// Get own private profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({
    id: user.id, username: user.username,
    email: decryptPII(user.emailEnc), phone: decryptPII(user.phoneEnc),
    realName: decryptPII(user.realNameEnc),
    rating: user.rating, ratingCount: user.ratingCount,
    publicKey: user.publicKey, createdAt: user.createdAt,
  });
});

// Get my posted requests (all statuses)
router.get('/me/requests', requireAuth, async (req: AuthRequest, res: Response) => {
  const requests = await prisma.request.findMany({
    where: { posterId: req.userId },
    include: {
      helper: { select: { id: true, username: true, rating: true } },
      interests: { include: { user: { select: { id: true, username: true, rating: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(requests);
});

// Get requests I'm helping with (all statuses)
router.get('/me/helping', requireAuth, async (req: AuthRequest, res: Response) => {
  const requests = await prisma.request.findMany({
    where: { helperId: req.userId },
    include: {
      poster: { select: { id: true, username: true, rating: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Also include requests where user expressed interest (PENDING)
  const interests = await prisma.requestInterest.findMany({
    where: { userId: req.userId, status: 'PENDING' },
    include: {
      request: {
        include: { poster: { select: { id: true, username: true, rating: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({
    helping: requests,
    pending: interests.map(i => ({ ...i.request, myInterestStatus: i.status })),
  });
});

// Update profile
router.patch('/me', requireAuth,
  [body('username').optional().trim().isLength({ min: 2, max: 30 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { username } = req.body;
    const data: Record<string, string> = {};
    if (username) data.username = username;
    const user = await prisma.user.update({ where: { id: req.userId }, data });
    return res.json({ id: user.id, username: user.username, rating: user.rating });
  }
);

// Update location
router.patch('/me/location', requireAuth,
  [body('lat').isFloat({ min: -90, max: 90 }), body('lng').isFloat({ min: -180, max: 180 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { lat, lng } = req.body;
    await prisma.user.update({ where: { id: req.userId }, data: { locationLat: lat, locationLng: lng } });
    return res.json({ success: true });
  }
);

export { router as profileRouter };
