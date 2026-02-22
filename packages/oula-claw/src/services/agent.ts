import { getModel, completeSimple } from '@mariozechner/pi-ai';
import type { AssistantMessage } from '@mariozechner/pi-ai';
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

/**
 * AgentService - 智能代理服务
 *
 * 基于 pi-coding-agent 的 SDK 实现
 * 支持多模型提供商（OpenAI、Anthropic、Google 等）
 */
export class AgentService {
  private get config() {
    return getConfig().agent;
  }

  /**
   * 处理单条消息
   *
   * 使用 pi-ai 的 completeSimple 方法处理消息，支持 tool call 能力
   */
  async processMessage(message: string, options: AgentOptions = {}): Promise<AgentResponse> {
    const { systemPrompt, maxTokens, temperature } = {
      systemPrompt: options.systemPrompt ?? this.getDefaultSystemPrompt(),
      maxTokens: options.maxTokens ?? this.config.maxTokens,
      temperature: options.temperature ?? this.config.temperature,
    };

    // 获取模型
    const model = this.getModel();
    if (!model) {
      throw new Error(`Model not found: ${this.config.modelProvider}/${this.config.modelName}`);
    }

    // 构建上下文
    const context = {
      systemPrompt,
      messages: [
        {
          role: 'user' as const,
          content: message,
          timestamp: Date.now(),
        },
      ],
    } as any;

    // 调用 pi-ai 完成
    const response = await completeSimple(model, context, {
      maxTokens,
      temperature,
      apiKey: this.config.apiKey,
    });

    // 格式化响应
    return this.formatResponse(response);
  }

  /**
   * 处理多轮对话
   *
   * 支持对话历史，使用 pi-ai 的 completeSimple 方法
   */
  async processConversation(
    messages: AgentMessage[],
    options: AgentOptions = {}
  ): Promise<AgentResponse> {
    const { systemPrompt, maxTokens, temperature } = {
      systemPrompt: options.systemPrompt ?? this.getDefaultSystemPrompt(),
      maxTokens: options.maxTokens ?? this.config.maxTokens,
      temperature: options.temperature ?? this.config.temperature,
    };

    // 获取模型
    const model = this.getModel();
    if (!model) {
      throw new Error(`Model not found: ${this.config.modelProvider}/${this.config.modelName}`);
    }

    // 构建上下文
    const context = {
      systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: Date.now(),
      })),
    } as any;

    // 调用 pi-ai 完成
    const response = await completeSimple(model, context, {
      maxTokens,
      temperature,
      apiKey: this.config.apiKey,
    });

    // 格式化响应
    return this.formatResponse(response);
  }

  /**
   * 格式化响应
   *
   * 将 pi-ai 的响应格式化为 AgentResponse 格式
   */
  private formatResponse(assistantMessage: AssistantMessage): AgentResponse {
    // 提取文本内容
    const content = assistantMessage.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    // 提取使用情况
    const usage = {
      promptTokens: assistantMessage.usage?.input ?? 0,
      completionTokens: assistantMessage.usage?.output ?? 0,
      totalTokens: (assistantMessage.usage?.input ?? 0) + (assistantMessage.usage?.output ?? 0),
    };

    return {
      content,
      usage,
    };
  }

  /**
   * 获取模型配置
   *
   * 根据配置返回 pi-ai 的模型对象
   */
  private getModel() {
    const { modelProvider, modelName } = this.config;

    // 使用 pi-ai 的 getModel 获取模型配置
    switch (modelProvider) {
      case 'openai':
        return getModel('openai', modelName as any);
      case 'anthropic':
        return getModel('anthropic', modelName as any);
      case 'google':
        return getModel('google', modelName as any);
      case 'nvidia':
        // NVIDIA Kimi 使用 OpenAI 兼容 API
        const nvidiaModel = {
          id: modelName,
          name: `NVIDIA Kimi ${modelName}`,
          api: 'openai-completions',
          provider: 'nvidia',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          reasoning: true,
          input: ['text', 'image'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 128000,
          maxTokens: 4096
        };
        console.log('Using NVIDIA Kimi model:', nvidiaModel);
        return nvidiaModel as any;
      default:
        // 默认使用 openai
        return getModel('openai', modelName as any);
    }
  }

  private getDefaultSystemPrompt(): string {
    return `You are a helpful AI assistant integrated with Feishu (Lark). 
Your goal is to assist users by answering their questions, helping with tasks, and providing useful information.
Be concise, professional, and helpful in your responses.`;
  }
}

export const agentService = new AgentService();
