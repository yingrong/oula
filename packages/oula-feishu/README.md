# oula-feishu

基于飞书 (Lark) 的 AI 助手机器人，参考 pi-mono mom 实现。

## 功能特性

- 飞书长连接 (WebSocket) 集成
- Agent 工具系统 (bash, read, write, edit, attach)
- 沙箱执行 (host/docker 模式)
- 会话管理和消息持久化
- 定时事件系统

## 安装

```bash
pnpm install
```

## 配置

1. 复制环境变量示例文件：
```bash
cp .env.example .env
```

2. 在飞书开放平台 (https://open.feishu.cn/) 创建应用并获取：
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`

3. 编辑 `.env` 填入你的凭证

## 使用

```bash
# 以 host 模式运行（直接在宿主机执行命令）
pnpm start /path/to/working-dir

# 以 docker 模式运行（在指定容器中执行命令）
pnpm start --sandbox=docker:my-container /path/to/working-dir
```

## 项目结构

```
src/
├── agent.ts       # Agent 运行器
├── context.ts     # 会话管理
├── events.ts      # 事件系统
├── feishu.ts      # 飞书 Bot 核心
├── log.ts         # 日志模块
├── main.ts        # CLI 入口
├── sandbox.ts     # 沙箱执行
├── store.ts       # 数据存储
└── tools/         # Agent 工具
    ├── attach.ts
    ├── bash.ts
    ├── edit.ts
    ├── index.ts
    ├── read.ts
    ├── truncate.ts
    └── write.ts
```
