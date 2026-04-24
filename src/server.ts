import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { WhatsAppGateway } from './lib/core/index.js';
import multer from 'multer';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

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
  const gateway = new WhatsAppGateway({
    webhookUrl: process.env.WEBHOOK_URL,
    apiSecret: process.env.API_SECRET,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    databaseUrl: process.env.DATABASE_URL
  });

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

  const upload = multer({ storage: multer.memoryStorage() });
  server.use(express.json());

  // Swagger Configuration
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'WhatsApp Gateway API',
        version: '1.1.0',
        description: 'Professional WhatsApp Gateway API for business integration',
      },
      servers: [
        { url: `http://localhost:${port}` },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
          },
        },
      },
    },
    apis: ['./src/server.ts'],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // API Routes with Authentication
  const apiRouter = express.Router();
  apiRouter.use(authMiddleware);

  /**
   * @openapi
   * /api/v1/sessions/{sessionId}/status:
   *   get:
   *     summary: Get session connection status
   *     tags: [Sessions]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Success
   */
  apiRouter.get('/sessions/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    res.json({ success: true, sessionId, status: gateway.getStatus(sessionId) });
  });

  /**
   * @openapi
   * /api/v1/sessions/{sessionId}/init:
   *   post:
   *     summary: Initialize WhatsApp connection
   *     tags: [Sessions]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Success
   */
  apiRouter.post('/sessions/:sessionId/init', async (req, res) => {
    const { sessionId } = req.params;
    try {
      await gateway.connect(sessionId, {
        onUpdate: (event, data) => io.to(sessionId).emit(event, data)
      });
      res.json({ success: true, message: 'Initialization started' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  apiRouter.post('/sessions/:sessionId/logout', async (req, res) => {
    const { sessionId } = req.params;
    try {
      await gateway.logout(sessionId);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * @openapi
   * /api/v1/messages/send:
   *   post:
   *     summary: Send a WhatsApp message
   *     tags: [Messages]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               jid:
   *                 type: string
   *               text:
   *                 type: string
   *               sessionId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Success
   */
  apiRouter.post('/messages/send', upload.single('file'), async (req, res) => {
    try {
      const { jid, text, sessionId = 'default-user' } = req.body;
      const file = req.file;

      const result = await gateway.sendMessage(sessionId, jid, {
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

  server.use('/api/v1', apiRouter);

  // Legacy route for backward compatibility (optional)
  server.post('/api/send', upload.single('file'), async (req, res) => {
    try {
      const { jid, text, sessionId = 'default-user' } = req.body;
      const file = req.file;
      const result = await gateway.sendMessage(sessionId, jid, {
        text,
        file: file?.buffer,
        fileName: file?.originalname,
        mimetype: file?.mimetype
      });
      res.json({ success: true, messageId: result?.key.id });
    } catch (error: any) {
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
