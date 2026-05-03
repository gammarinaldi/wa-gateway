import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { WhatsAppGateway } from './lib/core/index.js';
import dotenv from 'dotenv';
import { createExpressApp } from './app-factory.js';

dotenv.config();

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const socketPort = parseInt(process.env.SOCKET_PORT || '3001', 10);

app.prepare().then(async () => {
  const prisma = new (await import('@prisma/client')).PrismaClient();
  const gateway = new WhatsAppGateway({
    webhookUrl: process.env.WEBHOOK_URL,
    apiSecret: process.env.API_SECRET,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    databaseUrl: process.env.DATABASE_URL
  });

  const io = new Server({
    cors: {
      origin: true, // Reflect origin for debugging
      methods: ["GET", "POST"]
    }
  });

  const server = createExpressApp(gateway, io);
  
  // Verbose Debug
  server.use((req, res, next) => {
    if (req.url.includes('socket.io')) {
      console.log(`[SOCKET-HTTP] ${req.method} ${req.url}`);
    } else if (req.url !== '/health') {
      console.log(`[HTTP] ${req.method} ${req.url}`);
    }
    next();
  });

  server.get('/api/health', (req, res) => {
    res.json({ status: 'ok', socket: 'ready' });
  });

  const httpServer = createServer(server);
  io.attach(httpServer);

  // Low-level engine logs
  io.engine.on("connection_error", (err) => {
    console.error(`[Socket-Engine] Connection Error:`, err.req.url, err.code, err.message);
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    socket.on('join', async (sessionId) => {
      socket.join(sessionId);
      console.log(`User joined session: ${sessionId}`);

      const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      socket.emit('initial_data', { 
        messages: messages.reverse(),
        status: gateway.getStatus(sessionId)
      });
    });

    socket.on('connect_wa', async (sessionId) => {
      await gateway.connect(sessionId, {
        onUpdate: (event, data) => io.to(sessionId).emit(event, data)
      });
    });

    socket.on('disconnect_wa', async (sessionId) => {
      await gateway.logout(sessionId);
    });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://0.0.0.0:${port}`);
    console.log(`> Socket.io ready on same port`);
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
