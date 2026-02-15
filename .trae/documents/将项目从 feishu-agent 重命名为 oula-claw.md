## 重命名计划

### 1. 配置文件更新
- package.json - 修改 name、description、keywords
- package-lock.json - 同步更新
- .env.example - 更新注释中的项目名称
- .env - 更新注释中的项目名称

### 2. 代码文件更新
- src/app.ts - 修改日志输出中的项目名称
- src/config/types.ts - 修改注释中的项目名称
- src/services/feishu.ts - 修改注释中的项目名称
- src/services/agent.ts - 修改注释中的项目名称
- src/services/ws-service.ts - 修改注释中的项目名称
- src/controllers/feishu.ts - 修改注释中的项目名称

### 3. 文档更新
- .trae/documents/README.md - 全面更新项目名称
- .trae/documents/HANDOFF_PROCESS.md - 更新示例中的项目名称
- .trae/documents/handoffs/06-final-summary.md - 更新项目名称
- .trae/documents/handoffs/07-feishu-configuration-guide.md - 更新项目名称
- .trae/documents/handoffs/08-websocket-long-connection.md - 更新项目名称
- .trae/documents/handoffs/09-testing-strategy.md - 更新项目名称

### 4. 测试文件更新
- test/integration/app.test.ts - 更新测试描述中的项目名称
- test/integration/message-flow.test.ts - 更新测试描述中的项目名称
- test/contract/feishu-api-contract.test.ts - 更新测试描述中的项目名称

### 5. 其他文件
- .gitignore - 如有项目名称相关注释则更新
- vitest.config.ts - 如有项目名称相关注释则更新
- tsconfig.json - 如有项目名称相关注释则更新
- biome.json - 如有项目名称相关注释则更新

### 6. 目录重命名
- 将目录从 `feishu-agent` 重命名为 `oula-claw`

### 检查清单
- [ ] 所有配置文件已更新
- [ ] 所有代码文件已更新
- [ ] 所有文档已更新
- [ ] 所有测试文件已更新
- [ ] 目录已重命名
- [ ] 运行测试验证: npm test
- [ ] 运行 lint 验证: npm run lint
- [ ] 启动服务验证: npm run dev