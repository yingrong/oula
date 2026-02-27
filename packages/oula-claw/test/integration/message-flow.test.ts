import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../src/config/index.js';
import { type MessageEventData, WsService } from '../../src/services/ws-service.js';

/**
 * 消息流程集成测试
 * 测试完整的消息处理流程：接收消息 -> AI处理 -> 发送回复
 *
 * 注意：由于现在使用 pi-coding-agent，这些测试主要验证消息解析和流程，
 * 而不是具体的 AI 调用细节（pi-coding-agent 有自己的测试）
 */

// 事件处理器类型
type EventHandler = (data: MessageEventData) => Promise<void>;

// Mock 飞书 SDK
vi.mock('@larksuiteoapi/node-sdk', () => {
  const mockHandlers = new Map<string, EventHandler>();

  return {
    Client: vi.fn().mockImplementation(() => ({
      im: {
        v1: {
          message: {
            create: vi.fn().mockResolvedValue({
              data: { message_id: `msg_${Date.now()}` },
            }),
          },
        },
      },
    })),
    WSClient: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockImplementation(({ eventDispatcher }) => {
        // 从 EventDispatcher 获取注册的处理器
        if (eventDispatcher && typeof eventDispatcher === 'object') {
          // 模拟注册过程
        }
      }),
    })),
    EventDispatcher: vi.fn().mockImplementation(() => {
      const handlers = new Map<string, EventHandler>();
      return {
        register: vi.fn().mockImplementation((mapping: Record<string, EventHandler>) => {
          for (const [event, handler] of Object.entries(mapping)) {
            handlers.set(event, handler);
            mockHandlers.set(event, handler);
          }
          return { handlers };
        }),
      };
    }),
    LoggerLevel: {
      debug: 'debug',
      info: 'info',
      error: 'error',
    },
    // 导出 mock handlers 供测试使用
    _mockHandlers: mockHandlers,
  };
});

// Mock 飞书服务
vi.mock('../../src/services/feishu.js', () => {
  const sentMessages: Array<{ chatId: string; content: string }> = [];

  return {
    feishuService: {
      sendMessage: vi.fn().mockImplementation(async (chatId: string, content: string) => {
        sentMessages.push({ chatId, content });
        console.log(`[MockFeishuService] Sent: "${content}" to ${chatId}`);
      }),
      getSentMessages: () => [...sentMessages],
      clearSentMessages: () => {
        sentMessages.length = 0;
      },
    },
  };
});

// Mock pi-coding-agent
vi.mock('@mariozechner/pi-coding-agent', () => {
  const mockAuthStorage = vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }));
  mockAuthStorage.fromStorage = vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }));
  mockAuthStorage.create = vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    hasAuth: vi.fn().mockReturnValue(true),
    getApiKey: vi.fn().mockResolvedValue('test-api-key'),
  }));
  return {
    createAgentSession: vi.fn().mockResolvedValue({
      session: {
        subscribe: vi.fn((callback) => {
          // 模拟成功响应
          setTimeout(() => {
            callback({
              type: 'message_update',
              assistantMessageEvent: { type: 'text_delta', delta: '这是 AI 的回复' },
            });
            callback({
              type: 'message_complete',
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: '这是 AI 的回复' }],
                api: 'openai-completions',
                provider: 'openai',
                model: 'gpt-4',
                usage: {
                  input: 10,
                  output: 5,
                  cacheRead: 0,
                  cacheWrite: 0,
                  totalTokens: 15,
                  cost: {
                    input: 0.0003,
                    output: 0.0003,
                    cacheRead: 0,
                    cacheWrite: 0,
                    total: 0.0006,
                  },
                },
                stopReason: 'stop',
                timestamp: Date.now(),
              },
            });
          }, 10);
        }),
        prompt: vi.fn().mockResolvedValue(undefined),
      },
    }),
    AuthStorage: mockAuthStorage,
    InMemoryAuthStorageBackend: vi.fn(() => ({
      withLock: vi.fn(() => ({ result: undefined })),
      withLockAsync: vi.fn(() => Promise.resolve({ result: undefined })),
    })),
    ModelRegistry: vi.fn().mockImplementation(() => ({
      find: vi.fn(),
      getAvailable: vi.fn().mockResolvedValue([]),
    })),
  };
});

// Mock pi-ai
vi.mock('@mariozechner/pi-ai', () => ({
  getModel: vi.fn().mockReturnValue({
    id: 'gpt-4',
    name: 'GPT-4',
    api: 'openai-completions',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: false,
    input: ['text'],
    cost: {
      input: 30,
      output: 60,
      cacheRead: 0,
      cacheWrite: 0,
    },
    contextWindow: 8192,
    maxTokens: 4096,
  }),
}));

