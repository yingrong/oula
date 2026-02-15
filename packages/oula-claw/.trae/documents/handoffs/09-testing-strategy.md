# 飞书 Agent 测试策略

## 概述

本文档详细说明飞书 Agent 项目的测试策略，包括契约测试、集成测试和 Mock 服务的使用。

## 测试结构

```
test/
├── contract/                 # 契约测试
│   └── feishu-api-contract.test.ts  # 验证飞书 API 响应格式
├── integration/              # 集成测试
│   ├── app.test.ts          # 应用集成测试
│   └── message-flow.test.ts # 消息流程集成测试
├── mocks/                    # Mock 服务
│   ├── mock-feishu-sdk.ts   # 飞书 SDK Mock
│   └── mock-openai.ts       # OpenAI API Mock
└── unit/                     # 单元测试
    ├── config/              # 配置模块测试
    ├── controllers/         # 控制器测试
    └── services/            # 服务层测试
```

## 契约测试

### 目的

验证飞书 API 响应格式是否符合预期。当飞书 API 发生变化时，这些测试能及时发现不兼容的变更。

### 文件

`test/contract/feishu-api-contract.test.ts`

### 测试内容

| 测试用例 | 说明 |
|---------|------|
| `should validate text message event structure` | 验证文本消息事件结构 |
| `should validate group message event structure` | 验证群消息事件结构 |
| `should validate different message types` | 验证所有消息类型（text/post/image/file 等）|
| `should reject invalid schema version` | 拒绝无效的 schema 版本 |
| `should reject missing required fields` | 拒绝缺少必填字段的消息 |
| `should validate message content JSON format` | 验证消息内容 JSON 格式 |
| `should validate rich text (post) message content format` | 验证富文本消息格式 |

### 使用 Zod 进行 Schema 验证

```typescript
const FeishuEventSchema = z.object({
  schema: z.literal('2.0'),
  event_id: z.string(),
  token: z.string(),
  create_time: z.string(),
  event_type: z.string(),
  tenant_key: z.string(),
  app_id: z.string(),
  message: FeishuMessageSchema,
  sender: FeishuSenderSchema,
});
```

## 集成测试

### 目的

测试模块间的交互，使用 Mock 外部服务（飞书 SDK、OpenAI API）来验证完整的消息处理流程。

### 文件

`test/integration/message-flow.test.ts`

### 测试内容

#### 消息处理流程

| 测试用例 | 说明 |
|---------|------|
| `should process text message and send AI reply` | 处理文本消息并发送 AI 回复 |
| `should handle different message types` | 处理不同类型的消息（text/post）|
| `should handle AI service errors gracefully` | 优雅处理 AI 服务错误 |
| `should handle empty message content` | 处理空消息内容 |

#### 消息内容解析

| 测试用例 | 说明 |
|---------|------|
| `should parse text message content correctly` | 正确解析文本消息内容 |
| `should handle malformed JSON content` | 处理格式错误的 JSON 内容 |

#### 服务配置

| 测试用例 | 说明 |
|---------|------|
| `should use correct AI model from config` | 使用配置中指定的 AI 模型 |

### Mock 外部服务

#### Mock OpenAI

```typescript
// 设置特定输入的响应
mockOpenAI.setResponse('你好', '你好！很高兴为你服务。');

// 设置默认响应
mockOpenAI.setDefaultResponse('这是一个默认回复');

// 模拟失败模式
mockOpenAI.setShouldFail(true, new Error('AI service unavailable'));
```

#### Mock 飞书服务

```typescript
// 自动捕获发送的消息
expect(feishuService.sendMessage).toHaveBeenCalledWith(
  'chat_456',
  expect.stringContaining('你好')
);
```

## Mock 服务

### Mock OpenAI Client

**文件**: `test/mocks/mock-openai.ts`

**功能**:
- 模拟 OpenAI API 响应
- 支持设置特定输入的响应
- 支持模拟失败模式
- 记录请求历史

**预设响应**:

