import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { encryptPII, decryptPII } from '../utils/crypto';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();

function signAccess(userId: string): string {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: '15m' });
}

function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
}

// ── Register ─────────────────────────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  [
    body('username').trim().isLength({ min: 2, max: 30 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').isMobilePhone('any'),
    body('realName').trim().isLength({ min: 2, max: 100 }),
    body('password').isLength({ min: 8 }),
    body('publicKey').isString().notEmpty(), // ECDH public key from client
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, phone, realName, password, publicKey, lat, lng } = req.body;

    // Check username uniqueness
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        emailEnc: encryptPII(email),
        phoneEnc: encryptPII(phone),
        realNameEnc: encryptPII(realName),
        passwordHash,
        publicKey,
        locationLat: lat,
        locationLng: lng,
      },
    });

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, rating: user.rating },
    });
  }
);

// ── Login ─────────────────────────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').isString()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    // Scan all users and decrypt email to find match (in production, store email hash for lookup)
    const users = await prisma.user.findMany({ select: { id: true, emailEnc: true, passwordHash: true, username: true, rating: true } });
    const user = users.find(u => {
      try { return decryptPII(u.emailEnc) === email; } catch { return false; }
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, rating: user.rating },
    });
  }
);

// ── Refresh ───────────────────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const newAccess = signAccess(payload.sub);
    const newRefresh = signRefresh(payload.sub);

    await prisma.refreshToken.create({
      data: { token: newRefresh, userId: payload.sub, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    return res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.delete('/logout', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }
  return res.json({ success: true });
});

export { router as authRouter };
