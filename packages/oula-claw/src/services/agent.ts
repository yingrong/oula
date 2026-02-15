import { getConfig } from '../config/index.js';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AgentOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export class AgentService {
  private get config() {
    return getConfig().agent;
  }

  async processMessage(message: string, options: AgentOptions = {}): Promise<AgentResponse> {
    const { maxTokens, temperature, systemPrompt } = {
      maxTokens: options.maxTokens ?? this.config.maxTokens,
      temperature: options.temperature ?? this.config.temperature,
      systemPrompt: options.systemPrompt ?? this.getDefaultSystemPrompt(),
    };

    const messages: AgentMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    return this.callLLM(messages, { maxTokens, temperature });
  }

  async processConversation(
    messages: AgentMessage[],
    options: AgentOptions = {}
  ): Promise<AgentResponse> {
    const { maxTokens, temperature, systemPrompt } = {
      maxTokens: options.maxTokens ?? this.config.maxTokens,
      temperature: options.temperature ?? this.config.temperature,
      systemPrompt: options.systemPrompt ?? this.getDefaultSystemPrompt(),
    };

    const fullMessages: AgentMessage[] = [{ role: 'system', content: systemPrompt }, ...messages];

    return this.callLLM(fullMessages, { maxTokens, temperature });
  }

  private async callLLM(
    messages: AgentMessage[],
    options: { maxTokens: number; temperature: number }
  ): Promise<AgentResponse> {
    const { modelProvider, modelName, apiKey } = this.config;

    if (modelProvider === 'openai') {
      return this.callOpenAI(messages, options, apiKey, modelName);
    }

    throw new Error(`Unsupported model provider: ${modelProvider}`);
  }

  private async callOpenAI(
    messages: AgentMessage[],
    options: { maxTokens: number; temperature: number },
    apiKey: string,
    modelName: string
  ): Promise<AgentResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    const choice = data.choices[0];
    if (!choice) {
      throw new Error('No response from OpenAI');
    }

    return {
      content: choice.message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  private getDefaultSystemPrompt(): string {
    return `You are a helpful AI assistant integrated with Feishu (Lark). 
Your goal is to assist users by answering their questions, helping with tasks, and providing useful information.
Be concise, professional, and helpful in your responses.`;
  }
}

export const agentService = new AgentService();
