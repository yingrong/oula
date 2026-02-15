import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../../src/config/index.js';
import { FeishuController } from '../../../src/controllers/feishu.js';

describe('FeishuController', () => {
  let controller: FeishuController;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
    controller = new FeishuController();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
    vi.restoreAllMocks();
  });

  const createMockRequest = (body: unknown, headers: Record<string, string> = {}): Request => {
    return {
      body,
      headers,
    } as unknown as Request;
  };

  const createMockResponse = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    return res as unknown as Response;
  };

  describe('handleWebhook', () => {
    it('should handle URL verification', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.FEISHU_VERIFICATION_TOKEN = 'test_token';
      process.env.AGENT_API_KEY = 'test_api_key';

      controller = new FeishuController();

      const req = createMockRequest({
        challenge: 'test_challenge',
        token: 'test_token',
      });
      const res = createMockResponse();

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ challenge: 'test_challenge' });
    });

    it('should reject invalid token', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.FEISHU_VERIFICATION_TOKEN = 'correct_token';
      process.env.AGENT_API_KEY = 'test_api_key';

      controller = new FeishuController();

      const req = createMockRequest({
        challenge: 'test_challenge',
        token: 'wrong_token',
      });
      const res = createMockResponse();

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should handle text message', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      controller = new FeishuController();

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

      const req = createMockRequest({
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
      const res = createMockResponse();

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'processing' });
    });

    it('should reject invalid signature', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.FEISHU_ENCRYPT_KEY = 'test_encrypt_key';
      process.env.AGENT_API_KEY = 'test_api_key';

      controller = new FeishuController();

      const req = createMockRequest(
        { test: 'body' },
        {
          'x-lark-request-timestamp': '1234567890',
          'x-lark-request-nonce': 'test_nonce',
          'x-lark-signature': 'invalid_signature',
        }
      );
      const res = createMockResponse();

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });

    it('should ignore non-text messages', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      controller = new FeishuController();

      const mockFetch = vi.fn();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tenant_access_token: 'test_token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ code: 0 }),
        });

      global.fetch = mockFetch as unknown as typeof fetch;

      const req = createMockRequest({
        event: {
          message: {
            message_id: 'msg_123',
            chat_id: 'chat_456',
            chat_type: 'p2p',
            content: '{"image_key": "img_123"}',
            msg_type: 'image',
            create_time: '1234567890',
          },
          sender: {
            sender_id: { union_id: 'user_789' },
            sender_type: 'user',
          },
        },
      });
      const res = createMockResponse();

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'processing' });
    });

    it('should handle unknown events', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      controller = new FeishuController();

      const req = createMockRequest({ unknown: 'event' });
      const res = createMockResponse();

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ignored' });
    });

    it('should handle errors gracefully', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      controller = new FeishuController();

      const req = createMockRequest(null);
      const res = createMockResponse();

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Internal server error' })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      controller = new FeishuController();

      const req = createMockRequest({});
      const res = createMockResponse();

      await controller.healthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(String),
        })
      );
    });

    it('should return unhealthy status on error', async () => {
      // Clear environment variables to trigger config error
      process.env.FEISHU_APP_ID = '';
      process.env.FEISHU_APP_SECRET = '';
      process.env.AGENT_API_KEY = '';
      resetConfig();

      // Create a new controller instance after clearing config
      const testController = new FeishuController();
      const req = createMockRequest({});
      const res = createMockResponse();

      await testController.healthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
        })
      );
    });
  });
});
