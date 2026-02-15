# 飞书应用配置指南

## 概述

本文档详细说明如何配置飞书应用，使 Agent 服务能够接收和发送飞书消息。

## 配置项说明

### 必需配置

| 环境变量 | 说明 | 获取方式 |
|---------|------|---------|
| `FEISHU_APP_ID` | 飞书应用 ID | 飞书开发者后台 |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | 飞书开发者后台 |

### 可选配置

| 环境变量 | 说明 | 使用场景 |
|---------|------|---------|
| `FEISHU_ENCRYPT_KEY` | 消息加密密钥 | 启用消息加密时必填 |
| `FEISHU_VERIFICATION_TOKEN` | 事件订阅验证 Token | 飞书验证回调 URL 时使用 |

## 配置步骤

### 1. 创建飞书应用

1. 访问 [飞书开发者平台](https://open.feishu.cn/app)
2. 点击「创建应用」
3. 选择「企业自建应用」
4. 填写应用名称和描述
5. 点击「创建」

### 2. 获取应用凭证

1. 进入应用详情页
2. 点击左侧「凭证与基础信息」
3. 复制以下信息：
   - **App ID** → 对应 `FEISHU_APP_ID`
   - **App Secret** → 对应 `FEISHU_APP_SECRET`

```bash
# .env 文件配置示例
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. 配置机器人能力

1. 点击左侧「机器人」
2. 开启「机器人」开关
3. 配置机器人信息：
   - 机器人名称
   - 机器人头像
   - 功能介绍

### 4. 配置事件订阅（Webhook）

1. 点击左侧「事件与回调」
2. 在「事件订阅」标签页：
   - **请求地址**：填写你的服务地址
     ```
     https://your-domain.com/webhook/feishu
     ```
   - **验证令牌**（可选）：设置后对应 `FEISHU_VERIFICATION_TOKEN`
   - **加密密钥**（可选）：设置后对应 `FEISHU_ENCRYPT_KEY`

3. 添加订阅事件：
   - 点击「添加事件」
   - 选择「接收消息」
   - 选择「消息已读」

### 5. 配置权限

1. 点击左侧「权限管理」
2. 添加以下权限：
   - `im:chat:readonly` - 获取群组信息
   - `im:message:send` - 发送消息
   - `im:message.group_msg` - 接收群消息
   - `im:message.p2p_msg` - 接收单聊消息

### 6. 发布应用

1. 点击左侧「版本管理与发布」
2. 点击「创建版本」
3. 填写版本信息
4. 点击「保存」
5. 点击「申请发布」
6. 等待管理员审核通过

## 本地开发配置

### 使用 ngrok 进行本地调试

1. 安装 ngrok：
   ```bash
   brew install ngrok
   ```

2. 注册 ngrok 账号并获取 authtoken

3. 配置 ngrok：
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

4. 启动 ngrok：
   ```bash
   ngrok http 3000
   ```

5. 复制生成的 HTTPS URL，例如：
   ```
   https://xxxx.ngrok-free.app
   ```

6. 在飞书开发者后台配置请求地址：
   ```
   https://xxxx.ngrok-free.app/webhook/feishu
   ```

### 环境变量配置示例

```bash
# .env 文件

# 服务器配置
PORT=3000
NODE_ENV=development

# 飞书配置（必填）
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 飞书配置（可选）
FEISHU_VERIFICATION_TOKEN=your_verification_token
FEISHU_ENCRYPT_KEY=your_encrypt_key

# Agent 配置
AGENT_MODEL_PROVIDER=openai
AGENT_MODEL_NAME=gpt-4
AGENT_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGENT_MAX_TOKENS=4096
AGENT_TEMPERATURE=0.7
```

## 验证配置

### 1. 启动服务

```bash
cd oula-claw
npm run dev
```

### 2. 检查健康状态

```bash
curl http://localhost:3000/health
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "config": {
    "server": {
      "port": 3000,
      "nodeEnv": "development"
    },
    "feishu": {
      "appId": "cli_****"
    },
    "agent": {
      "modelProvider": "openai",
      "modelName": "gpt-4"
    }
  }
}
```

### 3. 测试 Webhook

在飞书开发者后台：
1. 进入「事件与回调」
2. 点击「请求地址」旁边的「验证」按钮
3. 如果显示「验证通过」，说明配置成功

### 4. 发送测试消息

1. 在飞书中找到你的机器人
2. 发送一条消息
3. 查看服务日志，确认收到消息并处理

## 常见问题

### Q1: 验证 URL 失败

**可能原因：**
- 服务未启动
- ngrok URL 已过期
- 防火墙阻止了请求

**解决方法：**
1. 确认服务正在运行
2. 重新启动 ngrok 获取新 URL
3. 检查服务器防火墙设置

### Q2: 收到消息但无回复

**可能原因：**
- 缺少发送消息权限
- OpenAI API 密钥无效
- 应用未发布

**解决方法：**
1. 检查权限管理中的 `im:message:send` 权限
2. 验证 `AGENT_API_KEY` 是否有效
3. 确认应用已发布并通过审核

### Q3: 签名验证失败

**可能原因：**
- `FEISHU_ENCRYPT_KEY` 配置错误
- 请求被篡改

**解决方法：**
1. 核对飞书后台的加密密钥
2. 暂时禁用加密进行测试

## 安全建议

1. **保护 App Secret**：不要提交到代码仓库
2. **使用环境变量**：生产环境使用安全的密钥管理服务
3. **启用加密**：生产环境建议启用消息加密
4. **限制 IP**：在飞书后台配置服务器 IP 白名单
5. **使用 HTTPS**：生产环境必须使用 HTTPS

## 相关文档

- [飞书开放平台文档](https://open.feishu.cn/document/home/index)
- [飞书机器人开发指南](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/introduction)
- [飞书事件订阅文档](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/event-subscription/introduction)

---

如有问题，请查看飞书开发者平台的错误日志或联系管理员。
