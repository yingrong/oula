# models.json 配置文件实现计划

## 项目背景

* 项目：oula-claw（基于 pi-mono 技术架构的飞书 Agent 项目）

* 目标：在指定位置配置 models.json 文件，确保项目能够正确加载和使用 AI 模型

## [x] 任务 1：创建 models.json 文件
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 在项目根目录的 `.pi/agent/` 目录创建 `models.json` 文件
  - 确保文件不包含任何私密信息
  - 使用环境变量或 shell 命令来获取敏感信息
- **Success Criteria**:
  - models.json 文件存在于 `.pi/agent/` 目录
  - 文件内容不包含私密信息
  - 文件格式正确
- **Test Requirements**:
  - `programmatic` TR-1.1: 文件存在且内容正确
  - `human-judgement` TR-1.2: 文件不包含私密信息
- **Notes**: 使用相对路径，提高项目的可移植性

## [x] 任务 2：验证配置文件加载
- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 运行项目，验证 models.json 配置是否被正确加载
  - 检查 ModelRegistry 是否能够正确读取和解析配置
  - 了解项目的默认寻找机制
- **Success Criteria**:
  - 项目启动时能够正确加载 models.json 配置
  - 配置的模型能够在项目中使用
  - 理解并验证默认寻找机制
- **Test Requirements**:
  - `programmatic` TR-2.1: 项目启动无错误
  - `programmatic` TR-2.2: 配置的模型能够被正确识别
  - `human-judgement` TR-2.3: 理解并验证默认寻找机制
- **Notes**: 检查日志输出，确认配置加载状态。默认寻找机制：1. `~/.pi/agent/models.json` 2. 项目根目录的 `models.json`

## [x] 任务 3：更新项目文档
- **Priority**: P2
- **Depends On**: 任务 2
- **Description**:
  - 更新项目 README.md，添加 models.json 配置说明
  - 提供配置文件的使用指南链接
  - 说明默认寻找机制和自定义位置的方法
- **Success Criteria**:
  - README.md 包含 models.json 配置说明
  - 文档链接正确指向帮助文档
  - 包含默认寻找机制和自定义位置的说明
- **Test Requirements**:
  - `human-judgement` TR-3.1: 文档内容完整准确
  - `human-judgement` TR-3.2: 文档格式规范，易于阅读
  - `human-judgement` TR-3.3: 包含默认寻找机制和自定义位置的说明
- **Notes**: 参考现有的文档格式，保持风格一致

## 实现策略
1. 首先在项目根目录的 `.pi/agent/` 目录创建 models.json 文件，使用相对路径
2. 确保文件不包含任何私密信息，使用环境变量或 shell 命令获取敏感信息
3. 验证配置文件加载是否正常，测试默认寻找机制
4. 更新项目文档，确保开发者了解默认寻找机制和自定义位置的方法

## 预期成果
- models.json 文件正确放置在 `.pi/agent/` 目录
- 项目能够正常加载和使用配置的模型
- 项目文档包含完整的配置说明
- 开发者能够根据文档正确配置和使用 models.json 文件

