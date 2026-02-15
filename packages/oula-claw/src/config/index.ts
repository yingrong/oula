import { config } from 'dotenv';
import { type AppConfig, AppConfigSchema } from './types.js';

config();

function loadConfigFromEnv(): AppConfig {
  const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined;

  return {
    server: {
      port,
      nodeEnv: process.env.NODE_ENV as AppConfig['server']['nodeEnv'],
    },
    feishu: {
      appId: process.env.FEISHU_APP_ID || '',
      appSecret: process.env.FEISHU_APP_SECRET || '',
      encryptKey: process.env.FEISHU_ENCRYPT_KEY,
      verificationToken: process.env.FEISHU_VERIFICATION_TOKEN,
    },
    agent: {
      modelProvider: process.env.AGENT_MODEL_PROVIDER,
      modelName: process.env.AGENT_MODEL_NAME,
      apiKey: process.env.AGENT_API_KEY || '',
      maxTokens: process.env.AGENT_MAX_TOKENS
        ? Number.parseInt(process.env.AGENT_MAX_TOKENS, 10)
        : undefined,
      temperature: process.env.AGENT_TEMPERATURE
        ? Number.parseFloat(process.env.AGENT_TEMPERATURE)
        : undefined,
    },
  };
}

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const rawConfig = loadConfigFromEnv();
  const result = AppConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  cachedConfig = result.data;
  return result.data;
}

export function resetConfig(): void {
  cachedConfig = null;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

export * from './types.js';
