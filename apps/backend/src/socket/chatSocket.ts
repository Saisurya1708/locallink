import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initChatSocket(io: SocketServer) {
  // ── Auth middleware ───────────────────────────────────────────────────────
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`Socket connected: ${userId}`);

    // Join personal notification room
    socket.join(`user:${userId}`);

    // ── Join a chat room ────────────────────────────────────────────────────
    socket.on('join_chat', async ({ requestId }: { requestId: string }) => {
      const request = await prisma.request.findUnique({ where: { id: requestId } });
      if (!request) return;

      const isParticipant = request.posterId === userId || request.helperId === userId;
      const isUnlocked = ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(request.status);

      if (!isParticipant || !isUnlocked) {
        socket.emit('error', { message: 'Chat not accessible' });
        return;
      }

      socket.join(`chat:${requestId}`);
      socket.emit('joined_chat', { requestId });
    });

    // ── Relay encrypted message (store + broadcast) ─────────────────────────
    socket.on('message', async ({ requestId, iv, ciphertext }: {
      requestId: string;
      iv: string;
      ciphertext: string;
    }) => {
      const request = await prisma.request.findUnique({ where: { id: requestId } });
      if (!request) return;

      const isParticipant = request.posterId === userId || request.helperId === userId;
      if (!isParticipant) return;

      // Persist (server only ever sees ciphertext)
      const msg = await prisma.message.create({
        data: { requestId, senderId: userId, iv, ciphertext },
      });

      // Broadcast to chat room participants
      io.to(`chat:${requestId}`).emit('message', {
        id: msg.id,
        senderId: userId,
        iv,
        ciphertext,
        createdAt: msg.createdAt,
      });
    });

    // ── Typing indicator ────────────────────────────────────────────────────
    socket.on('typing', ({ requestId }: { requestId: string }) => {
      socket.to(`chat:${requestId}`).emit('typing', { senderId: userId });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${userId}`);
    });
  });
}
