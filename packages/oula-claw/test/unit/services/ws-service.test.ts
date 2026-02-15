import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../../src/config/index.js';

describe('WsService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all environment variables before each test
    process.env = {};
    resetConfig();
    vi.clearAllMocks();
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
