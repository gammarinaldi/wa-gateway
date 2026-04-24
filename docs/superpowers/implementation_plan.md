# Implementation Plan - WhatsApp Gateway Dashboard (v7 Stable)

This document outlines the architectural design and implementation steps for the WhatsApp Gateway Dashboard.

## 1. Architectural Overview

The system is a hybrid Next.js 15 application. It uses a custom Node.js server (`server.ts`) to handle long-lived WebSocket connections (Baileys) and real-time UI updates (Socket.io).

### Components:
- **Frontend**: Next.js 15 (App Router) for the dashboard UI.
- **Backend Server**: Express/Node.js integrated with Next.js using `http.createServer`.
- **Database**: PostgreSQL (Prisma) for session keys, signal protocol data, and message logs.
- **Cache**: Redis for event synchronization and Baileys signal key caching.
- **WhatsApp Engine**: Baileys v7 for protocol-level interaction.

## 2. Design System (Binance Inspired)

Following `DESIGN.md`:
- **Primary Color**: Binance Yellow (`#F0B90B`)
- **Backgrounds**: White (`#FFFFFF`) and Binance Dark (`#222126`)
- **Typography**: BinancePlex (fallback to Inter/Sans-serif)
- **Buttons**: Pill-shaped (50px radius) for primary CTAs.

## 3. Database Schema

```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String   @unique
  data      String   // JSON string of auth state
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Key {
  id        String @id @default(cuid())
  sessionId String
  keyId     String
  data      String // JSON string of signal key
  @@unique([sessionId, keyId])
}

model Message {
  id        String   @id @default(cuid())
  sessionId String
  remoteJid String
  pushName  String?
  content   String?
  timestamp DateTime @default(now())
}
```

## 4. Implementation Steps

### Phase 1: Foundation
1. Initialize Next.js project.
2. Setup Prisma schema and generate client.
3. Configure `docker-compose.yml` and `Dockerfile`.
4. Create `.env.example`.

### Phase 2: Backend Core
1. Implement `src/lib/whatsapp/auth.ts`: Custom Prisma-based SignalKeyStore.
2. Implement `src/lib/whatsapp/connection.ts`: Baileys socket manager.
3. Implement `src/server.ts`: Custom HTTP/Socket.io server.

### Phase 3: Frontend
1. Implement `src/hooks/useSocket.ts`.
2. Implement `src/components/Dashboard.tsx` with Binance aesthetics.
3. Setup `app/page.tsx` as the main entry point.

### Phase 4: Integration & Optimization
1. Refine Docker networking.
2. Implement health checks.
3. Final polish on UI/UX micro-animations.

## 5. Definition of Done
- `docker compose up --build` works out of the box.
- QR code generation and persistent connection.
- Real-time message logging and UI updates.
- Session persistence across restarts.
