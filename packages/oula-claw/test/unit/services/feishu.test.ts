import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../../src/config/index.js';
import { FeishuService } from '../../../src/services/feishu.js';

describe('FeishuService', () => {
  let service: FeishuService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
    service = new FeishuService();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
    vi.restoreAllMocks();
  });

  describe('verifySignature', () => {
    it('should return true when encrypt key is not set', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.FEISHU_ENCRYPT_KEY = '';

      service = new FeishuService();
      const result = service.verifySignature('timestamp', 'nonce', 'body', 'signature');
      expect(result).toBe(true);
    });

    it('should verify signature correctly', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.FEISHU_ENCRYPT_KEY = 'test_encrypt_key';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new FeishuService();

      const timestamp = '1234567890';
      const nonce = 'test_nonce';
      const body = '{"test": "body"}';
      const content = `${timestamp}${nonce}test_encrypt_key${body}`;

      const crypto = await import('node:crypto');
      const signature = crypto.createHash('sha256').update(content).digest('hex');

      const result = service.verifySignature(timestamp, nonce, body, signature);
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.FEISHU_ENCRYPT_KEY = 'test_encrypt_key';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new FeishuService();

      const result = service.verifySignature('timestamp', 'nonce', 'body', 'invalid_signature');
      expect(result).toBe(false);
    });
  });

  describe('verifyToken', () => {
    it('should return true when verification token is not set', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.FEISHU_VERIFICATION_TOKEN = '';

      service = new FeishuService();
      const result = service.verifyToken('any_token');
      expect(result).toBe(true);
    });

    it('should verify token correctly', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.FEISHU_VERIFICATION_TOKEN = 'correct_token';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new FeishuService();

      expect(service.verifyToken('correct_token')).toBe(true);
      expect(service.verifyToken('wrong_token')).toBe(false);
    });
  });

  describe('parseEvent', () => {
    it('should parse url verification event', () => {
      const body = {
        challenge: 'test_challenge',
        token: 'test_token',
      };

      const event = service.parseEvent(body);

      expect(event.type).toBe('url_verification');
      expect(event.challenge).toBe('test_challenge');
      expect(event.token).toBe('test_token');
    });

    it('should parse message event', () => {
      const body = {
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
            sender_id: {
              union_id: 'user_789',
            },
            sender_type: 'user',
          },
        },
      };

      const event = service.parseEvent(body);

      expect(event.type).toBe('message');
      expect(event.message).toEqual({
        messageId: 'msg_123',
        chatId: 'chat_456',
        chatType: 'p2p',
        sender: {
          senderId: 'user_789',
          senderType: 'user',
        },
        content: 'Hello',
        msgType: 'text',
        createTime: '1234567890',
      });
    });

    it('should parse message content for text type', () => {
      const body = {
        event: {
          message: {
            message_id: 'msg_123',
            chat_id: 'chat_456',
            chat_type: 'group',
            content: '{"text": "Test message"}',
            msg_type: 'text',
            create_time: '1234567890',
          },
          sender: {
            sender_id: {
              union_id: 'user_789',
            },
            sender_type: 'user',
          },
        },
      };

      const event = service.parseEvent(body);

      expect(event.message?.content).toBe('Test message');
    });

    it('should return raw content for non-text type', () => {
      const body = {
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
            sender_id: {
              union_id: 'user_789',
            },
            sender_type: 'user',
          },
        },
      };

      const event = service.parseEvent(body);

      expect(event.message?.content).toBe('{"image_key": "img_123"}');
    });

    it('should return other type for unknown events', () => {
      const body = { unknown: 'event' };

      const event = service.parseEvent(body);

      expect(event.type).toBe('other');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new FeishuService();

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

      await service.sendMessage('chat_123', 'Hello');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token',
          }),
          body: expect.stringContaining('Hello'),
        })
      );
    });

    it('should throw error when send fails', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new FeishuService();

      const mockFetch = vi.fn();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tenant_access_token: 'test_token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: async () => 'Error sending message',
        });

      global.fetch = mockFetch as unknown as typeof fetch;

      await expect(service.sendMessage('chat_123', 'Hello')).rejects.toThrow(
        'Failed to send message'
      );
    });
  });
});
