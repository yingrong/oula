# Handoff: Agent 服务模块

## 完成内容

### 文件结构
```
src/services/
├── feishu.ts      # 飞书服务（已完成）
└── agent.ts       # Agent 服务

test/unit/services/
└── agent.test.ts  # Agent 服务测试
```

### 核心功能

1. **消息处理** (`processMessage`)
   - 处理单条用户消息
   - 自动添加系统提示词
   - 支持自定义参数（maxTokens、temperature、systemPrompt）

2. **对话处理** (`processConversation`)
   - 处理多轮对话
   - 维护对话上下文
   - 支持自定义参数

3. **LLM 调用** (`callLLM` / `callOpenAI`)
   - 支持多模型提供商（当前实现 OpenAI）
   - 自动处理 API 请求和响应
   - 返回 Token 使用量

### 数据结构

```typescript
interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AgentResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface AgentOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}
```

### 测试覆盖

- ✅ 单条消息处理
- ✅ 多轮对话处理
- ✅ 自定义选项（maxTokens、temperature、systemPrompt）
- ✅ 配置默认值
- ✅ API 错误处理
- ✅ 不支持的提供商错误

### 使用示例

```typescript
import { agentService } from './services/agent.js';

// 处理单条消息
const response = await agentService.processMessage('Hello');
console.log(response.content);

// 使用自定义选项
const response = await agentService.processMessage('Hello', {
  maxTokens: 100,
  temperature: 0.5,
  systemPrompt: 'Custom prompt',
});

// 处理多轮对话
const messages = [
  { role: 'user', content: 'First question' },
  { role: 'assistant', content: 'First answer' },
  { role: 'user', content: 'Follow up' },
];
const response = await agentService.processConversation(messages);
```

### 默认系统提示词

```
You are a helpful AI assistant integrated with Feishu (Lark). 
Your goal is to assist users by answering their questions, helping with tasks, and providing useful information.
Be concise, professional, and helpful in your responses.
```

### 注意事项

1. 当前仅支持 OpenAI 提供商，可扩展支持其他提供商
2. 服务依赖配置模块获取 API 密钥和模型设置
3. 所有 API 调用都包含错误处理
4. 返回的 usage 信息可用于监控 Token 消耗

### 下一步

继续实现控制器模块，包括：
- 飞书消息回调处理
- 事件订阅验证
- 错误处理和响应
