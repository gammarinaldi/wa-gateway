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

  const ioServer = createServer();
  const io = new Server(ioServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const server = createExpressApp(gateway, io);
  const httpServer = createServer(server);

  io.on('connection', (socket) => {
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

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });

  ioServer.listen(socketPort, () => {
    console.log(`> Socket.io ready on http://localhost:${socketPort}`);
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
