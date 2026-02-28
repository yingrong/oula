# models.json 配置文件使用指南

## 1. 概述

`models.json` 是 pi-mono 项目中用于配置自定义 AI 模型和提供商的配置文件。通过该文件，您可以添加和配置各种 AI 模型，包括本地模型（如 Ollama、LM Studio、vLLM）和远程模型（如 OpenAI、Anthropic、Google 等）。

## 2. 文件位置

### 2.1 默认位置与优先级

pi-mono 项目中，`ModelRegistry` 类默认只加载以下位置的 `models.json` 文件：

1. **用户主目录**：`~/.pi/agent/models.json`
2. **内置模型**：如果用户主目录中没有找到，会使用内置的模型配置

### 2.2 项目配置文件加载

要加载项目级别的 `models.json` 文件（`.pi/agent/models.json`），需要在创建 `ModelRegistry` 实例时显式指定路径：

```typescript
import { ModelRegistry } from "@mariozechner/pi-coding-agent";
import { join } from "path";

// 加载项目级配置文件
const projectModelsPath = join(process.cwd(), ".pi", "agent", "models.json");
const modelRegistry = new ModelRegistry(authStorage, projectModelsPath);
```

### 2.3 覆盖规则

- **显式路径优先**：当显式指定配置文件路径时，`ModelRegistry` 只会加载该路径的配置文件，不会自动合并其他位置的配置
- **模型级别的覆盖**：如果在同一个配置文件中定义了相同 ID 的模型，后面的定义会覆盖前面的定义
- **提供商级别的覆盖**：如果在同一个配置文件中定义了相同名称的提供商，后面的定义会覆盖前面的定义

### 2.4 自定义位置

在代码中，您可以通过 `ModelRegistry` 构造函数指定自定义的 `models.json` 文件位置：

```typescript
import { ModelRegistry } from "@mariozechner/pi-coding-agent";

// 使用自定义位置
const modelRegistry = new ModelRegistry(authStorage, "./path/to/models.json");

// 使用相对路径
const modelRegistry = new ModelRegistry(authStorage, "config/models.json");

// 不使用 models.json（仅使用内置模型）
const modelRegistry = new ModelRegistry(authStorage);
```

## 3. 配置文件结构

`models.json` 文件采用 JSON 格式，其基本结构如下：

```json
{
  "providers": {
    "provider_name": {
      "baseUrl": "API 端点 URL",
      "api": "API 类型",
      "apiKey": "API 密钥",
      "headers": {
        "自定义 header": "值"
      },
      "authHeader": true, // 是否自动添加 Authorization 头
      "models": [
        {
          "id": "模型 ID",
          "name": "模型显示名称",
          "api": "API 类型（可选，覆盖提供商级别设置）",
          "reasoning": false, // 是否支持推理
          "input": ["text"], // 输入类型
          "contextWindow": 128000, // 上下文窗口大小
          "maxTokens": 16384, // 最大输出 tokens
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }, // 成本
          "compat": {
            "supportsStore": false, // 是否支持 store 字段
            "supportsDeveloperRole": false, // 是否使用 developer 角色
            "supportsReasoningEffort": false, // 是否支持 reasoning_effort 参数
            "supportsUsageInStreaming": true, // 是否支持流式使用统计
            "maxTokensField": "max_tokens" // max tokens 字段名称
          }
        }
      ],
      "modelOverrides": {
        "built-in-model-id": {
          "name": "覆盖的模型名称",
          "reasoning": true,
          "input": ["text", "image"],
          "cost": { "input": 0.5, "output": 1.5 },
          "contextWindow": 128000,
          "maxTokens": 32000,
          "headers": { "x-custom": "value" },
          "compat": {
            "openRouterRouting": {
              "only": ["anthropic"]
            }
          }
        }
      }
    }
  }
}
```

## 4. 配置项说明

### 4.1 提供商配置（providers）

| 字段 | 描述 | 是否必填 | 默认值 |
|------|------|----------|--------|
| `baseUrl` | API 端点 URL | 是 | - |
| `api` | API 类型 | 是 | - |
| `apiKey` | API 密钥 | 是 | - |
| `headers` | 自定义 HTTP 头 | 否 | `{}` |
| `authHeader` | 是否自动添加 `Authorization: Bearer <apiKey>` | 否 | `false` |
| `models` | 模型配置数组 | 否 | `[]` |
| `modelOverrides` | 内置模型覆盖配置 | 否 | `{}` |

### 4.2 支持的 API 类型

| API 类型 | 描述 |
|---------|------|
| `openai-completions` | OpenAI Chat Completions API（最兼容） |
| `openai-responses` | OpenAI Responses API |
| `anthropic-messages` | Anthropic Messages API |
| `google-generative-ai` | Google Generative AI API |

### 4.3 模型配置（models）

| 字段 | 描述 | 是否必填 | 默认值 |
|------|------|----------|--------|
| `id` | 模型标识符（传递给 API） | 是 | - |
| `name` | 模型选择器中的显示名称 | 否 | `id` |
| `api` | API 类型（覆盖提供商级别设置） | 否 | 提供商的 `api` 值 |
| `reasoning` | 是否支持扩展思考 | 否 | `false` |
| `input` | 输入类型 | 否 | `["text"]` |
| `contextWindow` | 上下文窗口大小（tokens） | 否 | `128000` |
| `maxTokens` | 最大输出 tokens | 否 | `16384` |
| `cost` | 成本（每百万 tokens） | 否 | `{"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0}` |
| `compat` | 兼容性配置 | 否 | `{}` |

### 4.4 兼容性配置（compat）

