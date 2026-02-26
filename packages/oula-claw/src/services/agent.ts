import { getModel } from '@mariozechner/pi-ai';
import { getConfig } from '../config/index.js';
import { AuthStorage, ModelRegistry, createAgentSession } from "@mariozechner/pi-coding-agent";

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
 * 基于 pi-ai 的实现
 * 支持多模型提供商（OpenAI、Anthropic、Google、NVIDIA 等）
 */
export class AgentService {
  private get config() {
    return getConfig().agent;
  }

  private authStorage = AuthStorage.create();
  private modelRegistry = new ModelRegistry(this.authStorage);

  /**
   * 处理单条消息
   *
   * 使用 pi-ai 处理消息
   */
  async processMessage(message: string): Promise<AgentResponse> {
    // 获取模型
    const model = this.modelRegistry.find("seed", "doubao-seed-1-6-251015");

    const availableModels = this.modelRegistry.getAvailable();
    console.log('Available models1:', availableModels);
    if (!model) {
      throw new Error(`Model not found: ${this.config.modelProvider}/${this.config.modelName}`);
    }

    const { session } = await createAgentSession({
      model: model,
    });

    session.subscribe((response) => {
      console.log('Agent response:', response);
    });

    await session.prompt(message);

    let response = "";
    session.state.messages.forEach((msg) => {
      console.log('Agent message:', msg);
      if (msg.role === 'assistant') {
        response = msg.content.filter((item) => item.type === 'text').map((item) => item.text).join('') ;
      }
    });

    return {
      content: response,
    };
  }

  /**
   * 处理多轮对话
   *
   * 支持对话历史
   */
  async processConversation(messages: AgentMessage[]): Promise<AgentResponse> {
    // 检查是否有用户消息
    const lastUserMessage = messages.filter((msg) => msg.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('No user message found in conversation');
    }

    // 获取模型
    const model = this.getModel1();
    if (!model) {
      throw new Error(`Model not found: ${this.config.modelProvider}/${this.config.modelName}`);
    }

    // 模拟响应
    return {
      content: `处理对话: ${lastUserMessage.content}`,
      usage: {
        promptTokens: lastUserMessage.content.length,
        completionTokens: 50,
        totalTokens: lastUserMessage.content.length + 50,
      },
    };
  }

  /**
   * 获取模型配置
   *
   * 根据配置返回 pi-ai 的模型对象
   */
  private getModel1() {
    const { modelProvider, modelName } = this.config;

    // 使用 pi-ai 的 getModel 获取模型配置
    switch (modelProvider) {
      case 'openai':
        return getModel('openai', modelName);
      case 'anthropic':
        return getModel('anthropic', modelName);
      case 'google':
        return getModel('google', modelName);
      case 'nvidia': {
        // NVIDIA Kimi 使用 OpenAI 兼容 API
        const nvidiaModel = {
          id: modelName,
          name: `NVIDIA model： ${modelName}`,
          api: 'openai-completions',
          provider: 'openai',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          reasoning: true,
          input: ['text', 'image'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 128000,
          maxTokens: 4096,
        };
        console.log('Using NVIDIA model:', nvidiaModel);
        return nvidiaModel;
      }
      default:
        // 默认使用 openai
        return getModel('openai', modelName);
    }
  }
}

export const agentService = new AgentService();
