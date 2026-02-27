import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { AuthStorage, ModelRegistry } from '@mariozechner/pi-coding-agent';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Models Config Priority and Merging', () => {
  const projectModelsPath = join(process.cwd(), '.pi', 'agent', 'models.json');
  const userModelsPath = join(homedir(), '.pi', 'agent', 'models.json');
  let originalProjectModelsContent: string | null = null;
  let originalUserModelsContent: string | null = null;

  beforeEach(() => {
    // Create .pi/agent directory if it doesn't exist for project
    const projectAgentDir = join(process.cwd(), '.pi', 'agent');
    try {
      mkdirSync(projectAgentDir, { recursive: true });
    } catch (_error) {
      // Directory already exists
    }

    // Create .pi/agent directory if it doesn't exist for user
    const userAgentDir = join(homedir(), '.pi', 'agent');
    try {
      mkdirSync(userAgentDir, { recursive: true });
    } catch (_error) {
      // Directory already exists
    }

    // Save original content if it exists for project
    try {
      originalProjectModelsContent = readFileSync(projectModelsPath, 'utf8');
    } catch (_error) {
      // File doesn't exist
      originalProjectModelsContent = null;
    }

    // Save original content if it exists for user
    try {
      originalUserModelsContent = readFileSync(userModelsPath, 'utf8');
    } catch (_error) {
      // File doesn't exist
      originalUserModelsContent = null;
    }
  });

  afterEach(() => {
    // Restore original content for project
    if (originalProjectModelsContent) {
      writeFileSync(projectModelsPath, originalProjectModelsContent);
    } else {
      // Delete test file if it was created
      try {
        unlinkSync(projectModelsPath);
      } catch (_error) {
        // File doesn't exist
      }
    }

    // Restore original content for user
    if (originalUserModelsContent) {
      writeFileSync(userModelsPath, originalUserModelsContent);
    } else {
      // Delete test file if it was created
      try {
        unlinkSync(userModelsPath);
      } catch (_error) {
        // File doesn't exist
      }
    }
  });

  it('should load user config when multiple config files exist', async () => {
    // Create user config with specific provider
    const userConfig = {
      providers: {
        user: {
          baseUrl: 'https://user-api.example.com/v1',
          api: 'openai-completions',
          apiKey: 'USER_API_KEY',
          models: [
            {
              id: 'user-model',
              name: 'User Model',
              reasoning: true,
              input: ['text'],
              contextWindow: 128000,
              maxTokens: 4096,
            },
          ],
        },
      },
    };

    // Create project config with different provider
    const projectConfig = {
      providers: {
        project: {
          baseUrl: 'https://project-api.example.com/v1',
          api: 'openai-completions',
          apiKey: 'PROJECT_API_KEY',
          models: [
            {
              id: 'project-model',
              name: 'Project Model',
              reasoning: false,
              input: ['text', 'image'],
              contextWindow: 64000,
              maxTokens: 2048,
            },
          ],
        },
      },
    };

    // Write configs
    writeFileSync(userModelsPath, JSON.stringify(userConfig, null, 2));
    writeFileSync(projectModelsPath, JSON.stringify(projectConfig, null, 2));

    // Create ModelRegistry
    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);

    // Get available models
    const availableModels = modelRegistry.getAvailable();
    console.log('Available models from multiple configs:', availableModels);

    // User config should be loaded
    expect(availableModels).toBeDefined();
    expect(Array.isArray(availableModels)).toBe(true);

    // Check if user model is present (user config takes precedence)
    const userModel = modelRegistry.find('user', 'user-model');

    expect(userModel).toBeDefined();
    expect(userModel?.name).toBe('User Model');
  });

  it('should resolve conflicts by using user config over project config', async () => {
    // Create user config with specific model
    const userConfig = {
      providers: {
        test: {
          baseUrl: 'https://user-api.example.com/v1',
          api: 'openai-completions',
          apiKey: 'USER_API_KEY',
          models: [
            {
              id: 'test-model',
              name: 'Test Model (User Config)',
              reasoning: true,
              input: ['text'],
              contextWindow: 128000,
              maxTokens: 4096,
            },
          ],
        },
      },
    };

    // Write user config
    writeFileSync(userModelsPath, JSON.stringify(userConfig, null, 2));

    // Create ModelRegistry
    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);

    // Get the user model
    const testModel = modelRegistry.find('test', 'test-model');
    console.log('Resolved test model (should be user config):', testModel);

    // User config should be used
    expect(testModel).toBeDefined();
    expect(testModel?.name).toBe('Test Model (User Config)');
    expect(testModel?.reasoning).toBe(true);
    expect(testModel?.input).toEqual(['text']);
    expect(testModel?.contextWindow).toBe(128000);
    expect(testModel?.maxTokens).toBe(4096);
  });

  it('should return empty when only project config exists', async () => {
    // Create project config
    const projectConfig = {
      providers: {
        test: {
          baseUrl: 'https://project-api.example.com/v1',
          api: 'openai-completions',
          apiKey: 'PROJECT_API_KEY',
          models: [
            {
              id: 'test-model',
              name: 'Test Model (Project Config)',
              reasoning: false,
              input: ['text', 'image'],
              contextWindow: 64000,
              maxTokens: 2048,
            },
          ],
        },
      },
    };

    // Write project config
    writeFileSync(projectModelsPath, JSON.stringify(projectConfig, null, 2));

    // Ensure no user config exists
    try {
      unlinkSync(userModelsPath);
    } catch (_error) {
      // File doesn't exist
    }

    // Create ModelRegistry
    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);

    // Get available models
    const availableModels = modelRegistry.getAvailable();
    console.log('Available models from project config only:', availableModels);

    // Check if test model is available
    const testModel = modelRegistry.find('test', 'test-model');
    console.log('Found test model from project config:', testModel);

    // Project config alone is not loaded
    expect(availableModels).toEqual([]);
    expect(testModel).toBeUndefined();
  });

  it('should use user config when only user config exists', async () => {
    // Create user config
    const userConfig = {
      providers: {
        test: {
          baseUrl: 'https://user-api.example.com/v1',
          api: 'openai-completions',
          apiKey: 'USER_API_KEY',
          models: [
            {
              id: 'test-model',
              name: 'Test Model (User Config)',
              reasoning: true,
              input: ['text'],
              contextWindow: 128000,
              maxTokens: 4096,
            },
          ],
        },
      },
    };

    // Write user config
    writeFileSync(userModelsPath, JSON.stringify(userConfig, null, 2));

    // Ensure no project config exists
    try {
      unlinkSync(projectModelsPath);
    } catch (_error) {
      // File doesn't exist
    }

    // Create ModelRegistry
    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);

    // Get available models
    const availableModels = modelRegistry.getAvailable();
    console.log('Available models from user config only:', availableModels);

    // Check if test model is available
    const testModel = modelRegistry.find('test', 'test-model');
    console.log('Found test model from user config:', testModel);

    // User config should be used
    expect(testModel).toBeDefined();
    expect(testModel?.name).toBe('Test Model (User Config)');
  });

  it('should return empty when no config files exist', async () => {
    // Remove all config files
    try {
      unlinkSync(projectModelsPath);
    } catch (_error) {
      // File doesn't exist
    }

    try {
      unlinkSync(userModelsPath);
    } catch (_error) {
      // File doesn't exist
    }

    // Create ModelRegistry
    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);

    // Get available models
    const availableModels = modelRegistry.getAvailable();
    console.log('Available models with no configs:', availableModels);

    expect(availableModels).toBeDefined();
    expect(Array.isArray(availableModels)).toBe(true);
    expect(availableModels.length).toBe(0);
  });

  it('should load only user config when multiple providers exist', async () => {
    // Create user config with one provider
    const userConfig = {
      providers: {
        user: {
          baseUrl: 'https://user-api.example.com/v1',
          api: 'openai-completions',
          apiKey: 'USER_API_KEY',
          models: [
            {
              id: 'user-model',
              name: 'User Model',
              reasoning: true,
              input: ['text'],
              contextWindow: 128000,
              maxTokens: 4096,
            },
          ],
        },
      },
    };

    // Create project config with different provider
    const projectConfig = {
      providers: {
        project: {
          baseUrl: 'https://project-api.example.com/v1',
          api: 'openai-completions',
          apiKey: 'PROJECT_API_KEY',
          models: [
            {
              id: 'project-model',
              name: 'Project Model',
              reasoning: false,
              input: ['text', 'image'],
              contextWindow: 64000,
              maxTokens: 2048,
            },
          ],
        },
      },
    };

    // Write configs
    writeFileSync(userModelsPath, JSON.stringify(userConfig, null, 2));
    writeFileSync(projectModelsPath, JSON.stringify(projectConfig, null, 2));

    // Create ModelRegistry
    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);

    // Get available models
    const availableModels = modelRegistry.getAvailable();
    console.log('Available models with partial overrides:', availableModels);

    // Only user model should be available (user config takes precedence)
    const userModel = modelRegistry.find('user', 'user-model');
    const projectModel = modelRegistry.find('project', 'project-model');

    expect(userModel).toBeDefined();
    expect(userModel?.name).toBe('User Model');
    expect(projectModel).toBeUndefined();
  });

  it('should load only user config providers', async () => {
    // Create user config with one provider
    const userConfig = {
      providers: {
        openai: {
          baseUrl: 'https://api.openai.com/v1',
          api: 'openai-completions',
          apiKey: 'USER_OPENAI_KEY',
          models: [
            {
              id: 'gpt-4',
              name: 'GPT-4 (User Config)',
              reasoning: true,
              input: ['text'],
              contextWindow: 128000,
              maxTokens: 4096,
            },
          ],
        },
      },
    };

    // Create project config with another provider
    const projectConfig = {
      providers: {
        anthropic: {
          baseUrl: 'https://api.anthropic.com/v1',
          api: 'anthropic-completions',
          apiKey: 'PROJECT_ANTHROPIC_KEY',
          models: [
            {
              id: 'claude-3',
              name: 'Claude 3 (Project Config)',
              reasoning: true,
              input: ['text', 'image'],
              contextWindow: 200000,
              maxTokens: 100000,
            },
          ],
        },
      },
    };

    // Write configs
    writeFileSync(userModelsPath, JSON.stringify(userConfig, null, 2));
    writeFileSync(projectModelsPath, JSON.stringify(projectConfig, null, 2));

    // Create ModelRegistry
    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);

    // Get available models
    const availableModels = modelRegistry.getAvailable();
    console.log('Available models from merged providers:', availableModels);

    // Only user config providers should be available
    const gptModel = modelRegistry.find('openai', 'gpt-4');
    const claudeModel = modelRegistry.find('anthropic', 'claude-3');

    expect(gptModel).toBeDefined();
    expect(gptModel?.name).toBe('GPT-4 (User Config)');
    expect(claudeModel).toBeUndefined();
  });
});
