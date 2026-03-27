import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { router } from './routes';
import { initChatSocket } from './socket/chatSocket';

const app = express();
const httpServer = createServer(app);

const ALLOWED_ORIGINS = [
  'https://locallink-topaz.vercel.app',
  'http://localhost:5173',
  process.env.CLIENT_ORIGIN,
].filter(Boolean) as string[];

export const io = new SocketServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// ── Routes ──────────────────────────────────────────────
app.use('/api', router);

// ── Socket.IO ───────────────────────────────────────────
initChatSocket(io);

// ── Health check ────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Global error handler ────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, () => {
  console.log(`🔗 LocalLink API running on http://localhost:${PORT}`);
});
