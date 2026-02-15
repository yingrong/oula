import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../src/config/index.js';
import { type MessageEventData, WsService } from '../../src/services/ws-service.js';
import { createMockOpenAI, setupCommonResponses } from '../mocks/mock-openai.js';

/**
 * 消息流程集成测试
 * 测试完整的消息处理流程：接收消息 -> AI处理 -> 发送回复
 * 使用 Mock 外部服务（飞书 SDK、OpenAI API）
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

describe('Message Flow Integration Tests', () => {
  let wsService: WsService;
  let mockOpenAI: ReturnType<typeof createMockOpenAI>;
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

    // 设置 Mock OpenAI
    mockOpenAI = createMockOpenAI();
    global.fetch = mockOpenAI.mockFetch;
    setupCommonResponses(mockOpenAI._mockClient);

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

      // 验证 AI 被调用
      expect(mockOpenAI.mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_api_key',
          }),
        })
      );

      // 验证回复被发送
      expect(feishuService.sendMessage).toHaveBeenCalledWith(
        'chat_456',
        expect.stringContaining('你好')
      );
    });

    it('should handle different message types', async () => {
      const { feishuService } = await import('../../src/services/feishu.js');

      const testCases = [
        {
          type: 'text',
          content: '{"text":"普通文本"}',
          expectedReply: expect.any(String),
        },
        {
          type: 'post',
          content: '{"title":"标题","content":[[{"tag":"text","text":"富文本"}]]}',
          expectedReply: expect.any(String),
        },
      ];

      for (const testCase of testCases) {
        vi.mocked(feishuService.sendMessage).mockClear();

        const testMessage: MessageEventData = {
          message: {
            message_id: `msg_${testCase.type}`,
            chat_id: 'chat_test',
            chat_type: 'p2p',
            content: testCase.content,
            message_type: testCase.type,
            create_time: String(Date.now()),
          },
          sender: {
            sender_id: { union_id: 'user_test' },
            sender_type: 'user',
          },
        };

        await (
          wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
        ).handleMessage(testMessage);

        // 验证有回复被发送
        expect(feishuService.sendMessage).toHaveBeenCalled();
      }
    });

    it('should handle AI service errors gracefully', async () => {
      // 设置 AI 失败模式
      mockOpenAI._mockClient.setShouldFail(true, new Error('AI service unavailable'));

      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

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

      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 验证发送了错误提示
      expect(feishuService.sendMessage).toHaveBeenCalledWith(
        'chat_error',
        '抱歉，处理消息时出现了错误，请稍后重试。'
      );
    });

    it('should handle empty message content', async () => {
      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

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

      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 验证发送了无法处理的提示
      expect(feishuService.sendMessage).toHaveBeenCalledWith(
        'chat_empty',
        '抱歉，我无法处理这条消息的内容。'
      );
    });
  });

  describe('Message Content Parsing', () => {
    it('should parse text message content correctly', async () => {
      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

      // 设置特定响应
      mockOpenAI._mockClient.setResponse('测试消息', '这是测试回复');

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

      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 验证 AI 收到了正确的消息内容
      const requestHistory = mockOpenAI._mockClient.getRequestHistory();
      expect(requestHistory.length).toBeGreaterThan(0);

      const lastRequest = requestHistory[requestHistory.length - 1];
      const userMessage = lastRequest.messages.find((m) => m.role === 'user');
      expect(userMessage?.content).toBe('测试消息');
    });

    it('should handle malformed JSON content', async () => {
      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

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

      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 验证仍然处理了消息（使用原始内容）
      expect(feishuService.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Service Configuration', () => {
    it('should use correct AI model from config', async () => {
      process.env.AGENT_MODEL_NAME = 'gpt-3.5-turbo';
      resetConfig();

      const { feishuService } = await import('../../src/services/feishu.js');
      vi.mocked(feishuService.sendMessage).mockClear();

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

      await (
        wsService as unknown as { handleMessage: (data: MessageEventData) => Promise<void> }
      ).handleMessage(testMessage);

      // 验证使用了正确的模型
      const fetchCalls = mockOpenAI.mockFetch.mock.calls;
      expect(fetchCalls.length).toBeGreaterThan(0);

      const requestBody = JSON.parse(fetchCalls[0][1].body);
      expect(requestBody.model).toBe('gpt-3.5-turbo');
    });
  });
});
