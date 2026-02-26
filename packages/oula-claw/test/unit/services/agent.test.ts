import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../../src/config/index.js';

// Mock pi-ai and pi-coding-agent modules before importing AgentService
const mockGetModel = vi.fn();
const mockCreateAgentSession = vi.fn();
const mockAuthStorage = vi.fn();
const mockModelRegistry = vi.fn();
const mockSessionManager = {
  inMemory: vi.fn(() => ({
    // Mock session manager implementation
  })),
};

vi.mock('@mariozechner/pi-ai', () => ({
  getModel: (...args: unknown[]) => mockGetModel(...args),
}));

vi.mock('@mariozechner/pi-coding-agent', () => ({
  createAgentSession: (...args: unknown[]) => mockCreateAgentSession(...args),
  AuthStorage: mockAuthStorage,
  ModelRegistry: mockModelRegistry,
  SessionManager: mockSessionManager,
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
    it('should process message with pi-ai', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MODEL_PROVIDER = 'openai';
      process.env.AGENT_MODEL_NAME = 'gpt-4';

      service = new AgentService();

      const response = await service.processMessage('Hello');

      expect(response.content).toBe('处理消息: Hello');
      expect(response.usage).toEqual({
        promptTokens: 5,
        completionTokens: 50,
        totalTokens: 55,
      });

      expect(mockGetModel).toHaveBeenCalledWith('openai', 'gpt-4');
    });

    it('should use custom system prompt', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new AgentService();

      const response = await service.processMessage('Hello');

      expect(response.content).toBe('处理消息: Hello');
      expect(response.usage).toEqual({
        promptTokens: 5,
        completionTokens: 50,
        totalTokens: 55,
      });
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
  });

  describe('processConversation', () => {
    it('should process conversation with multiple messages', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new AgentService();

      const messages = [
        { role: 'user' as const, content: 'First message' },
        { role: 'assistant' as const, content: 'First response' },
        { role: 'user' as const, content: 'Second message' },
      ];

      const response = await service.processConversation(messages);

      expect(response.content).toBe('处理对话: Second message');
      expect(response.usage).toEqual({
        promptTokens: 14,
        completionTokens: 50,
        totalTokens: 64,
      });
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

      await service.processMessage('Hello');

      expect(mockGetModel).toHaveBeenCalledWith('google', 'gemini-pro');
    });
  });
});
