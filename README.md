# 🚀 WhatsApp Gateway

A light-weight, containerized WhatsApp Gateway built with **Next.js 15**, **Baileys**, **Socket.io**, and **Prisma**. This project provides a robust dashboard for managing WhatsApp sessions, real-time message logging, and a powerful API for integrating WhatsApp into your applications.

---

## ✨ Key Features

- **Multi-Session Management**: Connect and manage multiple WhatsApp accounts simultaneously.
- **Real-time Dashboard**: Live message logger and connection status updates using Socket.io.
- **Modern Tech Stack**: Built with Next.js 15, Express, Redis, and PostgreSQL.
- **Production-Ready**: Containerized with Docker for easy deployment and scaling.
- **High Performance**: Optimized with Redis for caching and session management.

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
