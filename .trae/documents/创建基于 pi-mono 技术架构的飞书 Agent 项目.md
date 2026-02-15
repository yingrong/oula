# 项目创建计划

## 技术架构参考

基于 `/oula/resource` 目录中的技术分析，参考 pi-mono 项目的架构，创建一个新的脚手架项目。

### 核心技术栈

* **语言**：TypeScript

* **测试框架**：Vitest（与 pi-mono 保持一致）

* **Web 框架**：Express

* **飞书 SDK**：@larksuiteoapi/node-sdk

* **Agent SDK**：@mariozechner/pi-coding-agent

* **构建工具**：TypeScript、tsgo

* **代码质量**：Biome

* **Git Hooks**：Husky

## 项目结构

```
oula/
├── src/
│   ├── config/          # 配置管理
│   ├── services/        # 业务服务
│   │   ├── feishu.ts    # 飞书服务
│   │   └── agent.ts     # Agent 服务
│   ├── controllers/     # 控制器
│   │   └── feishu.ts    # 飞书控制器
│   └── app.ts           # 应用入口
├── test/
│   ├── utils/           # 测试工具
│   ├── unit/            # 单元测试
│   │   ├── config/      # 配置测试
│   │   ├── services/    # 服务测试
│   │   └── controllers/ # 控制器测试
│   └── integration/     # 集成测试
├── package.json         # 项目配置
├── tsconfig.json        # TypeScript 配置
├── vitest.config.ts     # Vitest 配置
├── .env.example         # 环境变量示例
├── .env                 # 环境变量
├── .gitignore           # Git 忽略文件
└── biome.json           # Biome 配置
```

## 开发流程

采用 **测试驱动开发（TDD）** 方式：

1. **编写测试**：先为每个功能编写测试用例
2. **实现功能**：实现最小化的功能代码使测试通过
3. **运行测试**：验证功能是否正确
4. **重构代码**：优化代码结构和性能
5. **再次测试**：确保重构后测试仍然通过

## 核心功能模块

### 1. 配置管理模块

* 加载环境变量

* 管理应用配置

* 提供配置访问接口

### 2. 飞书服务模块

* 消息签名验证

* 消息解析和处理

* 消息发送

* 用户信息获取

### 3. Agent 服务模块

* pi-coding-agent 初始化

* 消息处理和任务执行

* 结果处理和返回

### 4. 控制器模块

* 处理飞书消息回调

* 处理事件订阅验证

* 错误处理和响应

### 5. 应用入口模块

* Express 服务器配置

* 路由注册

* 中间件配置

* 服务器启动

## 测试策略

### 1. 单元测试

* 测试配置管理

* 测试飞书服务的签名验证和消息处理

* 测试 Agent 服务的初始化和任务执行

* 测试控制器的消息处理

### 2. 集成测试

* 测试完整的消息处理流程

* 测试错误处理和边界情况

* 测试服务间的交互

### 3. 测试技术

* 使用 Mock 对象模拟外部依赖

* 测试异步操作和事件流

* 测试边界情况和错误处理

* 确保测试覆盖率

## 环境配置

### 核心依赖

* Express：Web 服务器

* @larksuiteoapi/node-sdk：飞书 SDK

* @mariozechner/pi-coding-agent：Agent SDK

* dotenv：环境变量管理

### 开发依赖

* TypeScript：类型检查和编译

* Vitest：测试框架

* tsgo：TypeScript 构建工具

* Biome：代码质量工具

* Husky：Git Hooks 管理

* supertest：HTTP 测试工具

## 项目启动

1. **安装依赖**：`npm install`
2. **构建项目**：`npm run build`
3. **运行测试**：`npm test`
4. **启动开发服务器**：`npm run dev`
5. **启动生产服务器**：`npm start`

## 业务流程

1. **接收飞书消息**：通过 Express 接收飞书回调
2. **验证签名**：验证消息签名确保安全性
3. **解析消息**：解析飞书消息格式
4. **Agent 处理**：使用 pi-coding-agent 处理消息
5. **返回结果**：将处理结果通过飞书消息返回

## 技术亮点

1. **测试驱动开发**：确保代码质量和功能正确性
2. **模块化设计**：清晰的职责分离和代码结构
3. **类型安全**：全面使用 TypeScript 提供类型安全
4. **可扩展性**：易于添加新功能和集成其他服务
5. **与 pi-mono 架构一致**：采用成熟的技术架构和测试策略

