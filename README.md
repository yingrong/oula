# Oula Project Collection

> 多入口 AI Agent 框架集合
> 
> 基于 pi-mono 架构，致敬 OpenClaw

## 项目结构

```
oula/
├── packages/              # 项目目录
│   └── oula-claw/        # 飞书 Agent 项目
├── resource/             # 共享资源
├── package.json          # 仓库配置
├── .gitignore           # Git 忽略配置
└── README.md            # 本文档
```

## 快速开始

### 安装依赖

```bash
# 在仓库根目录安装所有依赖
npm install
```

### 运行测试

```bash
# 运行所有项目的测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行契约测试
npm run test:contract
```

### 代码检查

```bash
# 检查所有项目
npm run lint

# 自动修复
npm run lint:fix
```

### 构建

```bash
# 构建所有项目
npm run build
```

## 项目说明

### oula-claw

基于飞书的 AI Agent，支持长连接模式接收消息，调用 OpenAI API 进行智能回复。

**特点**:
- ✅ 长连接模式（WebSocket）
- ✅ AI 智能回复
- ✅ 完整测试覆盖（73 个测试）
- ✅ TypeScript + Express

**配置说明**:
- 使用 `models.json` 文件配置 AI 模型和提供商
- **默认位置**：1. `~/.pi/agent/models.json` 2. 项目根目录的 `.pi/agent/models.json`
- **自定义位置**：在代码中通过 `ModelRegistry` 构造函数指定
- **安全性**：不要在文件中存储敏感信息，使用环境变量或 shell 命令获取

**快速开始**:
```bash
cd packages/oula-claw
npm run dev
```

**文档**:
- [项目文档](./packages/oula-claw/.trae/documents/README.md)
- [models.json 配置指南](./.trae/documents/models-json-configuration-guide.md)

## 未来计划

- [ ] **oula-email**: 邮件入口支持
- [ ] **oula-dingtalk**: 钉钉入口支持
- [ ] **oula-slack**: Slack 入口支持
- [ ] **oula-web**: Web UI 界面

## 技术栈

- **语言**: TypeScript 5.6
- **运行时**: Node.js >= 18
- **架构**: pi-mono 启发
- **Web 框架**: Express
- **测试**: Vitest
- **代码质量**: Biome
- **Git Hooks**: Husky

## 贡献指南

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/xxx`)
3. 提交代码 (`git commit -m 'feat: add xxx'`)
4. 运行测试 (`npm test`)
5. 运行代码检查 (`npm run lint`)
6. 提交 Pull Request

## 项目背景

**Oula Claw** 是一个教学实验项目，用于探索 AI Agent 的设计与实现。

- **项目名称**: Oula（欧拉的变体，致敬数学之美）
- **项目代号**: Claw（致敬 OpenClaw）
- **架构基础**: pi-mono
- **目标**: 多入口 AI Agent 框架

## 许可证

MIT License

---

如有问题，请查看各项目的文档或提交 Issue。
