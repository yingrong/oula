# Pi-Coding-Agent 集成实现计划

## 项目背景
当前 AgentService 使用的是 pi-ai 的 completeSimple 方法来处理消息和对话。根据用户需求，我们需要将其迁移到使用 pi-coding-agent，同时确保飞书能够适配 pi-coding-agent 支持的命令。

## 任务分解与优先级

### [x] 任务 1: 了解 pi-coding-agent API
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 研究 pi-coding-agent 的 API 文档和示例
  - 了解其核心功能和使用方式
  - 确定与 pi-ai 的差异和迁移策略
- **Success Criteria**:
  - 理解 pi-coding-agent 的基本概念和 API
  - 能够使用 pi-coding-agent 创建会话和处理消息
- **Test Requirements**:
  - `programmatic` TR-1.1: 能够成功创建 pi-coding-agent 会话
  - `programmatic` TR-1.2: 能够使用 pi-coding-agent 处理简单消息

### [x] 任务 2: 修改 AgentService 类
- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 替换 pi-ai 依赖为 pi-coding-agent
  - 修改 processMessage 和 processConversation 方法，使用 pi-coding-agent 的 API
  - 确保配置和模型选择逻辑与 pi-coding-agent 兼容
- **Success Criteria**:
  - AgentService 能够使用 pi-coding-agent 处理消息和对话
  - 保持与现有 API 的兼容性
- **Test Requirements**:
  - `programmatic` TR-2.1: processMessage 方法能够正常工作
  - `programmatic` TR-2.2: processConversation 方法能够正常工作
  - `programmatic` TR-2.3: 模型选择逻辑能够正确工作

### [x] 任务 3: 飞书适配 pi-coding-agent 命令
- **Priority**: P1
- **Depends On**: 任务 2
- **Description**:
  - 了解 pi-coding-agent 支持的命令类型
  - 修改飞书控制器，适配 pi-coding-agent 的命令格式
  - 实现命令的解析和执行逻辑
- **Success Criteria**:
  - 飞书能够正确解析和执行 pi-coding-agent 支持的命令
  - 命令执行结果能够正确返回给用户
- **Test Requirements**:
  - `programmatic` TR-3.1: 飞书能够接收和解析命令
  - `programmatic` TR-3.2: 命令执行结果能够正确返回
  - `human-judgement` TR-3.3: 命令执行流程顺畅，用户体验良好

### [x] 任务 4: 测试和验证
- **Priority**: P1
- **Depends On**: 任务 3
- **Description**:
  - 编写集成测试，验证端到端流程
  - 测试不同模型的使用情况
  - 验证命令执行的正确性
- **Success Criteria**:
  - 所有测试用例通过
  - 系统能够正常处理各种场景
- **Test Requirements**:
  - `programmatic` TR-4.1: 所有单元测试通过
  - `programmatic` TR-4.2: 集成测试通过
  - `human-judgement` TR-4.3: 系统运行稳定，响应及时

### [x] 任务 5: 文档更新
- **Priority**: P2
- **Depends On**: 任务 4
- **Description**:
  - 更新项目文档，说明 pi-coding-agent 的集成情况
  - 提供使用指南和示例
  - 记录常见问题和解决方案
- **Success Criteria**:
  - 文档完整、清晰、准确
  - 能够帮助用户理解和使用新的集成
- **Test Requirements**:
  - `human-judgement` TR-5.1: 文档内容完整
  - `human-judgement` TR-5.2: 文档格式规范，易于阅读

## 技术实现细节

### 1. pi-coding-agent 核心概念
- **会话管理**: 使用 createAgentSession 创建和管理会话，使用 SessionManager.inMemory() 管理会话状态
- **命令处理**: 支持各种工具和命令的执行，包括文件操作、bash 命令等
- **模型集成**: 支持多种模型提供商，通过 ModelRegistry 管理模型配置
- **认证存储**: 使用 AuthStorage 存储认证信息

### 2. 迁移策略
- 保留现有的 AgentMessage、AgentResponse 和 AgentOptions 接口，确保向后兼容
- 使用 pi-coding-agent 的会话机制替代直接调用 pi-ai 的 completeSimple 方法
- 保持现有的模型选择逻辑，但适配 pi-coding-agent 的模型配置要求
- 使用正确的 API 调用方式：
  ```typescript
  import { AuthStorage, createAgentSession, ModelRegistry, SessionManager } from "@mariozechner/pi-coding-agent";
  
  const authStorage = new AuthStorage();
  const modelRegistry = new ModelRegistry(authStorage);
  
  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    authStorage,
    modelRegistry,
    systemPrompt,
    apiKey: apiKey,
  });
  
  await session.prompt("What files are in the current directory?");
  ```

### 3. 飞书适配
- 飞书消息处理流程：飞书控制器接收消息后，直接将消息内容传递给 AgentService 处理
- 命令解析：AgentService 使用 pi-coding-agent 的会话机制处理消息，包括命令解析和执行
- 命令执行：pi-coding-agent 支持的命令会被自动识别和执行，包括但不限于：
  - 读取文件 (`read`)
  - 执行 bash 命令 (`bash`)
  - 编辑文件 (`edit`)
  - 创建或覆盖文件 (`write`)
  - 搜索文件内容 (`grep`)
  - 查找文件 (`find`)
  - 列出目录内容 (`ls`)
- 结果返回：命令执行结果会通过飞书消息返回给用户

## 风险和注意事项
- **API 差异**: pi-coding-agent 与 pi-ai 的 API 存在差异，需要仔细适配
- **命令兼容性**: 确保飞书支持的命令与 pi-coding-agent 兼容
- **性能影响**: 会话管理可能会增加系统开销，需要监控和优化
- **错误处理**: 确保在 API 调用失败时能够优雅处理错误

## 预期成果
- 成功将 AgentService 迁移到使用 pi-coding-agent
- 飞书能够适配和执行 pi-coding-agent 支持的命令
- 系统运行稳定，响应及时
- 文档完整，便于用户理解和使用