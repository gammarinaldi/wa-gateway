import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createExpressApp } from '../app-factory.js';

// Mock Gateway
const mockGateway = {
  getStatus: jest.fn(),
  connect: jest.fn(),
  logout: jest.fn(),
  sendMessage: jest.fn()
};

describe('API Integration Tests', () => {
  let app: any;
  const API_KEY = process.env.API_KEY || 'wa-gateway-key-123';

  beforeEach(() => {
    app = createExpressApp(mockGateway as any);
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if x-api-key is missing', async () => {
      const response = await request(app).get('/api/v1/sessions/test/status');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if x-api-key is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/sessions/test/status')
        .set('x-api-key', 'wrong-key');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/sessions/:sessionId/status', () => {
    it('should return 200 and status if authenticated', async () => {
      mockGateway.getStatus.mockReturnValue('open');
      
      const response = await request(app)
        .get('/api/v1/sessions/test-session/status')
        .set('x-api-key', API_KEY);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        sessionId: 'test-session',
        status: 'open'
      });
      expect(mockGateway.getStatus).toHaveBeenCalledWith('test-session');
    });
  });

  describe('POST /api/v1/sessions/:sessionId/init', () => {
    it('should trigger connection and return 200', async () => {
      mockGateway.connect.mockResolvedValue({} as any);
      
      const response = await request(app)
        .post('/api/v1/sessions/test-session/init')
        .set('x-api-key', API_KEY);
      
      expect(response.status).toBe(200);
      expect(mockGateway.connect).toHaveBeenCalled();
    });
  });
});
