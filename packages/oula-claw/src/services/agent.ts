import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getModel } from '@mariozechner/pi-ai';
import {
  AuthStorage,
  InMemoryAuthStorageBackend,
  ModelRegistry,
  createAgentSession,
} from '@mariozechner/pi-coding-agent';
import { getConfig } from '../config/index.js';
import { messageStorageService } from './message-storage.js';

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

  private authStorage = AuthStorage.fromStorage(new InMemoryAuthStorageBackend());
  private modelRegistry = this.createModelRegistry();

  /**
   * 创建 ModelRegistry 实例
   *
   * 优先使用项目级配置文件，如果不存在则使用用户级配置文件
   */
  private createModelRegistry(): ModelRegistry {
    // 检查项目级配置文件
    const projectModelsPath = join(process.cwd(), '.pi', 'agent', 'models.json');
    if (existsSync(projectModelsPath)) {
      console.log(`Using project-level models.json: ${projectModelsPath}`);
      return new ModelRegistry(this.authStorage, projectModelsPath);
    }

    // 使用默认的用户级配置文件
    console.log('Using user-level models.json');
    return new ModelRegistry(this.authStorage);
  }

  /**
   * 处理单条消息
   *
   * 使用 pi-ai 处理消息
   */
  async processMessage(message: string, sessionId?: string): Promise<AgentResponse> {
    // 获取模型
    const model = this.modelRegistry.find(this.config.modelProvider, this.config.modelName);

    // const availableModels = this.modelRegistry.getAvailable();
    // console.log('Available models1:', availableModels);
    if (!model) {
      throw new Error(`Model not found: ${this.config.modelProvider}/${this.config.modelName}`);
    }

    // 如果提供了会话 ID，获取对应的会话管理器
    let sessionManager: ReturnType<typeof messageStorageService.getSession> | undefined;
    if (sessionId) {
      // 从消息存储服务获取会话
      const session = messageStorageService.getSession(sessionId);
      sessionManager = session;
    }

    const { session } = await createAgentSession({
      model: model,
      sessionManager: sessionManager,
    });

    let lastMessage: unknown = null;
    session.subscribe((response) => {
      console.log('Agent response:', response);
      if (response.type === 'message_complete') {
        lastMessage = response.message;
      }
    });

    await session.prompt(message);

    let response = '';
    for (const msg of session.state.messages) {
      console.log('Agent message:', msg);
      if (msg.role === 'assistant') {
        response = msg.content
          .filter((item) => item.type === 'text')
          .map((item) => item.text)
          .join('');
      }
    }

    const usage = lastMessage?.usage
      ? {
          promptTokens: lastMessage.usage.input,
          completionTokens: lastMessage.usage.output,
          totalTokens: lastMessage.usage.totalTokens,
        }
      : undefined;

    return {
      content: response,
      usage,
    };
  }
}

export const agentService = new AgentService();
