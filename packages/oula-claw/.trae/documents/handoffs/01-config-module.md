# Handoff: 配置管理模块

## 完成内容

### 文件结构
```
src/config/
├── types.ts      # 配置类型定义（使用 Zod 验证）
└── index.ts      # 配置加载和管理

test/unit/config/
├── types.test.ts # 类型定义测试
└── index.test.ts # 配置加载测试
```

### 核心功能

1. **类型定义** (`types.ts`)
   - 使用 Zod 定义配置 Schema
   - 包含 ServerConfig、FeishuConfig、AgentConfig
   - 提供默认值和类型验证

2. **配置加载** (`index.ts`)
   - 从环境变量加载配置
   - 使用 Zod 验证配置有效性
   - 支持配置缓存和重置
   - 自动加载 .env 文件

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务器端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| FEISHU_APP_ID | 飞书应用 ID | 必填 |
| FEISHU_APP_SECRET | 飞书应用密钥 | 必填 |
| FEISHU_ENCRYPT_KEY | 飞书加密密钥 | 可选 |
| FEISHU_VERIFICATION_TOKEN | 飞书验证 Token | 可选 |
| AGENT_MODEL_PROVIDER | AI 提供商 | openai |
| AGENT_MODEL_NAME | 模型名称 | gpt-4 |
| AGENT_API_KEY | AI API 密钥 | 必填 |
| AGENT_MAX_TOKENS | 最大 Token 数 | 4096 |
| AGENT_TEMPERATURE | 温度参数 | 0.7 |

### 测试覆盖

- ✅ Schema 验证测试
- ✅ 默认值测试
- ✅ 环境变量加载测试
- ✅ 配置缓存测试
- ✅ 错误处理测试

### 使用示例

```typescript
import { loadConfig, getConfig } from './config/index.js';

// 加载并验证配置
const config = loadConfig();

// 获取缓存的配置
const cachedConfig = getConfig();

// 访问配置项
console.log(config.server.port);
console.log(config.feishu.appId);
console.log(config.agent.apiKey);
```

### 注意事项

1. 配置在首次加载时会被缓存，后续调用返回相同实例
2. 使用 `resetConfig()` 可在测试之间清理缓存
3. 配置验证失败会抛出包含详细错误信息的异常

### 下一步

继续实现飞书服务模块，包括：
- 消息签名验证
- 消息解析和处理
- 消息发送功能
