import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../../src/config/index.js';

// Mock pi-coding-agent and pi-ai modules before importing WsService
const mockAuthStorage = vi.fn();
const mockModelRegistry = vi.fn();

vi.mock('@mariozechner/pi-coding-agent', () => ({
  AuthStorage: {
    fromStorage: vi.fn().mockReturnValue({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      hasAuth: vi.fn().mockReturnValue(true),
      getApiKey: vi.fn().mockResolvedValue('test-api-key'),
    }),
  },
  InMemoryAuthStorageBackend: vi.fn(),
  ModelRegistry: mockModelRegistry,
  createAgentSession: vi.fn().mockResolvedValue({
    session: {
      subscribe: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
    },
  }),
}));

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

// Mock 飞书 SDK
vi.mock('@larksuiteoapi/node-sdk', () => ({
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
    start: vi.fn(),
  })),
  EventDispatcher: vi.fn().mockImplementation(() => ({
    register: vi.fn().mockReturnValue({ handlers: new Map() }),
  })),
  LoggerLevel: {
    debug: 'debug',
    info: 'info',
    error: 'error',
  },
}));

describe('WsService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all environment variables before each test
    process.env = {};
    resetConfig();
    vi.clearAllMocks();

    // Setup AuthStorage mock with create method
    mockAuthStorage.create = vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      hasAuth: vi.fn().mockReturnValue(true),
      getApiKey: vi.fn().mockResolvedValue('test-api-key'),
    }));

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

  describe('Module structure', () => {
    it('should export WsService class', async () => {
      const { WsService } = await import('../../../src/services/ws-service.js');
      expect(WsService).toBeDefined();
      expect(typeof WsService).toBe('function');
    });

    it('should export wsService singleton', async () => {
      const { wsService } = await import('../../../src/services/ws-service.js');
      expect(wsService).toBeDefined();
      expect(typeof wsService.start).toBe('function');
      expect(typeof wsService.stop).toBe('function');
    });

    it('should export MessageEventData interface', async () => {
      // TypeScript interfaces don't exist at runtime, but we can verify the module loads
      const module = await import('../../../src/services/ws-service.js');
      expect(module).toBeDefined();
    });
  });

  describe('Configuration requirements', () => {
    it('should require FEISHU_APP_ID and FEISHU_APP_SECRET', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      resetConfig();

      const { getConfig } = await import('../../../src/config/index.js');
      const config = getConfig();

      expect(config.feishu.appId).toBe('test_app_id');
      expect(config.feishu.appSecret).toBe('test_app_secret');
    });

    it('should not require encryptKey and verificationToken for ws mode', async () => {
      // Explicitly ensure these are not set
      process.env.FEISHU_ENCRYPT_KEY = undefined;
      process.env.FEISHU_VERIFICATION_TOKEN = undefined;

      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      resetConfig();

      const { getConfig } = await import('../../../src/config/index.js');
      const config = getConfig();

      expect(config.feishu.encryptKey).toBeUndefined();
      expect(config.feishu.verificationToken).toBeUndefined();
    });
  });
});
