## 目标
将 `packages/oula-claw/src/services/agent.ts` 的自定义实现替换为复用 `pi-coding-agent`。

## 步骤

### 1. 安装 pi-coding-agent 依赖
在 `packages/oula-claw/package.json` 中添加：
```json
"dependencies": {
  "@mariozechner/pi-coding-agent": "^1.0.0"
}
```

### 2. 删除自定义实现
删除或重构 `packages/oula-claw/src/services/agent.ts`，改为使用 pi-coding-agent 的 API。

### 3. 更新配置
确保配置模块可以传递给 pi-coding-agent 使用。

### 4. 更新测试
修改测试文件以适应新的实现。

### 5. 验证
运行测试确保功能正常。

## 注意
需要先确认 pi-coding-agent 的具体 API 和使用方式。