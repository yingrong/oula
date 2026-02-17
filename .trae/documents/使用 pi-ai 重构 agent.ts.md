## 目标
将 `packages/oula-claw/src/services/agent.ts` 的自定义实现替换为使用 pi-coding-agent 的 SDK。

## 步骤

### 1. 更新 package.json
在 `packages/oula-claw/package.json` 中添加本地依赖：
```json
"dependencies": {
  "@mariozechner/pi-ai": "file:../pi-mono/packages/ai",
  "@mariozechner/pi-agent-core": "file:../pi-mono/packages/agent",
  "@mariozechner/pi-coding-agent": "file:../pi-mono/packages/coding-agent"
}
```

### 2. 重构 agent.ts
使用 pi-ai 的 `complete` 或 `completeSimple` 函数替换自定义的 OpenAI 调用：
- 使用 `getModel` 获取模型配置
- 使用 `completeSimple` 进行简单的对话完成
- 复用 pi-ai 的类型定义

### 3. 更新配置模块
确保配置可以与 pi-ai 的模型系统兼容。

### 4. 更新测试
修改测试以适应新的实现。

### 5. 创建 Handoff 文档
按照 HANDOFF_PROCESS.md 创建文档记录这次改造。

### 6. 更新 README.md
更新项目文档说明使用了 pi-mono 的 AI 能力。

### 7. 验证
运行测试确保功能正常。