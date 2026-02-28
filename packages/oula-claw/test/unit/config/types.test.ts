import { describe, expect, it } from 'vitest';
import {
  AgentConfigSchema,
  AppConfigSchema,
  FeishuConfigSchema,
  ServerConfigSchema,
} from '../../../src/config/types.js';

describe('Config Types', () => {
  describe('ServerConfigSchema', () => {
    it('should validate valid server config', () => {
      const config = { port: 3000, nodeEnv: 'development' as const };
      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = ServerConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(3000);
        expect(result.data.nodeEnv).toBe('development');
      }
    });

    it('should reject invalid port', () => {
      const result = ServerConfigSchema.safeParse({ port: 70000 });
      expect(result.success).toBe(false);
    });
  });

  describe('FeishuConfigSchema', () => {
    it('should validate valid feishu config', () => {
      const config = {
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
        encryptKey: 'test_encrypt_key',
        verificationToken: 'test_verification_token',
      };
      const result = FeishuConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject missing appId', () => {
      const result = FeishuConfigSchema.safeParse({
        appSecret: 'test_app_secret',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing appSecret', () => {
      const result = FeishuConfigSchema.safeParse({
        appId: 'test_app_id',
      });
      expect(result.success).toBe(false);
    });

    it('should allow optional fields to be omitted', () => {
      const result = FeishuConfigSchema.safeParse({
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('AgentConfigSchema', () => {
    it('should validate valid agent config', () => {
      const config = {
        modelProvider: 'openai',
        modelName: 'gpt-4',
      };
      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = AgentConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.modelProvider).toBe('openai');
        expect(result.data.modelName).toBe('gpt-4');
      }
    });
  });

  describe('AppConfigSchema', () => {
    it('should validate complete app config', () => {
      const config = {
        server: { port: 3000, nodeEnv: 'development' as const },
        feishu: {
          appId: 'test_app_id',
          appSecret: 'test_app_secret',
        },
        agent: {},
      };
      const result = AppConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid nested config', () => {
      const config = {
        server: { port: 70000 },
        feishu: {
          appId: 'test_app_id',
          appSecret: 'test_app_secret',
        },
        agent: {},
      };
      const result = AppConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });
});
