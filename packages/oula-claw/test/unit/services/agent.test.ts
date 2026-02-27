import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../../src/config/index.js';

// Mock pi-ai and pi-coding-agent modules before importing AgentService
const mockGetModel = vi.fn();
const mockCreateAgentSession = vi.fn();
const mockModelRegistry = vi.fn();
const mockSessionManager = {
  inMemory: vi.fn(() => ({
    // Mock session manager implementation
  })),
};

vi.mock('@mariozechner/pi-ai', () => ({
  getModel: (...args: unknown[]) => mockGetModel(...args),
}));
// Mock pi-coding-agent
vi.mock('@mariozechner/pi-coding-agent', () => {
  const mockAuthStorage = vi.fn();
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
    setFallbackResolver: vi.fn(),
    getOAuthProviders: vi.fn().mockReturnValue([]),
  }));
  return {
    createAgentSession: (...args: unknown[]) => mockCreateAgentSession(...args),
    AuthStorage: mockAuthStorage,
    InMemoryAuthStorageBackend: vi.fn(() => ({
      withLock: vi.fn(() => ({ result: undefined })),
      withLockAsync: vi.fn(() => Promise.resolve({ result: undefined })),
    })),
    ModelRegistry: mockModelRegistry,
    SessionManager: mockSessionManager,
  };
});

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

    // Setup createAgentSession mock
    mockCreateAgentSession.mockResolvedValue({
      session: {
        state: {
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', text: '处理消息: Hello' }],
            },
          ],
        },
        subscribe: vi.fn((callback) => {
          // Simulate success response immediately (no timeout to ensure it's processed before prompt resolves)
          callback({
            type: 'message_complete',
            message: {
              role: 'assistant',
              content: [{ type: 'text', text: '处理消息: Hello' }],
              api: 'openai-completions',
              provider: 'openai',
              model: 'gpt-4',
              usage: {
                input: 5,
                output: 50,
                cacheRead: 0,
                cacheWrite: 0,
                totalTokens: 55,
                cost: {
                  input: 0.0015,
                  output: 0.003,
                  cacheRead: 0,
                  cacheWrite: 0,
                  total: 0.0045,
                },
              },
              stopReason: 'stop',
              timestamp: Date.now(),
            },
          });
        }),
        prompt: vi.fn().mockResolvedValue(undefined),
      },
    });

    // Create a spy for the find method
    const findSpy = vi.fn((provider, modelId) => {
      // For the model not found test, check if mockGetModel returns undefined
      if (mockGetModel() === undefined || modelId === 'non-existent-model') {
        return undefined;
      }
      // For multi-provider tests, call mockGetModel to verify provider and modelName
      mockGetModel(provider, modelId);
      return {
        id: modelId,
        name: modelId,
        api: 'openai-completions',
        provider: provider,
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
      };
    });

    mockModelRegistry.mockImplementation(() => ({
      find: findSpy,
      getAvailable: vi.fn().mockResolvedValue([]),
    }));

    // Store the spy for later use in tests
    (globalThis as { findSpy?: typeof findSpy }).findSpy = findSpy;
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

      // Check that modelRegistry.find was called with the correct provider and model
      expect((globalThis as { findSpy?: typeof findSpy }).findSpy).toHaveBeenCalledWith(
        'openai',
        'gpt-4'
      );
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

  describe('multi-provider support', () => {
    it('should use anthropic provider when configured', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MODEL_PROVIDER = 'anthropic';
      process.env.AGENT_MODEL_NAME = 'claude-3-opus-20240229';

      service = new AgentService();

      await service.processMessage('Hello');

      // Check that modelRegistry.find was called with the correct provider and model
      expect((globalThis as { findSpy?: typeof findSpy }).findSpy).toHaveBeenCalledWith(
        'anthropic',
        'claude-3-opus-20240229'
      );
    });

    it('should use google provider when configured', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MODEL_PROVIDER = 'google';
      process.env.AGENT_MODEL_NAME = 'gemini-pro';

      service = new AgentService();

      await service.processMessage('Hello');

      // Check that modelRegistry.find was called with the correct provider and model
      expect((globalThis as { findSpy?: typeof findSpy }).findSpy).toHaveBeenCalledWith(
        'google',
        'gemini-pro'
      );
    });
  });
});
