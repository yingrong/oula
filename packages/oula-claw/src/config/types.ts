import { z } from 'zod';

export const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
});

export const FeishuConfigSchema = z.object({
  appId: z.string().min(1, 'App ID is required'),
  appSecret: z.string().min(1, 'App Secret is required'),
  encryptKey: z.string().optional(),
  verificationToken: z.string().optional(),
});

export const AgentConfigSchema = z.object({
  modelProvider: z.string().default('openai'),
  modelName: z.string().default('gpt-4'),
});

export const AppConfigSchema = z.object({
  server: ServerConfigSchema,
  feishu: FeishuConfigSchema,
  agent: AgentConfigSchema,
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type FeishuConfig = z.infer<typeof FeishuConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
