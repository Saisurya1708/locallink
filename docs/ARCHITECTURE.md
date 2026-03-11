# LocalLink — Architecture & Design Decisions

## Overview

LocalLink is a privacy-preserving, location-aware help network. The core design principle: **users share as little as they want and as much as they choose**.

---

## Identity Model

```
User (internal)
├── id: UUID (true primary key — never exposed)
├── username: string (public posting name, changeable per-post)
├── email: AES-GCM encrypted blob (private, login only)
├── phone: AES-GCM encrypted blob (private)
├── realName: AES-GCM encrypted blob (private)
├── passwordHash: bcrypt hash
├── location: PostGIS POINT (private, used for geo queries only)
├── publicKey: base64 (ECDH public key for E2EE)
└── rating: float (public, computed from reviews)
```

Public API responses for other users only return: `{ id, username, rating, publicKey }`.

---

## E2EE Chat Design

### Key Exchange (ECDH)

1. On registration, the client generates an ECDH P-256 key pair.
2. The **private key** is stored in browser `indexedDB` (never sent to server).
3. The **public key** is sent to the server and stored on the user record.
4. When User A wants to chat with User B:
   - A fetches B's public key from the server.
   - A derives a shared secret: `ECDH(A_private, B_public)`.
   - A uses HKDF to derive an AES-GCM-256 key from the shared secret.
   - All messages are encrypted before leaving the browser.
5. Server stores only ciphertext + IV + metadata (sender UUID, timestamp).

### Why not Signal Protocol?
For an MVP, ECDH + AES-GCM is auditable, simple, and uses only the Web Crypto API (zero dependencies). A production hardening could add Double Ratchet.

---

## Location & Geofencing

- User's exact location is stored as a PostGIS `POINT(lng lat)`.
- Requests store: `center POINT`, `radius float` (meters).
- Discovery query:
  ```sql
  SELECT r.* FROM requests r
  WHERE ST_DWithin(
    r.center::geography,
    ST_MakePoint(:userLng, :userLat)::geography,
    r.radius_meters
  )
  AND r.status = 'OPEN'
  ORDER BY r.created_at DESC;
  ```
- User location is **never** included in API responses to other users.
- Radius slider: 0.5 mi, 1, 2, 5, 10, 25, 50, 100, 250, 500 miles.

---

## Request Lifecycle

```
OPEN → CLAIMED (one helper claims it) → APPROVED (poster approves) → IN_PROGRESS → COMPLETED / CANCELLED
```

- Only one helper can be in `CLAIMED` state at a time.
- Chat unlocks only when state reaches `APPROVED`.
- Rating is triggered on `COMPLETED`.

---

## Chat Flow

1. Helper claims request → poster gets notification.
2. Poster approves → both users' public keys exchanged via API.
3. Client derives shared AES key.
4. WebSocket room `chat:{requestId}` opened.
5. Messages: `{ iv, ciphertext, senderId, timestamp }` — server is a relay only.
6. Caution popup fires on first message sent in any chat.

---

## Rating System

- Each completed request generates two rating prompts:
  - Poster rates Helper (helpfulness, reliability, communication).
  - Helper rates Poster (clarity, responsiveness, fairness).
- Ratings are 1–5 stars with an optional short comment.
- Displayed as aggregate on profiles — no individual review attribution beyond username.

---

## API Routes

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
DELETE /api/auth/logout

GET    /api/requests/nearby        ?lat&lng&radius
POST   /api/requests               (create)
GET    /api/requests/:id
POST   /api/requests/:id/claim
POST   /api/requests/:id/approve
POST   /api/requests/:id/complete
POST   /api/requests/:id/cancel

GET    /api/chat/:requestId/keys   (exchange public keys)
GET    /api/chat/:requestId/messages

POST   /api/ratings                (submit rating)
GET    /api/users/:id/ratings      (public rating summary)

GET    /api/profile/me             (private — full profile)
PATCH  /api/profile/me             (update profile)
PATCH  /api/profile/me/location    (update location)
```

---

## WebSocket Events

```
Client → Server:
  join_chat  { requestId, token }
  message    { requestId, iv, ciphertext }
  typing     { requestId }

Server → Client:
  message    { iv, ciphertext, senderId, timestamp }
  typing     { senderId }
  status_change { requestId, status }
  notification  { type, payload }
```

---

## Scalability Path

| Concern | MVP | Production |
|---------|-----|-----------|
| Sessions | JWT in memory | Redis session store |
| Sockets | Single server | Socket.IO + Redis adapter |
| File storage | N/A | S3 (if media added) |
| Search | PostGIS | PostGIS + pg_trgm |
| Notifications | WebSocket | WebSocket + FCM push |
| Rate limiting | express-rate-limit | Redis-backed rate limit |
| Moderation | Manual | Report queue + admin panel |
