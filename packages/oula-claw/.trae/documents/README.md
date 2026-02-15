# Oula Claw - 最新准确文档

> ⚠️ **重要**: 本文档是项目的**唯一权威文档**，所有 Handoff 文档都应与此保持同步。
> 
> 最后更新: 2026-02-15
> 文档版本: v2.0

---

## 项目概述

**Oula Claw** 是一个多入口 AI Agent 框架，基于 TypeScript + Express 构建，支持飞书、邮件、钉钉等多种消息入口。项目基于 pi-mono，致敬 OpenClaw。

通过飞书长连接（WebSocket）接收消息，调用 OpenAI API 进行智能回复。适合作为学习 Agent 设计与实现的教学项目。

### 核心特性

- ✅ **长连接模式**: 使用 WebSocket 接收飞书事件，无需公网 IP 或域名
- ✅ **AI 集成**: 支持 OpenAI GPT 模型
- ✅ **完整测试**: 73 个测试用例，覆盖单元测试、集成测试、契约测试
- ✅ **代码质量**: Biome 代码规范，Husky Git Hooks
- ✅ **类型安全**: TypeScript + Zod 验证

---

## 项目结构

```
oula-claw/
├── src/                          # 源代码
│   ├── config/                   # 配置管理
│   │   ├── index.ts             # 配置加载和验证
│   │   └── types.ts             # Zod Schema 定义
│   ├── services/                 # 服务层
│   │   ├── feishu.ts            # 飞书 API 服务
│   │   ├── agent.ts             # OpenAI Agent 服务
│   │   └── ws-service.ts        # WebSocket 长连接服务
│   ├── controllers/              # 控制器层
│   │   └── feishu.ts            # 飞书 Webhook 控制器
│   └── app.ts                    # 应用入口
├── test/                         # 测试代码
│   ├── unit/                     # 单元测试
│   │   ├── config/              # 配置测试
│   │   ├── services/            # 服务测试
│   │   └── controllers/         # 控制器测试
│   ├── integration/              # 集成测试
│   │   ├── app.test.ts          # 应用集成测试
│   │   └── message-flow.test.ts # 消息流程测试
│   ├── contract/                 # 契约测试
│   │   └── feishu-api-contract.test.ts
│   └── mocks/                    # Mock 服务
│       ├── mock-feishu-sdk.ts
│       └── mock-openai.ts
├── .trae/documents/handoffs/     # Handoff 文档（历史记录）
└── [配置文件]
```

---

## 快速开始

### 1. 安装依赖

```bash
cd oula-claw
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填写以下必填项：
# - FEISHU_APP_ID
# - FEISHU_APP_SECRET
# - AGENT_API_KEY
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 4. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定类型测试
npm run test:unit           # 单元测试
npm run test:integration    # 集成测试
npm run test:contract       # 契约测试

# 开发监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

---

## 配置说明

### 环境变量

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `PORT` | 否 | 服务器端口 | `3000` |
| `NODE_ENV` | 否 | 运行环境 | `development` |
| `FEISHU_APP_ID` | **是** | 飞书应用 ID | `cli_xxxxxxxx` |
| `FEISHU_APP_SECRET` | **是** | 飞书应用密钥 | `xxxxxxxx` |
| `FEISHU_ENCRYPT_KEY` | 否 | 消息加密密钥（Webhook 模式需要） | `xxxxxxxx` |
| `FEISHU_VERIFICATION_TOKEN` | 否 | 验证 Token（Webhook 模式需要） | `xxxxxxxx` |
| `AGENT_MODEL_PROVIDER` | 否 | AI 提供商 | `openai` |
| `AGENT_MODEL_NAME` | 否 | 模型名称 | `gpt-4` |
| `AGENT_API_KEY` | **是** | OpenAI API 密钥 | `sk-xxxxxxxx` |
| `AGENT_MAX_TOKENS` | 否 | 最大 Token 数 | `4096` |
| `AGENT_TEMPERATURE` | 否 | 温度参数 | `0.7` |

### 飞书后台配置

1. 访问 [飞书开发者平台](https://open.feishu.cn/app)
2. 创建企业自建应用
3. 获取 **App ID** 和 **App Secret**
4. 启用机器人功能
5. **事件订阅方式**选择「**长连接**」
6. 订阅事件: `im.message.receive_v1`
7. 添加权限: `im:message:send`, `im:message.group_msg`, `im:message.p2p_msg`
8. 发布应用

---

## 核心模块

### 1. 配置模块 (`src/config/`)

- 使用 Zod 进行类型验证
- 支持环境变量加载
- 配置缓存机制
- 运行时配置验证

### 2. 飞书服务 (`src/services/feishu.ts`)

- 租户 Token 获取和缓存
- 消息发送
- 支持文本、富文本等多种消息类型

### 3. Agent 服务 (`src/services/agent.ts`)

- OpenAI API 集成
- 单条消息处理
- 多轮对话支持
- Token 使用量统计

### 4. WebSocket 服务 (`src/services/ws-service.ts`)

- 飞书长连接管理
- 消息事件处理
- 自动重连机制
- 优雅关闭

### 5. 控制器 (`src/controllers/feishu.ts`)

- Webhook 处理（兼容模式）
- URL 验证
- 健康检查
- 错误处理

---

## 测试策略

### 测试类型

| 类型 | 数量 | 说明 | 命令 |
|------|------|------|------|
| 单元测试 | 53 | 测试单个模块 | `npm run test:unit` |
| 集成测试 | 12 | 测试模块间交互 | `npm run test:integration` |
| 契约测试 | 8 | 验证 API 格式 | `npm run test:contract` |
| **总计** | **73** | **全部通过** | `npm test` |

### Mock 服务

- **Mock OpenAI**: 模拟 AI 响应，支持自定义响应和失败模式
- **Mock 飞书 SDK**: 模拟消息收发，捕获回复内容

---

## 可用脚本

```bash
# 开发
npm run dev              # 开发模式（热重载）
npm run build            # 构建 TypeScript
npm start                # 启动生产服务器

