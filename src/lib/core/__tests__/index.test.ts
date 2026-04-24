import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      session: { delete: jest.fn() },
      key: { deleteMany: jest.fn() },
      message: { create: jest.fn() }
    }))
  };
});

jest.unstable_mockModule('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn()
  })
}));

const { WhatsAppGateway } = await import('../index.js');

describe('WhatsAppGateway', () => {
  let gateway: WhatsAppGateway;
  const config = {
    redisUrl: 'redis://localhost:6379',
    databaseUrl: 'postgresql://localhost:5432/test'
  };

  beforeEach(() => {
    gateway = new WhatsAppGateway(config);
  });

  it('should initialize with idle status', () => {
    expect(gateway.getStatus('test-session')).toBe('idle');
  });

  it('should return the correct status if set', () => {
    gateway.sessionStates.set('active-session', 'open');
    expect(gateway.getStatus('active-session')).toBe('open');
  });

  it('should allow logging out a non-existent session without error', async () => {
    await expect(gateway.logout('non-existent')).resolves.not.toThrow();
  });
});
