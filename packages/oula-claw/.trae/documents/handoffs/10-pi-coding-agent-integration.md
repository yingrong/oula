# Handoff: 集成 pi-coding-agent 替换自定义 Agent 实现

## 概述

将 `src/services/agent.ts` 的自定义 OpenAI API 调用实现替换为使用 `@mariozechner/pi-coding-agent` 和 `@mariozechner/pi-ai` 发布的 npm 包。这是为了更好地复用 pi-mono 生态的 AI 能力，支持多模型提供商。

## 实现内容

### 1. 更新 package.json

添加发布的 npm 包依赖：

```json
{
  "dependencies": {
    "@mariozechner/pi-coding-agent": "^0.7.2",
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
  // 获取模型配置
  const model = this.getModel();
  
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

  // 订阅事件收集响应
  let responseContent = '';
  const messagePromise = new Promise<AgentResponse>((resolve, reject) => {
    session.subscribe((event) => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
        responseContent += event.assistantMessageEvent.delta;
      }
      
      if (event.type === 'message_complete') {
        resolve({ content: responseContent, usage: {...} });
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
```

### 3. 多提供商支持

通过配置支持多种模型提供商：

```typescript
private getModel() {
  const { modelProvider, modelName } = this.config;

  switch (modelProvider) {
    case 'openai':
      return getModel('openai', modelName);
    case 'anthropic':
      return getModel('anthropic', modelName);
    case 'google':
      return getModel('google', modelName);
    default:
      return getModel('openai', modelName);
  }
}
```

支持的提供商：
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- AWS Bedrock
- Mistral
- 更多...

### 4. 更新测试

更新 `test/unit/services/agent.test.ts`：

- Mock `@mariozechner/pi-ai` 和 `@mariozechner/pi-coding-agent` 模块
- 测试多提供商支持
- 验证 pi-coding-agent 调用参数
- 测试会话事件处理

## 优势

1. **统一接口** - 一套代码支持多种模型提供商
2. **流式响应** - 支持实时流式输出
3. **会话管理** - 内置对话历史管理
4. **工具调用** - 支持函数调用框架
5. **类型安全** - 完整的 TypeScript 类型支持
6. **生态复用** - 复用 pi-mono 的成熟实现

## 配置变更

无需新的配置项，现有配置完全兼容：

| 变量名 | 说明 |
|--------|------|
| `AGENT_MODEL_PROVIDER` | 模型提供商 (openai/anthropic/google) |
| `AGENT_MODEL_NAME` | 模型名称 |
| `AGENT_API_KEY` | API 密钥 |
| `AGENT_MAX_TOKENS` | 最大 Token 数 |
| `AGENT_TEMPERATURE` | 温度参数 |

## 注意事项

1. **Node.js 版本** - pi-coding-agent 要求 Node.js >= 20.0.0
2. **API 密钥** - 需要在 `~/.pi/agent/auth.json` 或环境变量中配置
3. **流式处理** - 使用事件订阅模式处理流式响应
4. **会话生命周期** - 每次消息处理创建新会话

## 相关文档

- [README.md](../README.md) - 最新准确文档
- [pi-mono/packages/coding-agent](../../../pi-mono/packages/coding-agent) - pi-coding-agent 源码
- [pi-mono/packages/ai](../../../pi-mono/packages/ai) - pi-ai 源码
- [npm @mariozechner/pi-coding-agent](https://www.npmjs.com/package/@mariozechner/pi-coding-agent)
- [npm @mariozechner/pi-ai](https://www.npmjs.com/package/@mariozechner/pi-ai)

---

创建日期: 2026-02-15
文档编号: 10