# 测试
npm test                 # 运行所有测试
npm run test:watch       # 监听模式
npm run test:unit        # 单元测试
npm run test:integration # 集成测试
npm run test:contract    # 契约测试
npm run test:coverage    # 覆盖率报告
npm run test:ci          # CI 模式

# 代码质量
npm run lint             # 代码检查
npm run lint:fix         # 自动修复
npm run format           # 格式化代码
```

---

## API 端点

### GET /health

健康检查端点。

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "config": {
    "server": { "port": 3000 },
    "feishu": { "appId": "cli_****" },
    "agent": { "modelProvider": "openai", "modelName": "gpt-4" }
  }
}
```

### POST /webhook/feishu

飞书 Webhook 端点（兼容模式）。

**处理内容**:
- URL 验证（challenge）
- 消息事件处理

---

## 技术栈

- **语言**: TypeScript 5.6
- **运行时**: Node.js >= 18
- **Web 框架**: Express 4.21
- **飞书 SDK**: @larksuiteoapi/node-sdk ^1.41.0
- **类型验证**: Zod ^3.23.8
- **测试框架**: Vitest ^2.1.1
- **代码质量**: Biome ^1.9.4
- **Git Hooks**: Husky ^9.1.6

---

## Handoff 文档历史

按时间顺序排列的 Handoff 文档：

1. [01-config-module.md](./handoffs/01-config-module.md) - 配置模块
2. [02-feishu-service.md](./handoffs/02-feishu-service.md) - 飞书服务模块
3. [03-agent-service.md](./handoffs/03-agent-service.md) - Agent 服务模块
4. [04-controller-module.md](./handoffs/04-controller-module.md) - 控制器模块
5. [05-app-entry.md](./handoffs/05-app-entry.md) - 应用入口模块
6. [06-final-summary.md](./handoffs/06-final-summary.md) - 项目完成总结
7. [07-feishu-configuration-guide.md](./handoffs/07-feishu-configuration-guide.md) - 飞书配置指南
8. [08-websocket-long-connection.md](./handoffs/08-websocket-long-connection.md) - 长连接改造
9. [09-testing-strategy.md](./handoffs/09-testing-strategy.md) - 测试策略

> ⚠️ **注意**: Handoff 文档是历史记录，**本文档 (README.md)** 才是最新准确信息。

---

## 常见问题

### Q1: 本地开发需要公网 IP 吗？

**不需要**。使用长连接模式，只需配置 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 即可。

### Q2: 如何测试消息处理流程？

```bash
# 运行集成测试
npm run test:integration

# 或启动服务后在飞书中发送消息
npm run dev
```

### Q3: 如何切换 AI 模型？

修改 `.env` 文件：
```bash
AGENT_MODEL_NAME=gpt-3.5-turbo  # 或其他模型
```

### Q4: 消息发送失败怎么办？

1. 检查 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 是否正确
2. 确认应用有 `im:message:send` 权限
3. 查看服务日志排查错误

---

## 开发规范

### 代码提交

```bash
# 提交前自动运行
npm run lint
npm test
```

### 添加新功能流程

1. 编写测试（TDD）
2. 实现功能
3. 运行测试: `npm test`
4. 代码检查: `npm run lint`
5. 提交代码
6. **更新本文档 (README.md)**
7. 可选：创建 Handoff 文档记录

---

## 维护者

- 项目名称: Oula Claw
- 创建日期: 2026-02-14
- 最后更新: 2026-02-15
- 版本: v2.0
- 核心依赖: pi-mono
- 致敬: OpenClaw

---

如有问题，请查看测试代码或联系开发团队。
