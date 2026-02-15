import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getConfig, loadConfig, resetConfig } from '../../../src/config/index.js';

describe('Config Loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
  });

  describe('loadConfig', () => {
    it('should load config from environment variables', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      const config = loadConfig();

      expect(config.feishu.appId).toBe('test_app_id');
      expect(config.feishu.appSecret).toBe('test_app_secret');
      expect(config.agent.apiKey).toBe('test_api_key');
    });

    it('should use default values for optional fields', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.NODE_ENV = undefined;

      const config = loadConfig();

      expect(config.server.port).toBe(3000);
      expect(config.server.nodeEnv).toBe('development');
      expect(config.agent.modelProvider).toBe('openai');
      expect(config.agent.modelName).toBe('gpt-4');
      expect(config.agent.maxTokens).toBe(4096);
      expect(config.agent.temperature).toBe(0.7);
    });

    it('should parse numeric values correctly', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.PORT = '8080';
      process.env.AGENT_MAX_TOKENS = '2048';
      process.env.AGENT_TEMPERATURE = '0.5';

      const config = loadConfig();

      expect(config.server.port).toBe(8080);
      expect(config.agent.maxTokens).toBe(2048);
      expect(config.agent.temperature).toBe(0.5);
    });

    it('should throw error for invalid config', () => {
      process.env.FEISHU_APP_ID = '';
      process.env.FEISHU_APP_SECRET = '';
      process.env.AGENT_API_KEY = '';

      expect(() => loadConfig()).toThrow('Configuration validation failed');
    });

    it('should cache config after first load', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      const config1 = loadConfig();
      const config2 = loadConfig();

      expect(config1).toBe(config2);
    });
  });

  describe('getConfig', () => {
    it('should return cached config if available', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      const config1 = loadConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
    });

    it('should load config if not cached', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      const config = getConfig();

      expect(config.feishu.appId).toBe('test_app_id');
    });
  });

  describe('resetConfig', () => {
    it('should clear cached config', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      const config1 = loadConfig();
      resetConfig();
      const config2 = loadConfig();

      expect(config1).not.toBe(config2);
      expect(config1.feishu.appId).toBe(config2.feishu.appId);
    });
  });
});
