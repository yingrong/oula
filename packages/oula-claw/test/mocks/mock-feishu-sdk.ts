import { vi } from 'vitest';
import type { MessageEventData } from '../../src/services/ws-service.js';

/**
 * Mock 飞书 SDK
 * 用于测试时模拟飞书的消息收发功能
 */

export interface MockMessage {
  content: string;
  chatId: string;
  chatType: 'p2p' | 'group';
  senderId: string;
  messageType: string;
}

export interface MockReply {
  chatId: string;
  content: string;
}

// 事件处理器类型定义
type EventHandler = (data: MessageEventData) => Promise<void>;

export class MockFeishuSDK {
  private eventHandlers: Map<string, EventHandler> = new Map();
  private replies: MockReply[] = [];
  private connected = false;

  // 模拟启动连接
  start(): void {
    this.connected = true;
    console.log('[MockFeishuSDK] Connected');
  }

  // 模拟停止连接
  stop(): void {
    this.connected = false;
    console.log('[MockFeishuSDK] Disconnected');
  }

  // 注册事件处理器（模拟 EventDispatcher.register）
  on(event: string, handler: EventHandler): void {
    this.eventHandlers.set(event, handler);
    console.log(`[MockFeishuSDK] Registered handler for ${event}`);
  }

  // 模拟用户发送消息到机器人
  async simulateUserMessage(message: MockMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('Mock SDK not connected');
    }

    const eventData: MessageEventData = {
      message: {
        message_id: `msg_${Date.now()}`,
        chat_id: message.chatId,
        chat_type: message.chatType,
        content: JSON.stringify({ text: message.content }),
        message_type: message.messageType,
        create_time: String(Date.now()),
      },
      sender: {
        sender_id: {
          union_id: message.senderId,
        },
        sender_type: 'user',
      },
    };

    const handler = this.eventHandlers.get('im.message.receive_v1');
    if (handler) {
      await handler(eventData);
    } else {
      throw new Error('No handler registered for im.message.receive_v1');
    }
  }

  // 捕获机器人发送的回复
  captureReply(chatId: string, content: string): void {
    this.replies.push({ chatId, content });
    console.log(`[MockFeishuSDK] Captured reply: "${content}" to chat ${chatId}`);
  }

  // 获取所有捕获的回复
  getReplies(): MockReply[] {
    return [...this.replies];
  }

  // 获取最后一条回复
  getLastReply(): MockReply | undefined {
    return this.replies[this.replies.length - 1];
  }

  // 清除所有回复记录
  clearReplies(): void {
    this.replies = [];
  }

  // 检查是否已连接
  checkConnected(): boolean {
    return this.connected;
  }
}

// Mock 飞书 API 客户端
export class MockFeishuAPIClient {
  private tenantToken = 'mock_tenant_token';
  private sentMessages: Array<{ chatId: string; content: string }> = [];

  async getTenantToken(): Promise<string> {
    return this.tenantToken;
  }

  async sendMessage(chatId: string, content: string): Promise<void> {
    this.sentMessages.push({ chatId, content });
    console.log(`[MockFeishuAPIClient] Message sent to ${chatId}: "${content}"`);
  }

  getSentMessages(): Array<{ chatId: string; content: string }> {
    return [...this.sentMessages];
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }
}

// Vitest mock 工厂函数
export function createMockLarkSDK() {
  const mockSDK = new MockFeishuSDK();

  return {
    Client: vi.fn().mockImplementation(() => ({
      im: {
        v1: {
          message: {
            create: vi.fn().mockResolvedValue({
              data: { message_id: `msg_${Date.now()}` },
            }),
          },
        },
      },
    })),
    WSClient: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockImplementation(({ eventDispatcher }) => {
        // 模拟注册事件处理器
        const handlers = eventDispatcher as Map<string, EventHandler>;
        handlers.forEach((handler, event) => {
          mockSDK.on(event, handler);
        });
        mockSDK.start();
      }),
    })),
    EventDispatcher: vi.fn().mockImplementation(() => {
      const handlers = new Map<string, EventHandler>();
      return {
        register: vi.fn().mockImplementation((mapping: Record<string, EventHandler>) => {
          for (const [event, handler] of Object.entries(mapping)) {
            handlers.set(event, handler);
          }
          return handlers;
        }),
      };
    }),
    LoggerLevel: {
      debug: 'debug',
      info: 'info',
      error: 'error',
    },
    // 导出 mock SDK 实例供测试使用
    _mockSDK: mockSDK,
  };
}

// 模拟飞书服务
export function mockFeishuService() {
  const sentMessages: Array<{ chatId: string; content: string }> = [];

  return {
    sendMessage: vi.fn().mockImplementation(async (chatId: string, content: string) => {
      sentMessages.push({ chatId, content });
      console.log(`[MockFeishuService] Message sent: "${content}" to ${chatId}`);
    }),
    getSentMessages: () => [...sentMessages],
    clearSentMessages: () => {
      sentMessages.length = 0;
    },
  };
}
