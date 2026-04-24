import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { connectToWhatsApp, disconnectFromWhatsApp, sendWhatsAppMessage } from './lib/whatsapp/connection.js';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const socketPort = parseInt(process.env.SOCKET_PORT || '3001', 10);

app.prepare().then(async () => {
  const server = express();
  const httpServer = createServer(server);
  
  // Create a separate HTTP server for Socket.io if needed, 
  // but here we can just use the same one or a different port.
  // The user requested SOCKET_PORT=3001.
  const ioServer = createServer();
  const io = new Server(ioServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const prisma = new (await import('@prisma/client')).PrismaClient();

  io.on('connection', (socket) => {
    socket.on('join', async (sessionId) => {
      socket.join(sessionId);
      console.log(`User joined session: ${sessionId}`);

      // Send last 50 messages
      const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      // Find current session status
      const { sessionStates } = await import('./lib/whatsapp/connection.js');
      const status = sessionStates.get(sessionId) || 'idle';

      socket.emit('initial_data', { 
        messages: messages.reverse(),
        status 
      });
    });

    socket.on('connect_wa', async (sessionId) => {
      await connectToWhatsApp(sessionId, io);
    });

    socket.on('disconnect_wa', async (sessionId) => {
      await disconnectFromWhatsApp(sessionId);
    });
  });

  const upload = multer({ storage: multer.memoryStorage() });

  server.post('/api/send', upload.single('file'), async (req, res) => {
    try {
      const { jid, text, sessionId = 'default-user' } = req.body;
      const file = req.file;

      const result = await sendWhatsAppMessage(sessionId, jid, {
        text,
        file: file?.buffer,
        fileName: file?.originalname,
        mimetype: file?.mimetype
      });

      res.json({ success: true, messageId: result?.key.id });
    } catch (error: any) {
      console.error('API Send Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
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
