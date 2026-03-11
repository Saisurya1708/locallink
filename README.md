# LocalLink — Anonymous Local Help Network

A privacy-first, location-aware community platform where people can post requests, find local help, and communicate securely — without ever revealing their identity unless they choose to.

---

## Features

- **Anonymous profiles** — post with any display name; real identity never exposed publicly
- **Location-locked requests** — geofenced to a chosen radius (0.5 mi → 500 mi)
- **End-to-end encrypted chat** — keys generated client-side; server stores only ciphertext
- **Dual-approval chat** — both users must accept before a chat opens
- **Trust & ratings** — star ratings on every completed request
- **Caution popups** — reminder before sharing personal info
- **Works worldwide** — any device, any browser, any country

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + custom CSS |
| State | Zustand |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Realtime | Socket.IO (WebSocket) |
| Auth | JWT (access + refresh tokens) |
| Crypto | Web Crypto API (ECDH key exchange + AES-GCM) |
| Maps | Leaflet.js (OpenStreetMap — free, no API key) |
| Geo queries | PostGIS extension for PostgreSQL |

---

## Project Structure

```
locallink/
├── apps/
│   ├── frontend/          # React app
│   └── backend/           # Express API + Socket server
├── docs/
│   └── ARCHITECTURE.md    # Deep technical design
└── README.md
```

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- pnpm (recommended) or npm

### 1. Clone & install

```bash
git clone <your-repo>
cd locallink
pnpm install  # or: npm install (in each app folder)
```

### 2. Database

```sql
-- In psql:
CREATE DATABASE locallink;
\c locallink
CREATE EXTENSION postgis;
```

### 3. Environment variables

**Backend** — create `apps/backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/locallink"
JWT_SECRET="your-256-bit-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
ENCRYPTION_KEY="your-32-char-server-key"
```

**Frontend** — create `apps/frontend/.env`:
```env
VITE_API_URL="http://localhost:4000"
VITE_SOCKET_URL="http://localhost:4000"
```

### 4. Migrate database

```bash
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run development

```bash
# Terminal 1 — backend
cd apps/backend
npm run dev

# Terminal 2 — frontend
cd apps/frontend
npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:4000

---

## Security Notes

- Passwords hashed with bcrypt (12 rounds)
- PII (name, phone, email) encrypted at rest with AES-256-GCM using server key
- Chat messages encrypted with ECDH-derived AES-GCM keys; server never sees plaintext
- JWTs rotate on refresh; old tokens invalidated
- Rate limiting on all auth endpoints
- Location stored as PostGIS point; never returned to other users directly
- All API routes require auth; profiles only expose username + rating

---

## Deployment Checklist

- [ ] Enable HTTPS (TLS) — required for Geolocation API in browsers
- [ ] Set `NODE_ENV=production`
- [ ] Use environment secrets manager (AWS Secrets Manager, Vault, etc.)
- [ ] Configure CORS to your actual domain
- [ ] Enable PostgreSQL SSL
- [ ] Set up Redis for Socket.IO adapter in multi-server deployments
- [ ] Add CDN (Cloudflare) for global edge performance
- [ ] Review GDPR / regional privacy laws for user data retention
