# Oula Claw 配置文件使用指南

## 1. 配置文件概述

Oula Claw 使用 `.env` 文件来管理配置项。配置文件包含服务器配置、飞书配置和 AI 代理配置等多个部分。本指南将详细说明每个配置项的用途和使用方法。

## 2. 配置文件结构

配置文件分为以下几个部分：

- **服务器配置**：控制服务器的运行参数
- **飞书配置**：配置飞书机器人的相关参数
- **AI 代理配置**：配置 AI 模型和提供商
- **模型提供商配置示例**：提供不同模型提供商的配置示例

## 3. 配置项说明

### 3.1 服务器配置

| 配置项 | 默认值 | 说明 |
|-------|-------|------|
| `PORT` | 3000 | 服务器监听的端口号 |
| `NODE_ENV` | development | 运行环境，可选值：development、production、test |

### 3.2 飞书配置

| 配置项 | 默认值 | 说明 |
|-------|-------|------|
| `FEISHU_APP_ID` | - | 飞书应用的 App ID，必需 |
| `FEISHU_APP_SECRET` | - | 飞书应用的 App Secret，必需 |
| `FEISHU_ENCRYPT_KEY` | - | 飞书 Webhook 模式的加密密钥，可选 |
| `FEISHU_VERIFICATION_TOKEN` | - | 飞书 Webhook 模式的验证令牌，可选 |

### 3.3 AI 代理配置

| 配置项 | 默认值 | 说明 |
|-------|-------|------|
| `AGENT_MODEL_PROVIDER` | openai | 模型提供商，可选值：openai、anthropic、google、nvidia 等 |
| `AGENT_MODEL_NAME` | gpt-4 | 模型名称，根据所选提供商填写相应的模型 ID |
| `AGENT_API_KEY` | - | API 密钥，根据所选提供商填写相应的 API 密钥，必需 |
| `AGENT_MAX_TOKENS` | 4096 | 最大令牌数，控制模型输出的最大长度 |
| `AGENT_TEMPERATURE` | 0.7 | 温度，控制模型输出的随机性，范围 0-2，值越高随机性越强 |

## 4. 模型提供商配置示例

### 4.1 OpenAI 配置

```env
AGENT_MODEL_PROVIDER=openai
AGENT_MODEL_NAME=gpt-4
AGENT_API_KEY=your_openai_api_key
AGENT_MAX_TOKENS=4096
AGENT_TEMPERATURE=0.7
```

### 4.2 NVIDIA Kimi 配置

```env
AGENT_MODEL_PROVIDER=nvidia
AGENT_MODEL_NAME=kimi-vision-pro
AGENT_API_KEY=your_nvidia_api_key
AGENT_MAX_TOKENS=4096
AGENT_TEMPERATURE=0.7
```

### 4.3 NVIDIA Kimi 2.5 配置

```env
AGENT_MODEL_PROVIDER=nvidia
AGENT_MODEL_NAME=kimi-2.5
AGENT_API_KEY=your_nvidia_api_key
AGENT_MAX_TOKENS=4096
AGENT_TEMPERATURE=0.7
```

### 4.4 Anthropic Claude 配置

```env
AGENT_MODEL_PROVIDER=anthropic
AGENT_MODEL_NAME=claude-3-opus-20240229
AGENT_API_KEY=your_anthropic_api_key
AGENT_MAX_TOKENS=4096
AGENT_TEMPERATURE=0.7
```

### 4.5 Google Gemini 配置

```env
AGENT_MODEL_PROVIDER=google
AGENT_MODEL_NAME=gemini-pro
AGENT_API_KEY=your_google_api_key
AGENT_MAX_TOKENS=4096
AGENT_TEMPERATURE=0.7
```

## 5. 配置优先级

配置项的优先级如下：

1. 环境变量（`.env` 文件）
2. 代码中的默认值

如果在 `.env` 文件中没有设置某个配置项，系统会使用代码中定义的默认值。

## 6. 配置文件的创建和使用

1. 复制 `.env.example` 文件，并重命名为 `.env`
2. 根据实际情况修改 `.env` 文件中的配置项
3. 启动应用时，系统会自动加载 `.env` 文件中的配置

## 7. 注意事项

1. **安全性**：不要将包含 API 密钥等敏感信息的 `.env` 文件提交到版本控制系统
2. **格式**：确保配置项的格式正确，特别是数值类型的配置项
3. **验证**：修改配置后，建议运行测试套件确保配置正确
4. **模型可用性**：确保所选的模型提供商和模型名称在你的环境中可用

## 8. 故障排查

### 8.1 配置文件未加载

- 检查 `.env` 文件是否存在于正确的位置
- 检查 `.env` 文件的格式是否正确
- 检查环境变量是否被正确设置

### 8.2 模型连接失败

- 检查 API 密钥是否正确
- 检查模型提供商和模型名称是否正确
- 检查网络连接是否正常
- 检查模型提供商的服务是否可用

### 8.3 配置验证失败

- 检查配置项的格式是否正确
- 检查必需的配置项是否都已设置
- 检查数值类型的配置项是否在有效范围内

## 9. 总结

正确配置 Oula Claw 的配置文件对于应用的正常运行至关重要。本指南提供了详细的配置项说明和示例，帮助你快速上手并正确配置应用。

如果在配置过程中遇到问题，请参考本指南的故障排查部分，或查看项目的文档和代码。