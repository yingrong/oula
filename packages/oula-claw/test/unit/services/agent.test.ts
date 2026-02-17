import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../../src/config/index.js';

// Mock pi-ai and pi-coding-agent modules before importing AgentService
const mockGetModel = vi.fn();
const mockCreateAgentSession = vi.fn();
const mockAuthStorage = vi.fn();
const mockModelRegistry = vi.fn();

vi.mock('@mariozechner/pi-ai', () => ({
  getModel: (...args: any[]) => mockGetModel(...args),
}));

vi.mock('@mariozechner/pi-coding-agent', () => ({
  createAgentSession: (...args: any[]) => mockCreateAgentSession(...args),
  AuthStorage: mockAuthStorage,
  ModelRegistry: mockModelRegistry,
}));

// Import AgentService after mocks are defined
const { AgentService } = await import('../../../src/services/agent.js');

describe('AgentService', () => {
  let service: InstanceType<typeof AgentService>;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
    vi.clearAllMocks();

    // Setup default mocks
    mockGetModel.mockReturnValue({
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
    });

    mockAuthStorage.mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }));

    mockModelRegistry.mockImplementation(() => ({
      find: vi.fn(),
      getAvailable: vi.fn().mockResolvedValue([]),
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
    vi.restoreAllMocks();
  });

  describe('processMessage', () => {
    it('should process message with pi-coding-agent', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MODEL_PROVIDER = 'openai';
      process.env.AGENT_MODEL_NAME = 'gpt-4';

      service = new AgentService();

      // Mock session
      const mockSession = {
        subscribe: vi.fn((callback) => {
          // Simulate message completion
          setTimeout(() => {
            callback({
              type: 'message_update',
              assistantMessageEvent: { type: 'text_delta', delta: 'This is a test response' },
            });
            callback({
              type: 'message_complete',
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: 'This is a test response' }],
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
      };

      mockCreateAgentSession.mockResolvedValue({ session: mockSession });

      const response = await service.processMessage('Hello');

      expect(response.content).toBe('This is a test response');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });

      expect(mockGetModel).toHaveBeenCalledWith('openai', 'gpt-4');
      expect(mockCreateAgentSession).toHaveBeenCalledWith({
        model: expect.any(Object),
        authStorage: expect.any(Object),
        modelRegistry: expect.any(Object),
        systemPrompt: expect.stringContaining('Feishu'),
      });
      expect(mockSession.prompt).toHaveBeenCalledWith('Hello');
    });

    it('should use custom system prompt', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new AgentService();

      const mockSession = {
        subscribe: vi.fn((callback) => {
          setTimeout(() => {
            callback({
              type: 'message_update',
              assistantMessageEvent: { type: 'text_delta', delta: 'Response' },
            });
            callback({
              type: 'message_complete',
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: 'Response' }],
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
      };

      mockCreateAgentSession.mockResolvedValue({ session: mockSession });

      await service.processMessage('Hello', {
        systemPrompt: 'Custom system prompt',
      });

      expect(mockCreateAgentSession).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: 'Custom system prompt',
        })
      );
    });

    it('should throw error when model not found', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MODEL_PROVIDER = 'openai';
      process.env.AGENT_MODEL_NAME = 'non-existent-model';

      service = new AgentService();

      mockGetModel.mockReturnValue(undefined);

      await expect(service.processMessage('Hello')).rejects.toThrow('Model not found');
    });

    it('should throw error on session error', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new AgentService();

      const mockSession = {
        subscribe: vi.fn((callback) => {
          setTimeout(() => {
            callback({
              type: 'error',
              error: 'Session error occurred',
            });
          }, 10);
        }),
        prompt: vi.fn().mockResolvedValue(undefined),
      };

      mockCreateAgentSession.mockResolvedValue({ session: mockSession });

      await expect(service.processMessage('Hello')).rejects.toThrow('Session error occurred');
    });
  });

  describe('processConversation', () => {
    it('should process conversation with multiple messages', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new AgentService();

      const mockSession = {
        subscribe: vi.fn((callback) => {
          setTimeout(() => {
            callback({
              type: 'message_update',
              assistantMessageEvent: { type: 'text_delta', delta: 'Conversation response' },
            });
            callback({
              type: 'message_complete',
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: 'Conversation response' }],
                api: 'openai-completions',
                provider: 'openai',
                model: 'gpt-4',
                usage: {
                  input: 20,
                  output: 10,
                  cacheRead: 0,
                  cacheWrite: 0,
                  totalTokens: 30,
                  cost: {
                    input: 0.0006,
                    output: 0.0006,
                    cacheRead: 0,
                    cacheWrite: 0,
                    total: 0.0012,
                  },
                },
                stopReason: 'stop',
                timestamp: Date.now(),
              },
            });
          }, 10);
        }),
        prompt: vi.fn().mockResolvedValue(undefined),
      };

      mockCreateAgentSession.mockResolvedValue({ session: mockSession });

      const messages = [
        { role: 'user' as const, content: 'First message' },
        { role: 'assistant' as const, content: 'First response' },
        { role: 'user' as const, content: 'Second message' },
      ];

      const response = await service.processConversation(messages);

      expect(response.content).toBe('Conversation response');
      expect(mockSession.prompt).toHaveBeenCalledWith('Second message');
    });

    it('should throw error when no user message in conversation', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new AgentService();

      const messages = [
        { role: 'assistant' as const, content: 'Assistant message' },
        { role: 'system' as const, content: 'System message' },
      ];

      await expect(service.processConversation(messages)).rejects.toThrow('No user message found');
    });
  });

  describe('multi-provider support', () => {
    it('should use anthropic provider when configured', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MODEL_PROVIDER = 'anthropic';
      process.env.AGENT_MODEL_NAME = 'claude-3-opus-20240229';

      service = new AgentService();

      const mockSession = {
        subscribe: vi.fn((callback) => {
          setTimeout(() => {
            callback({
              type: 'message_update',
              assistantMessageEvent: { type: 'text_delta', delta: 'Response' },
            });
            callback({
              type: 'message_complete',
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: 'Response' }],
                api: 'anthropic-messages',
                provider: 'anthropic',
                model: 'claude-3-opus-20240229',
                usage: {
                  input: 10,
                  output: 5,
                  cacheRead: 0,
                  cacheWrite: 0,
                  totalTokens: 15,
                  cost: {
                    input: 0.015,
                    output: 0.075,
                    cacheRead: 0,
                    cacheWrite: 0,
                    total: 0.09,
                  },
                },
                stopReason: 'stop',
                timestamp: Date.now(),
              },
            });
          }, 10);
        }),
        prompt: vi.fn().mockResolvedValue(undefined),
      };

      mockCreateAgentSession.mockResolvedValue({ session: mockSession });

      await service.processMessage('Hello');

      expect(mockGetModel).toHaveBeenCalledWith('anthropic', 'claude-3-opus-20240229');
    });

    it('should use google provider when configured', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MODEL_PROVIDER = 'google';
      process.env.AGENT_MODEL_NAME = 'gemini-pro';

      service = new AgentService();

      const mockSession = {
        subscribe: vi.fn((callback) => {
          setTimeout(() => {
            callback({
              type: 'message_update',
              assistantMessageEvent: { type: 'text_delta', delta: 'Response' },
            });
            callback({
              type: 'message_complete',
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: 'Response' }],
                api: 'google-generative-ai',
                provider: 'google',
                model: 'gemini-pro',
                usage: {
                  input: 10,
                  output: 5,
                  cacheRead: 0,
                  cacheWrite: 0,
                  totalTokens: 15,
                  cost: {
                    input: 0.0005,
                    output: 0.0015,
                    cacheRead: 0,
                    cacheWrite: 0,
                    total: 0.002,
                  },
                },
                stopReason: 'stop',
                timestamp: Date.now(),
              },
            });
          }, 10);
        }),
        prompt: vi.fn().mockResolvedValue(undefined),
      };

      mockCreateAgentSession.mockResolvedValue({ session: mockSession });

      await service.processMessage('Hello');

      expect(mockGetModel).toHaveBeenCalledWith('google', 'gemini-pro');
    });
  });
});