| 字段 | 描述 | 默认值 |
|------|------|--------|
| `supportsStore` | 提供商是否支持 `store` 字段 | `false` |
| `supportsDeveloperRole` | 是否使用 `developer` 角色而非 `system` 角色 | `false` |
| `supportsReasoningEffort` | 是否支持 `reasoning_effort` 参数 | `false` |
| `supportsUsageInStreaming` | 是否支持 `stream_options: { include_usage: true }` | `true` |
| `maxTokensField` | 使用 `max_completion_tokens` 还是 `max_tokens` | `max_tokens` |
| `openRouterRouting` | OpenRouter 路由配置 | `{}` |
| `vercelGatewayRouting` | Vercel AI Gateway 路由配置 | `{}` |

## 5. API 密钥解析

`apiKey` 和 `headers` 字段支持三种格式：

1. **Shell 命令**：以 `!` 开头，执行命令并使用 stdout
   ```json
   "apiKey": "!security find-generic-password -ws 'anthropic'"
   "apiKey": "!op read 'op://vault/item/credential'"
   ```

2. **环境变量**：使用命名变量的值
   ```json
   "apiKey": "MY_API_KEY"
   ```

3. **字面值**：直接使用
   ```json
   "apiKey": "sk-..."
   ```

## 6. 使用场景

### 6.1 添加本地模型（如 Ollama）

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama", // Ollama 忽略 API 密钥，任意值均可
      "models": [
        { "id": "llama3.1:8b" },
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

### 6.2 添加远程模型（如 NVIDIA）

```json
{
  "providers": {
    "nvidia": {
      "baseUrl": "https://integrate.api.nvidia.com/v1",
      "api": "openai-completions",
      "apiKey": "nvapi-...",
      "models": [
        {
          "id": "meta/llama-3.1-405b-instruct",
          "name": "NVIDIA Llama 3.1 405B Instruct",
          "reasoning": true,
          "input": ["text", "image"],
          "contextWindow": 128000,
          "maxTokens": 4096
        }
      ]
    }
  }
}
```

### 6.3 覆盖内置提供商

通过代理路由内置提供商，而不重新定义模型：

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1"
    }
  }
}
```

### 6.4 模型级别覆盖

使用 `modelOverrides` 自定义特定内置模型：

```json
{
  "providers": {
    "openrouter": {
      "modelOverrides": {
        "anthropic/claude-sonnet-4": {
          "name": "Claude Sonnet 4 (Bedrock Route)",
          "compat": {
            "openRouterRouting": {
              "only": ["amazon-bedrock"]
            }
          }
        }
      }
    }
  }
}
```

## 7. 注意事项

1. **安全性**：不要在 `models.json` 文件中存储敏感信息（如 API 密钥），应使用环境变量或安全的密钥管理系统。

2. **私密信息**：确保 `models.json` 文件中不包含任何私密信息，如 API 密钥、密码等。建议使用环境变量或 shell 命令来获取敏感信息。

3. **文件位置**：可以使用相对路径或绝对路径指定 `models.json` 文件位置，推荐使用相对路径以提高项目的可移植性。

4. **格式验证**：确保 JSON 格式正确，否则配置将无法加载。

5. **API 兼容性**：确保选择的 API 类型与提供商的 API 兼容。

6. **模型 ID**：模型 ID 必须与提供商 API 中使用的 ID 一致。

7. **性能考虑**：为模型设置合理的 `contextWindow` 和 `maxTokens` 值，以平衡性能和功能。

8. **成本管理**：如果使用付费模型，设置准确的 `cost` 值以跟踪使用成本。

9. **兼容性设置**：对于非标准 API 端点，使用 `compat` 字段调整兼容性设置。

## 8. 示例配置

以下是一个完整的 `models.json` 示例：

```json
{
  "providers": {
    "nvidia": {
      "baseUrl": "https://integrate.api.nvidia.com/v1",
      "api": "openai-completions",
      "apiKey": "nvapi-...",
      "models": [
        {
          "id": "meta/llama-3.1-405b-instruct",
          "name": "NVIDIA Llama 3.1 405B Instruct",
          "reasoning": true,
          "input": ["text", "image"],
          "output": "text",
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
          "contextWindow": 128000,
          "maxTokens": 4096
        }
      ]
    },
    "seed": {
      "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
      "api": "openai-completions",
      "apiKey": "a36a59fd-7bc9-4a55-9af1-b9a48109a295",
      "models": [
        {
          "id": "doubao-seed-1-6-251015",
          "name": "Doubao Seed 1.6 251015",
          "reasoning": true,
          "input": ["text", "image"],
          "output": "text",
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
          "contextWindow": 128000,
          "maxTokens": 4096,
          "compat": {
            "supportsDeveloperRole": false
          }
        }
      ]
    },
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "llama3.1:8b" },
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

## 9. 故障排查

### 9.1 配置加载失败

- 检查 `models.json` 文件格式是否正确
- 确保文件位于正确的位置
- 验证 JSON 语法是否正确

### 9.2 模型不可用

- 检查 `baseUrl` 是否正确
- 验证 `apiKey` 是否有效
- 确保 `model.id` 与提供商 API 中使用的 ID 一致
- 检查网络连接是否正常

### 9.3 API 调用失败

- 检查 `api` 类型是否与提供商 API 兼容
- 验证 `compat` 配置是否正确
- 检查 `headers` 是否包含必要的认证信息

## 10. 总结

`models.json` 配置文件为 pi-mono 项目提供了灵活的模型和提供商配置能力。通过合理配置，您可以：

- 添加和管理多种 AI 模型
- 配置本地和远程模型
- 自定义模型行为和性能参数
- 优化 API 调用和兼容性
- 管理和跟踪使用成本

希望本文档能帮助您理解和使用 `models.json` 配置文件。如果您有任何问题或建议，请随时提出。