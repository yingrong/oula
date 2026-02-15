## 项目创建计划

### 核心功能
创建一个基于 Express + TypeScript 的飞书 Agent 服务，实现：
1. 接收飞书消息回调
2. 使用 pi-coding-agent 处理消息
3. 返回处理结果到飞书

### 技术栈
- **语言**: TypeScript
- **Web 框架**: Express
- **测试框架**: Vitest
- **飞书 SDK**: @larksuiteoapi/node-sdk
- **Agent SDK**: @mariozechner/pi-coding-agent
- **代码质量**: Biome
- **Git Hooks**: Husky

### 项目结构
```
oula/oula-claw/
├── src/
│   ├── config/          # 配置管理
│   │   ├── index.ts
│   │   └── types.ts
│   ├── services/        # 业务服务
│   │   ├── feishu.ts    # 飞书服务（签名验证、消息处理）
│   │   └── agent.ts     # Agent 服务
│   ├── controllers/     # 控制器
│   │   └── feishu.ts    # 飞书消息回调处理
│   └── app.ts           # 应用入口
├── test/
│   ├── utils/           # 测试工具
│   ├── unit/            # 单元测试
│   │   ├── config/
│   │   ├── services/
│   │   └── controllers/
│   └── integration/     # 集成测试
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── biome.json
├── .env.example
├── .env
└── .gitignore
```

### 开发流程（TDD）
1. 编写测试 → 实现功能 → 运行测试 → 重构 → 再次测试
2. 每个功能模块完成后编写 handoff 文档

### 实施步骤

#### 阶段 1: 项目初始化
1. 创建项目目录结构
2. 配置 package.json（依赖和脚本）
3. 配置 TypeScript (tsconfig.json)
4. 配置 Vitest (vitest.config.ts)
5. 配置 Biome (biome.json)
6. 配置 Git 忽略文件和 Husky

#### 阶段 2: 配置管理模块
1. 编写配置类型定义测试
2. 实现配置加载和验证
3. 编写 handoff 文档

#### 阶段 3: 飞书服务模块
1. 编写签名验证测试
2. 实现签名验证功能
3. 编写消息解析测试
4. 实现消息解析和发送功能
5. 编写 handoff 文档

#### 阶段 4: Agent 服务模块
1. 编写 Agent 初始化测试
2. 实现 pi-coding-agent 集成
3. 编写消息处理测试
4. 实现消息处理流程
5. 编写 handoff 文档

#### 阶段 5: 控制器模块
1. 编写回调处理测试
2. 实现飞书消息回调处理
3. 编写事件订阅验证测试
4. 实现 URL 验证接口
5. 编写 handoff 文档

#### 阶段 6: 应用入口
1. 配置 Express 服务器
2. 注册路由和中间件
3. 实现错误处理
4. 编写 handoff 文档

#### 阶段 7: 集成测试
1. 编写完整流程测试
2. 测试错误处理
3. 验证端到端功能

#### 阶段 8: 验证和交付
1. 运行所有测试
2. 检查代码质量
3. 创建环境变量示例文件

### 交付物
- 完整的项目代码
- 每个模块的 handoff 文档（位于 .trae/documents/handoffs/）
- 可运行的测试套件
- 环境配置示例

请确认这个计划后，我将开始实施。