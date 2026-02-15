import type { Application } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { resetConfig } from '../../src/config/index.js';

describe('App Integration Tests', () => {
  let app: Application;
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      FEISHU_APP_ID: 'test_app_id',
      FEISHU_APP_SECRET: 'test_app_secret',
      AGENT_API_KEY: 'test_api_key',
    };
    resetConfig();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetConfig();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    app = createApp();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.config).toBeDefined();
    });
  });

  describe('POST /webhook/feishu', () => {
    it('should handle URL verification', async () => {
      process.env.FEISHU_VERIFICATION_TOKEN = 'test_token';
      resetConfig();
      app = createApp();

      const response = await request(app).post('/webhook/feishu').send({
        challenge: 'test_challenge',
        token: 'test_token',
      });

      expect(response.status).toBe(200);
      expect(response.body.challenge).toBe('test_challenge');
    });

    it('should handle text message', async () => {
      const mockFetch = vi.fn();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tenant_access_token: 'test_token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'AI response' } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ code: 0 }),
        });

      global.fetch = mockFetch as unknown as typeof fetch;

      const response = await request(app)
        .post('/webhook/feishu')
        .send({
          event: {
            message: {
              message_id: 'msg_123',
              chat_id: 'chat_456',
              chat_type: 'p2p',
              content: '{"text": "Hello"}',
              msg_type: 'text',
              create_time: '1234567890',
            },
            sender: {
              sender_id: { union_id: 'user_789' },
              sender_type: 'user',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('processing');
    });

    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/webhook/feishu')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      // Express body-parser returns 400 for invalid JSON
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