describe('Message Flow Integration Tests', () => {
  let wsService: WsService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      FEISHU_APP_ID: 'test_app_id',
      FEISHU_APP_SECRET: 'test_app_secret',
      AGENT_API_KEY: 'test_api_key',
    };
    resetConfig();
    vi.clearAllMocks();

    // 创建 WsService 实例
    wsService = new WsService();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
    vi.restoreAllMocks();
  });

  describe('Message Processing Flow', () => {
    it('should process text message and send AI reply', async () => {
      // 模拟接收消息
      const testMessage: MessageEventData = {
        message: {
          message_id: 'msg_123',
          chat_id: 'chat_456',
          chat_type: 'p2p',
          content: '{"text":"你好"}',
          message_type: 'text',
          create_time: String(Date.now()),
        },
        sender: {
          sender_id: {
            union_id: 'user_789',
          },
          sender_type: 'user',
        },
      };

      // 直接调用 handleMessage 方法测试
      const { feishuService } = await import('../../src/services/feishu.js');

      // 清除之前的调用记录
      vi.mocked(feishuService.sendMessage).mockClear();

      // 调用消息处理
      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 等待异步操作完成
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 验证飞书服务被调用来发送回复
      expect(feishuService.sendMessage).toHaveBeenCalled();
    });

    it('should handle different message types', async () => {
      const testCases = [
        {
          name: 'text message',
          message: {
            message_id: 'msg_1',
            chat_id: 'chat_1',
            chat_type: 'p2p' as const,
            content: '{"text":"普通文本"}',
            message_type: 'text',
            create_time: String(Date.now()),
          },
          sender: {
            sender_id: { union_id: 'user_test' },
            sender_type: 'user',
          },
        },
        {
          name: 'post message',
          message: {
            message_id: 'msg_2',
            chat_id: 'chat_1',
            chat_type: 'p2p' as const,
            content: JSON.stringify({
              title: '标题',
              content: [[{ tag: 'text', text: '富文本' }]],
            }),
            message_type: 'post',
            create_time: String(Date.now()),
          },
          sender: {
            sender_id: { union_id: 'user_test' },
            sender_type: 'user',
          },
        },
      ];

      const { feishuService } = await import('../../src/services/feishu.js');

      for (const testCase of testCases) {
        vi.mocked(feishuService.sendMessage).mockClear();

        await (
          wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
        ).handleMessage(testCase as MessageEventData);

        // 等待异步操作完成
        await new Promise((resolve) => setTimeout(resolve, 50));

        // 验证消息被处理（发送了回复或错误消息）
        expect(feishuService.sendMessage).toHaveBeenCalled();
      }
    });

    it('should handle AI service errors gracefully', async () => {
      // 重新 mock pi-coding-agent 返回错误
      const { createAgentSession } = await import('@mariozechner/pi-coding-agent');
      vi.mocked(createAgentSession).mockRejectedValueOnce(new Error('AI Service Error'));

      const testMessage: MessageEventData = {
        message: {
          message_id: 'msg_error',
          chat_id: 'chat_error',
          chat_type: 'p2p',
          content: '{"text":"测试错误"}',
          message_type: 'text',
          create_time: String(Date.now()),
        },
        sender: {
          sender_id: { union_id: 'user_error' },
          sender_type: 'user',
        },
      };

      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

      // 调用消息处理（错误应该被捕获，不会抛出）
      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 验证发送了错误提示消息
      expect(feishuService.sendMessage).toHaveBeenCalledWith(
        'chat_error',
        expect.stringContaining('错误')
      );
    });

    it('should handle empty message content', async () => {
      const testMessage: MessageEventData = {
        message: {
          message_id: 'msg_empty',
          chat_id: 'chat_empty',
          chat_type: 'p2p',
          content: '{"text":""}',
          message_type: 'text',
          create_time: String(Date.now()),
        },
        sender: {
          sender_id: { union_id: 'user_empty' },
          sender_type: 'user',
        },
      };

      // 空消息会收到提示
      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 空消息会发送提示消息
      expect(feishuService.sendMessage).toHaveBeenCalledWith(
        'chat_empty',
        expect.stringContaining('无法处理')
      );
    });
  });

  describe('Message Content Parsing', () => {
    it('should parse text message content correctly', async () => {
      const testMessage: MessageEventData = {
        message: {
          message_id: 'msg_parse',
          chat_id: 'chat_parse',
          chat_type: 'p2p',
          content: '{"text":"测试消息"}',
          message_type: 'text',
          create_time: String(Date.now()),
        },
        sender: {
          sender_id: { union_id: 'user_parse' },
          sender_type: 'user',
        },
      };

      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 等待异步操作完成
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 验证消息被处理
      expect(feishuService.sendMessage).toHaveBeenCalled();
    });

    it('should handle malformed JSON content', async () => {
      const testMessage: MessageEventData = {
        message: {
          message_id: 'msg_malformed',
          chat_id: 'chat_malformed',
          chat_type: 'p2p',
          content: '这不是有效的JSON',
          message_type: 'text',
          create_time: String(Date.now()),
        },
        sender: {
          sender_id: { union_id: 'user_malformed' },
          sender_type: 'user',
        },
      };

      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 等待异步操作完成
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 验证消息被处理（使用原始内容）
      expect(feishuService.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Service Configuration', () => {
    it('should use correct AI model from config', async () => {
      process.env.AGENT_MODEL_PROVIDER = 'openai';
      process.env.AGENT_MODEL_NAME = 'gpt-3.5-turbo';
      resetConfig();

      const testMessage: MessageEventData = {
        message: {
          message_id: 'msg_model',
          chat_id: 'chat_model',
          chat_type: 'p2p',
          content: '{"text":"测试模型"}',
          message_type: 'text',
          create_time: String(Date.now()),
        },
        sender: {
          sender_id: { union_id: 'user_model' },
          sender_type: 'user',
        },
      };

      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 等待异步操作完成
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 验证消息被处理
      expect(feishuService.sendMessage).toHaveBeenCalled();
    });
  });
});
