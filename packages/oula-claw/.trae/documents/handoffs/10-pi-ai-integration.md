# Handoff: 集成 pi-ai 替换自定义 Agent 实现

## 概述

将 `src/services/agent.ts` 的自定义 OpenAI API 调用实现替换为使用 `pi-ai` 包的统一 LLM 接口。这是为了更好地复用 pi-mono 的 AI 能力，支持多模型提供商。

## 实现内容

### 1. 更新 package.json

添加 pi-ai 依赖：

```json
{
  "dependencies": {
    "@mariozechner/pi-ai": "file:../pi-mono/packages/ai"
  }
}
```

### 2. 重构 agent.ts

使用 pi-ai 的核心功能：

- `getModel(provider, modelName)` - 获取模型配置
- `completeSimple(model, context, options)` - 简单的对话完成
- 复用 pi-ai 的类型定义（`Context`, `UserMessage`, `AssistantMessage`）

**关键代码片段**：

```typescript
import { completeSimple, getModel } from '@mariozechner/pi-ai';
import type { Context, UserMessage, AssistantMessage } from '@mariozechner/pi-ai';

async processMessage(message: string, options: AgentOptions = {}): Promise<AgentResponse> {
  // 获取模型配置
  const model = this.getModel();

  // 构建上下文
  const userMessage: UserMessage = {
    role: 'user',
    content: message,
    timestamp: Date.now(),
  };

  const context: Context = {
    systemPrompt,
    messages: [userMessage],
  };

  // 调用 pi-ai 完成
  const response = await completeSimple(model, context, {
    maxTokens,
    temperature,
    apiKey: this.config.apiKey,
  });

  return this.formatResponse(response);
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

### 4. 更新测试

更新 `test/unit/services/agent.test.ts`：

- Mock pi-ai 模块
- 测试多提供商支持
- 验证 pi-ai 调用参数

## 优势

1. **统一接口** - 一套代码支持多种模型提供商
2. **类型安全** - 复用 pi-ai 的类型定义
3. **功能丰富** - 自动获得 pi-ai 的优化（重试、超时、错误处理）
4. **易于扩展** - 新增提供商只需更新配置

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

1. **依赖路径** - 使用 `file:../pi-mono/packages/ai` 引用本地 pi-ai 包
2. **Node.js 版本** - pi-ai 要求 Node.js >= 20.0.0
3. **构建要求** - pi-ai 需要预先构建（`npm run build`）

## 相关文档

- [README.md](../README.md) - 最新准确文档
- [pi-mono/packages/ai](../../../pi-mono/packages/ai) - pi-ai 源码

---

创建日期: 2026-02-15
文档编号: 10
