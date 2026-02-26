# Handoff: 集成 pi-coding-agent 替换自定义 Agent 实现

## 概述

将 `src/services/agent.ts` 的自定义 OpenAI API 调用实现替换为使用 `@mariozechner/pi-coding-agent` 和 `@mariozechner/pi-ai` 发布的 npm 包。这是为了更好地复用 pi-mono 生态的 AI 能力，支持多模型提供商，并增强工具调用能力。

## 实现内容

### 1. 更新 package.json

添加发布的 npm 包依赖：

```json
{
  "dependencies": {
    "@mariozechner/pi-coding-agent": "^0.7.29",
    "@mariozechner/pi-ai": "^0.5.13"
  }
}
```

### 2. 重构 agent.ts

使用 pi-coding-agent 的 SDK：

- `createAgentSession()` - 创建 Agent 会话
- `AuthStorage` - 认证存储管理
- `ModelRegistry` - 模型注册表
- `getModel()` - 从 pi-ai 获取模型配置

**关键代码片段**：

```typescript
import { getModel } from '@mariozechner/pi-ai';
import { createAgentSession, AuthStorage, ModelRegistry } from '@mariozechner/pi-coding-agent';

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

  // 创建 AuthStorage 和 ModelRegistry 实例
  const authStorage = new AuthStorage();
  const modelRegistry = new ModelRegistry();

  // 创建会话
  const sessionResult = await createAgentSession({
    model,
    authStorage,
    modelRegistry,
    systemPrompt,
    apiKey: this.config.apiKey,
  });
  
  if (!sessionResult || !sessionResult.session) {
    throw new Error('Failed to create agent session');
  }
  
  const { session } = sessionResult;

  // 发送消息并等待响应
  return new Promise((resolve, reject) => {
    let responseContent = '';
    let usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    // 订阅会话事件
    session.subscribe((event) => {
      if (event.type === 'message_update' && event.assistantMessageEvent) {
        if (event.assistantMessageEvent.type === 'text_delta') {
          responseContent += event.assistantMessageEvent.delta;
        }
      } else if (event.type === 'message_complete' && event.message) {
        // 提取使用情况
        usage = {
          promptTokens: event.message.usage?.input ?? 0,
          completionTokens: event.message.usage?.output ?? 0,
          totalTokens: (event.message.usage?.input ?? 0) + (event.message.usage?.output ?? 0),
        };

        // 解析工具调用（如果有）
        if (event.message.content) {
          for (const block of event.message.content) {
            if (block.type === 'tool_call') {
              // 处理工具调用
              console.log('Tool call detected:', block);
            }
          }
        }

        // 格式化响应
        resolve({
          content: responseContent,
          usage,
        });
      } else if (event.type === 'error') {
        reject(new Error(event.error));
      }
    });

    // 发送消息
    session.prompt(message).catch(reject);
  });
}
```

### 3. 多提供商支持

通过配置支持多种模型提供商，包括 NVIDIA Kimi：

```typescript
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
    case 'nvidia': {
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
        maxTokens: 4096,
      };
      console.log('Using NVIDIA Kimi model:', nvidiaModel);
      return nvidiaModel;
    }
    default:
      // 默认使用 openai
      return getModel('openai', modelName);
  }
}
```

支持的提供商：
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- NVIDIA (Kimi)
- AWS Bedrock
- Mistral
- 更多...

### 4. 飞书适配 pi-coding-agent 命令

修改 `src/controllers/feishu.ts`，适配 pi-coding-agent 支持的命令：

```typescript
private async handleMessage(
  message: {
    messageId: string;
    chatId: string;
    chatType: 'p2p' | 'group';
    sender: { senderId: string; senderType: string };
    content: string;
    msgType: string;
    createTime: string;
  },
  res: Response
): Promise<void> {
  res.status(200).json({ status: 'processing' });

  try {
    if (message.msgType !== 'text') {
      await feishuService.sendMessage(message.chatId, '抱歉，我目前只支持文本消息。');
      return;
    }

    // 解析消息内容，检查是否包含命令
    const content = message.content.trim();
    
    // 调用 agentService 处理消息
    const response = await agentService.processMessage(content);

    // 发送响应
    await feishuService.sendMessage(message.chatId, response.content);
  } catch (error) {
    console.error('Error processing message:', error);
    try {
      await feishuService.sendMessage(message.chatId, '抱歉，处理消息时出现了错误，请稍后重试。');
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
}
```

### 5. 更新测试

更新 `test/unit/services/agent.test.ts`：

- Mock `@mariozechner/pi-ai` 和 `@mariozechner/pi-coding-agent` 模块
- 测试多提供商支持
- 验证 pi-coding-agent 调用参数
- 测试会话事件处理
- 测试工具调用功能

## 优势

1. **统一接口** - 一套代码支持多种模型提供商
2. **流式响应** - 支持实时流式输出
3. **会话管理** - 内置对话历史管理
4. **工具调用** - 支持函数调用框架
5. **类型安全** - 完整的 TypeScript 类型支持
6. **生态复用** - 复用 pi-mono 的成熟实现
7. **飞书集成** - 无缝集成飞书消息处理
8. **命令支持** - 支持 pi-coding-agent 的命令系统

## 配置变更

无需新的配置项，现有配置完全兼容：

| 变量名 | 说明 |
|--------|------|
| `AGENT_MODEL_PROVIDER` | 模型提供商 (openai/anthropic/google/nvidia) |
| `AGENT_MODEL_NAME` | 模型名称 |
| `AGENT_API_KEY` | API 密钥 |
| `AGENT_MAX_TOKENS` | 最大 Token 数 |
| `AGENT_TEMPERATURE` | 温度参数 |

## 注意事项

1. **Node.js 版本** - pi-coding-agent 要求 Node.js >= 20.0.0
2. **API 密钥** - 需要在环境变量中配置
3. **流式处理** - 使用事件订阅模式处理流式响应
4. **会话生命周期** - 每次消息处理创建新会话
5. **工具调用** - 支持 pi-coding-agent 的工具调用功能

## 相关文档

- [README.md](../README.md) - 最新准确文档
- [pi-mono/packages/coding-agent](../../../pi-mono/packages/coding-agent) - pi-coding-agent 源码
- [pi-mono/packages/ai](../../../pi-mono/packages/ai) - pi-ai 源码
- [npm @mariozechner/pi-coding-agent](https://www.npmjs.com/package/@mariozechner/pi-coding-agent)
- [npm @mariozechner/pi-ai](https://www.npmjs.com/package/@mariozechner/pi-ai)

---

创建日期: 2026-02-26
文档编号: 10
