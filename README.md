# 🚀 WhatsApp Gateway

A light-weight, containerized WhatsApp Gateway built with **Next.js 15**, **Baileys**, **Socket.io**, and **Prisma**. This project provides a robust dashboard for managing WhatsApp sessions, real-time message logging, and a powerful API for integrating WhatsApp into your applications.

---

## ✨ Key Features

- **Multi-Session Management**: Connect and manage multiple WhatsApp accounts simultaneously.
- **Service-Oriented API (v1)**: Robust REST endpoints for session management and messaging.
- **Webhook Gateway**: Real-time event forwarding (messages, status, QR) to external services.
- **Library & Headless Mode**: Use core WhatsApp logic in any Node.js project.
- **Real-time Dashboard**: Live message logger and connection status updates.
- **Production-Ready**: Containerized with Docker, Redis, and PostgreSQL.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), Tailwind CSS
- **Backend**: [Express](https://expressjs.com/) (Custom Server)
- **Real-time**: [Socket.io](https://socket.io/)
- **WhatsApp**: [Baileys](https://github.com/WhiskeySockets/Baileys) (v7)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Cache**: [Redis](https://redis.io/)
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

---

## 📋 Pre-requisites

Before you begin, ensure you have the following installed:

- **Node.js**: v20 or higher
- **Docker**: Engine v20.10+
- **Docker Compose**: v2.0+
- **Git**

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/wa-gateway.git
cd wa-gateway
```

### 2. Environment Variables
Copy the example environment file and update the values as needed:
```bash
cp .env.example .env
```

Key integration variables:
- `WEBHOOK_URL`: URL to receive incoming message events.
- `API_KEY`: Key to authorize your REST API requests.
- `API_SECRET`: Secret to verify webhook payloads.

### 3. Running with Docker (Recommended)
The easiest way to get started is using Docker Compose:
```bash
docker-compose up -d
```
This will start:
- **Dashboard App**: `http://localhost:3000`
- **Socket Server**: `http://localhost:3001`
- **PostgreSQL**: Port `5432`
- **pgAdmin**: `http://localhost:5050` (Email: `admin@admin.com`, Password: `password`)
- **Redis**: Port `6379`

### 4. Local Development (Alternative)
If you prefer to run the app directly on your host:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Database**:
   Ensure PostgreSQL is running and update `DATABASE_URL` in `.env`.
   ```bash
   npx prisma migrate dev
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## 🔌 API & Integration

The gateway is designed to be integrated with external services (AI Services, Auth Services, etc.).

### REST API (v1)
All requests require the `X-API-Key` header.
- **Messaging**: `POST /api/v1/messages/send`
- **Sessions**: `POST /api/v1/sessions/:id/init`, `GET /api/v1/sessions/:id/status`

### Webhooks
Configure `WEBHOOK_URL` to receive:
- `message.received`: New incoming messages.
- `connection.update`: WhatsApp connection status changes.
- `qr.received`: New QR codes for authentication.

### Library Usage
You can also use the core logic as a library in your Node project:
```typescript
import { WhatsAppGateway } from 'whatsapp-gateway';

const gateway = new WhatsAppGateway({
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  webhookUrl: 'https://your-api.com/webhook'
});

await gateway.connect('my-session');
```

For detailed documentation, see [API Walkthrough](docs/superpowers/api-walkthrough.md).

---

## 🚢 Deployment

For production deployment, you can use the multi-stage Docker build:

```bash
# Build and start in production mode
docker-compose -f docker-compose.yml up --build -d
```

The Dockerfile is optimized for production, using a lightweight Alpine image and pruning development dependencies to minimize the final image size.

---

## 📂 Project Structure

- `src/`: Application source code.
  - `src/server.ts`: Entry point for the Express/Socket.io/Baileys server.
  - `src/app/`: Next.js 15 App Router pages and components.
  - `src/lib/`: Core libraries (WhatsApp connection, Redis, Prisma).
- `prisma/`: Database schema and migrations.
- `public/`: Static assets.
- `docs/`: Additional documentation.

---

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---
Built with ❤️ for the WhatsApp Automation Community.
