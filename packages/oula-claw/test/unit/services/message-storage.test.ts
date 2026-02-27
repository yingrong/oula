import { describe, it, expect, beforeEach } from 'vitest';
import { MessageStorageService, messageStorageService } from '../../../src/services/message-storage.js';

describe('MessageStorageService', () => {
  let storageService: MessageStorageService;

  beforeEach(() => {
    // 创建新的实例进行测试
    storageService = new MessageStorageService({
      maxMessagesPerSession: 5,
      sessionTimeoutMs: 1000, // 1秒过期
    });
  });

  it('should store and retrieve messages', () => {
    const sessionId = 'test-session-1';
    const message1 = { role: 'user' as const, content: 'Hello' };
    const message2 = { role: 'assistant' as const, content: 'Hi there!' };

    storageService.storeMessage(sessionId, message1);
    storageService.storeMessage(sessionId, message2);

    const messages = storageService.getMessages(sessionId);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual(message1);
    expect(messages[1]).toEqual(message2);
  });

  it('should store multiple messages', () => {
    const sessionId = 'test-session-2';

    // 存储6条消息
    for (let i = 1; i <= 6; i++) {
      storageService.storeMessage(sessionId, { role: 'user' as const, content: `Message ${i}` });
    }

    const messages = storageService.getMessages(sessionId);
    expect(messages).toHaveLength(6); // 应该存储所有消息
    expect(messages[0].content).toBe('Message 1'); // 第一条消息应该存在
  });

  it('should get latest messages with limit', () => {
    const sessionId = 'test-session-3';

    // 存储5条消息
    for (let i = 1; i <= 5; i++) {
      storageService.storeMessage(sessionId, { role: 'user' as const, content: `Message ${i}` });
    }

    // 获取最近3条
    const latestMessages = storageService.getLatestMessages(sessionId, 3);
    expect(latestMessages).toHaveLength(3);
    expect(latestMessages[0].content).toBe('Message 3');
    expect(latestMessages[1].content).toBe('Message 4');
    expect(latestMessages[2].content).toBe('Message 5');
  });

  it('should clear session', () => {
    const sessionId = 'test-session-4';
    storageService.storeMessage(sessionId, { role: 'user' as const, content: 'Hello' });

    expect(storageService.getMessageCount(sessionId)).toBe(1);
    storageService.clearSession(sessionId);
    expect(storageService.getMessageCount(sessionId)).toBe(0);
  });

  it('should handle multiple sessions', () => {
    const sessionId1 = 'test-session-5';
    const sessionId2 = 'test-session-6';

    storageService.storeMessage(sessionId1, { role: 'user' as const, content: 'Hello from session 1' });
    storageService.storeMessage(sessionId2, { role: 'user' as const, content: 'Hello from session 2' });

    expect(storageService.getMessageCount(sessionId1)).toBe(1);
    expect(storageService.getMessageCount(sessionId2)).toBe(1);
    expect(storageService.getSessionCount()).toBe(2);
  });

  it('should handle session management', () => {
    const sessionId = 'test-session-7';
    storageService.storeMessage(sessionId, { role: 'user' as const, content: 'Hello' });

    expect(storageService.getSessionCount()).toBe(1);
    expect(storageService.getMessageCount(sessionId)).toBe(1);

    // 清空会话
    storageService.clearSession(sessionId);
    expect(storageService.getSessionCount()).toBe(0);
  });
});

describe('messageStorageService singleton', () => {
  it('should be an instance of MessageStorageService', () => {
    expect(messageStorageService).toBeInstanceOf(MessageStorageService);
  });

  it('should store messages correctly', () => {
    const sessionId = 'singleton-test';
    messageStorageService.storeMessage(sessionId, { role: 'user' as const, content: 'Test message' });
    const messages = messageStorageService.getMessages(sessionId);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Test message');
  });
});
