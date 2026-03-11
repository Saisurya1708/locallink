import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * Checks that the requesting user is a participant (poster or helper) of the request
 * AND that the request is in APPROVED/IN_PROGRESS/COMPLETED state.
 */
async function assertChatAccess(requestId: string, userId: string) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) return null;
  const isParticipant = request.posterId === userId || request.helperId === userId;
  const isUnlocked = ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(request.status);
  if (!isParticipant || !isUnlocked) return null;
  return request;
}

// ── Exchange public keys ──────────────────────────────────────────────────────
// Returns both participants' ECDH public keys so client can derive shared secret
router.get('/:requestId/keys', requireAuth, async (req: AuthRequest, res: Response) => {
  const request = await assertChatAccess(req.params.requestId, req.userId!);
  if (!request) return res.status(403).json({ error: 'Chat not accessible' });

  const [poster, helper] = await Promise.all([
    prisma.user.findUnique({ where: { id: request.posterId }, select: { id: true, username: true, publicKey: true } }),
    prisma.user.findUnique({ where: { id: request.helperId! }, select: { id: true, username: true, publicKey: true } }),
  ]);

  return res.json({ poster, helper });
});

// ── Get message history ───────────────────────────────────────────────────────
router.get('/:requestId/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  const request = await assertChatAccess(req.params.requestId, req.userId!);
  if (!request) return res.status(403).json({ error: 'Chat not accessible' });

  const messages = await prisma.message.findMany({
    where: { requestId: req.params.requestId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderId: true, iv: true, ciphertext: true, createdAt: true },
  });

  return res.json(messages);
});

// ── Store message (REST fallback) ─────────────────────────────────────────────
router.post(
  '/:requestId/messages',
  requireAuth,
  [body('iv').isString(), body('ciphertext').isString()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const request = await assertChatAccess(req.params.requestId, req.userId!);
    if (!request) return res.status(403).json({ error: 'Chat not accessible' });

    const msg = await prisma.message.create({
      data: {
        requestId: req.params.requestId,
        senderId: req.userId!,
        iv: req.body.iv,
        ciphertext: req.body.ciphertext,
      },
    });

    return res.status(201).json(msg);
  }
);

export { router as chatRouter };
