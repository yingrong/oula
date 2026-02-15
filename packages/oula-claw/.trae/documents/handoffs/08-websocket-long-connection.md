# 飞书长连接（WebSocket）模式改造

## 概述

将飞书事件订阅从传统的 Webhook 模式改造为**长连接（WebSocket）模式**。长连接模式通过飞书 SDK 与开放平台建立 WebSocket 全双工通道，无需公网 IP 或域名即可接收事件消息。

## 改造内容

### 1. 新增 WebSocket 服务模块

**文件**: `src/services/ws-service.ts`

- 使用 `@larksuiteoapi/node-sdk` 创建 WebSocket 客户端
- 注册 `im.message.receive_v1` 事件处理器
- 处理消息接收、Agent 调用、消息回复完整流程
- 支持优雅关闭连接

### 2. 改造应用入口

**文件**: `src/app.ts`

- 启动 HTTP 服务（保留健康检查端点）
- 启动 WebSocket 长连接（主要事件接收方式）
- 实现优雅关闭机制（SIGTERM/SIGINT 信号处理）

### 3. 简化配置

**文件**: `.env.example`

- 长连接模式只需配置 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`
- `FEISHU_ENCRYPT_KEY` 和 `FEISHU_VERIFICATION_TOKEN` 变为可选（Webhook 模式专用）

## 长连接模式优势

| 特性 | Webhook 模式 | 长连接模式 |
|------|-------------|-----------|
| 公网 IP/域名 | 必需 | 不需要 |
| 内网穿透工具 | 需要（如 ngrok） | 不需要 |
| 签名验证 | 需要手动实现 | SDK 内置 |
| 消息加密 | 需要手动处理 | SDK 内置 |
| 开发周期 | 约 1 周 | 5 分钟 |
| 部署复杂度 | 高 | 低 |

## 飞书后台配置

### 1. 启用长连接模式

1. 访问 [飞书开发者平台](https://open.feishu.cn/app)
2. 进入你的应用 → **事件与回调**
3. 在「事件订阅方式」中选择 **「长连接」**
4. 点击 **保存**

### 2. 订阅事件

在长连接模式下，添加需要订阅的事件：
- `im.message.receive_v1` - 接收消息 v2.0

### 3. 配置权限

确保已添加以下权限：
- `im:message:send` - 发送消息
- `im:message.group_msg` - 接收群消息
- `im:message.p2p_msg` - 接收单聊消息

## 本地开发流程

### 1. 配置环境变量

```bash
# .env 文件

# 服务器配置
PORT=3000
NODE_ENV=development

# 飞书配置（长连接模式只需这两项）
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Agent 配置
AGENT_MODEL_PROVIDER=openai
AGENT_MODEL_NAME=gpt-4
AGENT_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGENT_MAX_TOKENS=4096
AGENT_TEMPERATURE=0.7
```

### 2. 启动服务

```bash
cd oula-claw
npm run dev
```

### 3. 验证连接

启动成功后，控制台会显示：
```
🚀 HTTP server is running on port 3000
📊 Health check: http://localhost:3000/health
🤖 Model: openai/gpt-4
🔌 Starting WebSocket connection...
✅ WebSocket connection established
```

### 4. 测试消息收发

1. 在飞书中找到你的机器人
2. 发送一条消息
3. 查看本地服务日志，确认收到消息并处理
4. 检查飞书聊天窗口，确认机器人回复

## 注意事项

### 超时处理
- 长连接模式下，收到消息后需要在 **3 秒内** 处理完成且不抛出异常
- 否则会触发超时重推机制

### 连接限制
- 每个应用最多建立 **50 个连接**
- 每初始化一个 client 就是一个连接

### 消息推送模式
- 长连接模式的消息推送为 **集群模式**，不支持广播
- 如果同一应用部署了多个客户端（client），只有其中随机一个客户端会收到消息

### 适用范围
- 长连接模式仅支持 **企业自建应用**
- 商店应用需要使用 Webhook 模式

## 代码示例

### WebSocket 服务启动

```typescript
import { Client as LarkClient } from '@larksuiteoapi/node-sdk';

const client = new LarkClient({
  appId: 'your_app_id',
  appSecret: 'your_app_secret',
  loggerLevel: 'debug',
});

// 注册事件处理器
client.on('im.message.receive_v1', async (data) => {
  console.log('Received message:', data);
  // 处理消息...
});

// 启动长连接
await client.start();
```

### 优雅关闭

```typescript
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received. Starting graceful shutdown...`);
  
  // 关闭 WebSocket 连接
  await wsService.stop();
  
  // 关闭 HTTP 服务
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## 常见问题

### Q1: WebSocket 连接失败

**可能原因：**
- App ID 或 App Secret 配置错误
- 网络无法访问飞书服务器
- 应用未启用长连接模式

**解决方法：**
1. 核对飞书后台的凭证信息
2. 检查网络连接
3. 确认飞书后台已选择「长连接」模式

### Q2: 收到消息但无回复

**可能原因：**
- 缺少发送消息权限
- OpenAI API 密钥无效
- 消息处理超时（超过 3 秒）

**解决方法：**
1. 检查权限管理中的 `im:message:send` 权限
2. 验证 `AGENT_API_KEY` 是否有效
3. 优化消息处理逻辑，确保 3 秒内完成

### Q3: 如何同时使用 Webhook 和长连接

当前实现保留了 Webhook 端点（`/webhook/feishu`）用于兼容性，但建议只使用一种模式：
- 本地开发：使用长连接模式
- 生产环境：根据需求选择（长连接模式更简单）

## 相关文档

- [飞书长连接模式文档](https://open.feishu.cn/document/server-docs/event-subscription-guide/event-subscription-configure-/request-url-configuration-case)
- [飞书服务端 SDK](https://open.feishu.cn/document/server-docs/api-sdk-docs/server-sdk/overview)
- [飞书事件订阅指南](https://open.feishu.cn/document/server-docs/event-subscription-guide/event-subscription-configure-/request-url-configuration-case#9086b6ae)

---

如有问题，请查看飞书开发者平台的错误日志或联系管理员。
