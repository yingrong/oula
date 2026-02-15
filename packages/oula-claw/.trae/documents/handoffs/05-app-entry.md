# Handoff: 应用入口模块

## 完成内容

### 文件结构
```
src/
├── config/        # 配置管理（已完成）
├── services/      # 业务服务（已完成）
├── controllers/   # 控制器（已完成）
└── app.ts         # 应用入口

test/integration/
└── app.test.ts    # 集成测试
```

### 核心功能

1. **应用创建** (`createApp`)
   - 配置 Express 应用
   - 设置中间件（JSON 解析、日志）
   - 注册路由
   - 配置错误处理

2. **服务器启动** (`startServer`)
   - 加载配置
   - 创建应用实例
   - 启动 HTTP 服务器
   - 显示启动信息

3. **路由配置**
   - `GET /health` - 健康检查
   - `POST /webhook/feishu` - 飞书 Webhook
   - 404 处理
   - 全局错误处理

### 中间件

- `express.json()` - JSON 请求体解析（10MB 限制）
- `express.urlencoded()` - URL 编码解析
- 请求日志中间件
- 全局错误处理中间件

### 测试覆盖

- ✅ 健康检查端点
- ✅ URL 验证处理
- ✅ 文本消息处理
- ✅ 404 路由处理
- ✅ 无效 JSON 处理

### 启动信息

```
🚀 Server is running on port 3000
📊 Health check: http://localhost:3000/health
🔗 Webhook endpoint: http://localhost:3000/webhook/feishu
🤖 Model: openai/gpt-4
```

### 使用示例

```typescript
import { createApp, startServer } from './app.js';

// 创建应用（用于测试）
const app = createApp();

// 启动服务器（用于生产）
await startServer();
```

### 注意事项

1. 开发环境显示详细错误信息
2. 生产环境隐藏错误详情
3. 请求体大小限制为 10MB
4. 所有请求都会记录日志

### 下一步

1. 安装依赖
2. 运行测试验证功能
3. 配置 Husky Git Hooks
