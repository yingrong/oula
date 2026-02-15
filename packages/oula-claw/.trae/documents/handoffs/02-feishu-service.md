# Handoff: 飞书服务模块

## 完成内容

### 文件结构
```
src/services/
└── feishu.ts      # 飞书服务实现

test/unit/services/
└── feishu.test.ts # 飞书服务测试
```

### 核心功能

1. **签名验证** (`verifySignature`)
   - 使用 SHA-256 验证消息签名
   - 支持可选的加密密钥配置
   - 未设置密钥时跳过验证

2. **Token 验证** (`verifyToken`)
   - 验证飞书事件订阅 Token
   - 支持可选的验证 Token 配置

3. **事件解析** (`parseEvent`)
   - 解析 URL 验证事件（challenge）
   - 解析消息事件（包含文本、图片等类型）
   - 提取消息内容、发送者、聊天信息

4. **消息发送** (`sendMessage`)
   - 获取飞书租户 Token
   - 发送文本消息到指定聊天
   - 支持错误处理和重试

### 数据结构

```typescript
interface FeishuMessage {
  messageId: string;
  chatId: string;
  chatType: 'p2p' | 'group';
  sender: {
    senderId: string;
    senderType: string;
  };
  content: string;
  msgType: string;
  createTime: string;
}

interface FeishuEvent {
  type: 'message' | 'url_verification' | 'other';
  token?: string;
  challenge?: string;
  message?: FeishuMessage;
}
```

### 测试覆盖

- ✅ 签名验证（有效/无效/无密钥）
- ✅ Token 验证（有效/无效/无 Token）
- ✅ 事件解析（URL 验证/消息/未知）
- ✅ 消息内容解析（文本/非文本）
- ✅ 消息发送（成功/失败）

### 使用示例

```typescript
import { feishuService } from './services/feishu.js';

// 验证签名
const isValid = feishuService.verifySignature(
  timestamp,
  nonce,
  body,
  signature
);

// 解析事件
const event = feishuService.parseEvent(requestBody);

// 发送消息
await feishuService.sendMessage(chatId, 'Hello from Agent!');
```

### 注意事项

1. 消息发送需要先获取租户 Token
2. 文本消息内容需要 JSON 解析
3. 签名验证使用 timestamp + nonce + encrypt_key + body 的 SHA-256
4. 服务依赖配置模块获取飞书应用凭证

### 下一步

继续实现 Agent 服务模块，包括：
- pi-coding-agent 初始化
- 消息处理和任务执行
- 结果处理和返回
