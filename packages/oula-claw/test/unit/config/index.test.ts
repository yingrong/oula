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

      const config = loadConfig();

      expect(config.feishu.appId).toBe('test_app_id');
      expect(config.feishu.appSecret).toBe('test_app_secret');
    });

    it('should use default values for optional fields', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.NODE_ENV = undefined;
      process.env.AGENT_MODEL_PROVIDER = undefined;
      process.env.AGENT_MODEL_NAME = undefined;

      const config = loadConfig();

      expect(config.server.port).toBe(3000);
      expect(config.server.nodeEnv).toBe('development');
      expect(config.agent.modelProvider).toBe('openai');
      expect(config.agent.modelName).toBe('gpt-4');
    });

    it('should parse numeric values correctly', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.PORT = '8080';

      const config = loadConfig();

      expect(config.server.port).toBe(8080);
    });

    it('should throw error for invalid config', () => {
      process.env.FEISHU_APP_ID = '';
      process.env.FEISHU_APP_SECRET = '';

      expect(() => loadConfig()).toThrow('Configuration validation failed');
    });

    it('should cache config after first load', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';

      const config1 = loadConfig();
      const config2 = loadConfig();

      expect(config1).toBe(config2);
    });
  });

  describe('getConfig', () => {
    it('should return cached config if available', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';

      const config1 = loadConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
    });

    it('should load config if not cached', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';

      const config = getConfig();

      expect(config.feishu.appId).toBe('test_app_id');
    });
  });

  describe('resetConfig', () => {
    it('should clear cached config', () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';

      const config1 = loadConfig();
      resetConfig();
      const config2 = loadConfig();

      expect(config1).not.toBe(config2);
      expect(config1.feishu.appId).toBe(config2.feishu.appId);
    });
  });
});
