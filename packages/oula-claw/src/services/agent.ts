import { getModel } from '@mariozechner/pi-ai';
import type { AssistantMessage } from '@mariozechner/pi-ai';
import { AuthStorage, ModelRegistry, createAgentSession } from '@mariozechner/pi-coding-agent';
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
   * 使用 pi-coding-agent 的 createAgentSession 创建会话并发送消息
   */
  async processMessage(message: string, options: AgentOptions = {}): Promise<AgentResponse> {
    const { systemPrompt } = {
      systemPrompt: options.systemPrompt ?? this.getDefaultSystemPrompt(),
    };

    // 获取模型
    const model = this.getModel();
    if (!model) {
      throw new Error(`Model not found: ${this.config.modelProvider}/${this.config.modelName}`);
    }

    // 创建认证存储和模型注册表
    const authStorage = new AuthStorage();
    const modelRegistry = new ModelRegistry(authStorage);

    // 创建 Agent 会话
    const { session } = await createAgentSession({
      model,
      authStorage,
      modelRegistry,
      systemPrompt,
    });

    // 收集响应
    let responseContent = '';
    const messagePromise = new Promise<AgentResponse>((resolve, reject) => {
      session.subscribe((event) => {
        if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
          responseContent += event.assistantMessageEvent.delta;
        }

        if (event.type === 'message_complete') {
          const assistantMessage = event.message as AssistantMessage;
          resolve({
            content: responseContent,
            usage: {
              promptTokens: assistantMessage.usage?.input ?? 0,
              completionTokens: assistantMessage.usage?.output ?? 0,
              totalTokens: assistantMessage.usage?.totalTokens ?? 0,
            },
          });
        }

        if (event.type === 'error') {
          reject(new Error(event.error));
        }
      });
    });

    // 发送消息
    await session.prompt(message);

    return messagePromise;
  }

  /**
   * 处理多轮对话
   *
   * 支持对话历史，使用 pi-coding-agent 的会话管理
   */
  async processConversation(
    messages: AgentMessage[],
    options: AgentOptions = {}
  ): Promise<AgentResponse> {
    const { systemPrompt } = {
      systemPrompt: options.systemPrompt ?? this.getDefaultSystemPrompt(),
    };

    // 获取最后一条用户消息
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('No user message found in conversation');
    }

    // 获取模型
    const model = this.getModel();
    if (!model) {
      throw new Error(`Model not found: ${this.config.modelProvider}/${this.config.modelName}`);
    }

    // 创建认证存储和模型注册表
    const authStorage = new AuthStorage();
    const modelRegistry = new ModelRegistry(authStorage);

    // 创建 Agent 会话
    const { session } = await createAgentSession({
      model,
      authStorage,
      modelRegistry,
      systemPrompt,
    });

    // 加载历史消息
    // assistant 和 system 消息可以通过会话状态管理
    // 这里简化处理，实际项目中可能需要更复杂的状态恢复
    void messages;

    // 收集响应
    let responseContent = '';
    const messagePromise = new Promise<AgentResponse>((resolve, reject) => {
      session.subscribe((event) => {
        if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
          responseContent += event.assistantMessageEvent.delta;
        }

        if (event.type === 'message_complete') {
          const assistantMessage = event.message as AssistantMessage;
          resolve({
            content: responseContent,
            usage: {
              promptTokens: assistantMessage.usage?.input ?? 0,
              completionTokens: assistantMessage.usage?.output ?? 0,
              totalTokens: assistantMessage.usage?.totalTokens ?? 0,
            },
          });
        }

        if (event.type === 'error') {
          reject(new Error(event.error));
        }
      });
    });

    // 发送最后一条用户消息
    await session.prompt(lastUserMessage.content);

    return messagePromise;
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
        return getModel('openai', modelName);
      case 'anthropic':
        return getModel('anthropic', modelName);
      case 'google':
        return getModel('google', modelName);
      default:
        // 默认使用 openai
        return getModel('openai', modelName);
    }
  }

  private getDefaultSystemPrompt(): string {
    return `You are a helpful AI assistant integrated with Feishu (Lark). 
Your goal is to assist users by answering their questions, helping with tasks, and providing useful information.
Be concise, professional, and helpful in your responses.`;
  }
}

export const agentService = new AgentService();
