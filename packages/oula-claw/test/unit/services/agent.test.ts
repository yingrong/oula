import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../../src/config/index.js';
import { AgentService } from '../../../src/services/agent.js';

describe('AgentService', () => {
  let service: AgentService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
    service = new AgentService();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
    vi.restoreAllMocks();
  });

  describe('processMessage', () => {
    it('should process message with OpenAI', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MODEL_PROVIDER = 'openai';
      process.env.AGENT_MODEL_NAME = 'gpt-4';

      service = new AgentService();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'This is a test response',
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        }),
      });

      global.fetch = mockFetch as unknown as typeof fetch;

      const response = await service.processMessage('Hello');

      expect(response.content).toBe('This is a test response');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_api_key',
          }),
          body: expect.stringContaining('Hello'),
        })
      );
    });

    it('should use custom options', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new AgentService();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      global.fetch = mockFetch as unknown as typeof fetch;

      await service.processMessage('Hello', {
        maxTokens: 100,
        temperature: 0.5,
        systemPrompt: 'Custom system prompt',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.max_tokens).toBe(100);
      expect(callBody.temperature).toBe(0.5);
      expect(callBody.messages[0].content).toBe('Custom system prompt');
    });

    it('should use default values from config', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MAX_TOKENS = '2048';
      process.env.AGENT_TEMPERATURE = '0.8';

      service = new AgentService();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      global.fetch = mockFetch as unknown as typeof fetch;

      await service.processMessage('Hello');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.max_tokens).toBe(2048);
      expect(callBody.temperature).toBe(0.8);
    });

    it('should throw error on API failure', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new AgentService();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        text: async () => 'API Error',
      });

      global.fetch = mockFetch as unknown as typeof fetch;

      await expect(service.processMessage('Hello')).rejects.toThrow('OpenAI API error');
    });

    it('should throw error for unsupported provider', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';
      process.env.AGENT_MODEL_PROVIDER = 'unsupported';

      service = new AgentService();

      await expect(service.processMessage('Hello')).rejects.toThrow('Unsupported model provider');
    });
  });

  describe('processConversation', () => {
    it('should process conversation with multiple messages', async () => {
      process.env.FEISHU_APP_ID = 'test_app_id';
      process.env.FEISHU_APP_SECRET = 'test_app_secret';
      process.env.AGENT_API_KEY = 'test_api_key';

      service = new AgentService();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Conversation response' } }],
        }),
      });

      global.fetch = mockFetch as unknown as typeof fetch;

      const messages = [
        { role: 'user' as const, content: 'First message' },
        { role: 'assistant' as const, content: 'First response' },
        { role: 'user' as const, content: 'Second message' },
      ];

      const response = await service.processConversation(messages);

      expect(response.content).toBe('Conversation response');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages).toHaveLength(4); // system + 3 conversation messages
      expect(callBody.messages[1].content).toBe('First message');
      expect(callBody.messages[2].content).toBe('First response');
      expect(callBody.messages[3].content).toBe('Second message');
    });
  });
});