```typescript
export const mockResponses = {
  greeting: {
    content: '你好！很高兴为你服务。有什么我可以帮助你的吗？',
    promptTokens: 5,
    completionTokens: 10,
    totalTokens: 15,
  },
  help: {
    content: '我可以帮助你回答问题、提供信息、协助完成任务等。',
    promptTokens: 5,
    completionTokens: 15,
    totalTokens: 20,
  },
  // ...
};
```

### Mock 飞书 SDK

**文件**: `test/mocks/mock-feishu-sdk.ts`

**功能**:
- 模拟飞书 WebSocket 连接
- 模拟消息接收和发送
- 捕获机器人回复
- 支持测试模式切换

**使用示例**:

```typescript
const mockSDK = new MockFeishuSDK();
mockSDK.start();

// 模拟用户发送消息
await mockSDK.simulateUserMessage({
  content: '你好',
  chatId: 'chat_123',
  chatType: 'p2p',
  senderId: 'user_456',
  messageType: 'text',
});

// 获取机器人的回复
const reply = mockSDK.getLastReply();
expect(reply.content).toContain('你好');
```

## 运行测试

### 统一使用 npm 脚本

项目已配置统一的 npm 脚本，**推荐始终使用 npm 脚本**而不是直接调用 vitest：

| 命令 | 说明 |
|------|------|
| `npm test` | 运行所有测试（CI 模式，只运行一次） |
| `npm run test:watch` | 监听模式运行测试（开发时使用） |
| `npm run test:unit` | 只运行单元测试 |
| `npm run test:integration` | 只运行集成测试 |
| `npm run test:contract` | 只运行契约测试 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |
| `npm run test:ci` | CI 模式运行（详细输出） |

### 示例

```bash
# 运行所有测试
npm test

# 只运行契约测试
npm run test:contract

# 只运行集成测试
npm run test:integration

# 开发时监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 为什么不直接使用 npx vitest？

1. **一致性**: npm 脚本确保所有开发者使用相同的命令和参数
2. **可维护性**: 测试配置集中在 package.json 中，便于统一管理
3. **简洁性**: `npm test` 比 `npx vitest --run` 更简洁易记
4. **兼容性**: npm 脚本是 Node.js 项目的标准做法，跨平台兼容

## 测试覆盖率

当前测试统计:

- **测试文件**: 9 个
- **测试用例**: 73 个
- **全部通过**: ✅

### 各模块测试覆盖

| 模块 | 测试文件 | 测试数量 | 说明 |
|------|---------|---------|------|
| 契约测试 | feishu-api-contract.test.ts | 8 | 验证飞书 API 格式 |
| 集成测试 | message-flow.test.ts | 7 | 消息流程集成测试 |
| 集成测试 | app.test.ts | 5 | 应用集成测试 |
| 配置模块 | config/index.test.ts | 8 | 配置加载和验证 |
| 配置类型 | config/types.test.ts | 13 | Zod Schema 验证 |
| 控制器 | feishu.test.ts | 9 | Webhook 控制器 |
| Agent 服务 | agent.test.ts | 6 | AI 交互服务 |
| 飞书服务 | feishu.test.ts | 12 | 飞书 API 服务 |
| WebSocket 服务 | ws-service.test.ts | 5 | 长连接服务 |

## 最佳实践

### 1. 契约测试

- 当飞书 API 文档更新时，同步更新契约测试
- 使用 Zod Schema 严格验证数据格式
- 包含正向和反向测试用例

### 2. 集成测试

- 每个外部依赖都应该有对应的 Mock
- 测试完整的业务流程，而非单个函数
- 验证错误处理路径

### 3. Mock 服务

- Mock 应该模拟真实服务的接口和行为
- 提供灵活的响应设置机制
- 记录调用历史以便验证

### 4. 测试隔离

- 每个测试用例独立运行
- 使用 `beforeEach` 和 `afterEach` 清理状态
- 避免测试间的相互依赖

## 持续集成

建议在 CI/CD 流程中运行:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    npm ci
    npm run lint
    npm test
```

## 未来扩展

1. **性能测试**: 添加消息处理性能测试
2. **压力测试**: 模拟高并发消息场景
3. **端到端测试**: 使用测试飞书应用进行真实环境测试
4. **可视化测试报告**: 集成测试覆盖率报告

---

如有问题，请查看测试代码或联系开发团队。
