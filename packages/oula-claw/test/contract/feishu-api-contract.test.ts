import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * 飞书 API 契约测试
 * 验证飞书事件回调的消息格式是否符合预期
 * 这些测试确保当飞书 API 格式变化时，我们能及时发现
 */

// 定义飞书消息事件的 Zod Schema
const FeishuSenderIdSchema = z.object({
  open_id: z.string(),
  union_id: z.string(),
  user_id: z.string(),
});

const FeishuSenderSchema = z.object({
  sender_id: FeishuSenderIdSchema,
  sender_type: z.string(),
  tenant_key: z.string(),
});

const FeishuMessageSchema = z.object({
  chat_id: z.string(),
  chat_type: z.enum(['p2p', 'group']),
  content: z.string(), // JSON 字符串
  create_time: z.string(),
  message_id: z.string(),
  message_type: z.enum([
    'text',
    'post',
    'image',
    'file',
    'interactive',
    'audio',
    'media',
    'sticker',
  ]),
  update_time: z.string(),
});

const FeishuEventSchema = z.object({
  schema: z.literal('2.0'),
  event_id: z.string(),
  token: z.string(),
  create_time: z.string(),
  event_type: z.string(),
  tenant_key: z.string(),
  app_id: z.string(),
  message: FeishuMessageSchema,
  sender: FeishuSenderSchema,
});

describe('Feishu API Contract Tests', () => {
  describe('Message Event Schema', () => {
    it('should validate text message event structure', () => {
      const validTextMessage = {
        schema: '2.0',
        event_id: '33e3daee8731c059f5d54fea8930178d',
        token: '',
        create_time: '1771163525120',
        event_type: 'im.message.receive_v1',
        tenant_key: '15bcfb356397175e',
        app_id: 'cli_a91b79615378dcd1',
        message: {
          chat_id: 'oc_5cf411d739a442ed5b65c5bf7d89327d',
          chat_type: 'p2p',
          content: '{"text":"你好"}',
          create_time: '1771163524855',
          message_id: 'om_x100b5628b6818ca0b2179914eba1599',
          message_type: 'text',
          update_time: '1771163524855',
        },
        sender: {
          sender_id: {
            open_id: 'ou_2c947db010275c21a07823237d624dcd',
            union_id: 'on_eff400fcf6e7af7c79c1ce3ddf533591',
            user_id: '83g24d2e',
          },
          sender_type: 'user',
          tenant_key: '15bcfb356397175e',
        },
      };

      const result = FeishuEventSchema.safeParse(validTextMessage);
      expect(result.success).toBe(true);
    });

    it('should validate group message event structure', () => {
      const validGroupMessage = {
        schema: '2.0',
        event_id: 'test-event-id',
        token: '',
        create_time: '1771163525120',
        event_type: 'im.message.receive_v1',
        tenant_key: 'test-tenant',
        app_id: 'cli_test',
        message: {
          chat_id: 'oc_group123',
          chat_type: 'group',
          content: '{"text":"群消息"}',
          create_time: '1771163524855',
          message_id: 'om_group_msg',
          message_type: 'text',
          update_time: '1771163524855',
        },
        sender: {
          sender_id: {
            open_id: 'ou_user123',
            union_id: 'on_user123',
            user_id: 'user123',
          },
          sender_type: 'user',
          tenant_key: 'test-tenant',
        },
      };

      const result = FeishuEventSchema.safeParse(validGroupMessage);
      expect(result.success).toBe(true);
    });

    it('should validate different message types', () => {
      const messageTypes = [
        'text',
        'post',
        'image',
        'file',
        'interactive',
        'audio',
        'media',
        'sticker',
      ];

      for (const msgType of messageTypes) {
        const message = {
          schema: '2.0',
          event_id: 'test-event',
          token: '',
          create_time: '1771163525120',
          event_type: 'im.message.receive_v1',
          tenant_key: 'test',
          app_id: 'cli_test',
          message: {
            chat_id: 'oc_test',
            chat_type: 'p2p',
            content: '{}',
            create_time: '1771163524855',
            message_id: 'om_test',
            message_type: msgType,
            update_time: '1771163524855',
          },
          sender: {
            sender_id: {
              open_id: 'ou_test',
              union_id: 'on_test',
              user_id: 'test',
            },
            sender_type: 'user',
            tenant_key: 'test',
          },
        };

        const result = FeishuEventSchema.safeParse(message);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid schema version', () => {
      const invalidMessage = {
        schema: '1.0', // 错误的版本
        event_id: 'test',
        token: '',
        create_time: '1771163525120',
        event_type: 'im.message.receive_v1',
        tenant_key: 'test',
        app_id: 'cli_test',
        message: {
          chat_id: 'oc_test',
          chat_type: 'p2p',
          content: '{}',
          create_time: '1771163524855',
          message_id: 'om_test',
          message_type: 'text',
          update_time: '1771163524855',
        },
        sender: {
          sender_id: {
            open_id: 'ou_test',
            union_id: 'on_test',
            user_id: 'test',
          },
          sender_type: 'user',
          tenant_key: 'test',
        },
      };

      const result = FeishuEventSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const incompleteMessage = {
        schema: '2.0',
        event_id: 'test',
        // 缺少 token
        create_time: '1771163525120',
        event_type: 'im.message.receive_v1',
        tenant_key: 'test',
        app_id: 'cli_test',
        // 缺少 message
        sender: {
          sender_id: {
            open_id: 'ou_test',
            union_id: 'on_test',
            user_id: 'test',
          },
          sender_type: 'user',
          tenant_key: 'test',
        },
      };

      const result = FeishuEventSchema.safeParse(incompleteMessage);
      expect(result.success).toBe(false);
    });

    it('should validate message content JSON format for text messages', () => {
      const textContent = { text: '你好，世界' };
      const contentString = JSON.stringify(textContent);

      expect(() => JSON.parse(contentString)).not.toThrow();
      expect(JSON.parse(contentString)).toEqual(textContent);
    });

    it('should validate rich text (post) message content format', () => {
      const postContent = {
        title: '标题',
        content: [[{ tag: 'text', text: '第一行文字' }], [{ tag: 'text', text: '第二行文字' }]],
      };
      const contentString = JSON.stringify(postContent);

      expect(() => JSON.parse(contentString)).not.toThrow();
      const parsed = JSON.parse(contentString);
      expect(parsed.title).toBe('标题');
      expect(parsed.content).toHaveLength(2);
    });
  });

  describe('Event Types', () => {
    it('should validate im.message.receive_v1 event type', () => {
      const message = {
        schema: '2.0',
        event_id: 'test',
        token: '',
        create_time: '1771163525120',
        event_type: 'im.message.receive_v1',
        tenant_key: 'test',
        app_id: 'cli_test',
        message: {
          chat_id: 'oc_test',
          chat_type: 'p2p',
          content: '{}',
          create_time: '1771163524855',
          message_id: 'om_test',
          message_type: 'text',
          update_time: '1771163524855',
        },
        sender: {
          sender_id: {
            open_id: 'ou_test',
            union_id: 'on_test',
            user_id: 'test',
          },
          sender_type: 'user',
          tenant_key: 'test',
        },
      };

      const result = FeishuEventSchema.safeParse(message);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.event_type).toBe('im.message.receive_v1');
      }
    });
  });
});
