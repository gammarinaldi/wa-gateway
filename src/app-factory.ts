import express from 'express';
import multer from 'multer';
import { WhatsAppGateway } from './lib/core/index.js';
import { authMiddleware } from './middleware/auth.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { Server as SocketIOServer } from 'socket.io';

export const createExpressApp = (gateway: WhatsAppGateway, io?: SocketIOServer) => {
  const server = express();
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
    apis: ['./src/app-factory.ts', './src/server.ts'],
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

  apiRouter.post('/sessions/:sessionId/init', async (req, res) => {
    const { sessionId } = req.params;
    try {
      await gateway.connect(sessionId, {
        onUpdate: (event, data) => io?.to(sessionId).emit(event, data)
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

  // Legacy route
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

  return server;
};
