import { SessionManager } from "@mariozechner/pi-coding-agent";
import type { AgentMessage } from './agent.js';

export class MessageStorageService {
  private sessions: Map<string, any> = new Map();

  /**
   * 获取或创建会话
   */
  getSession(sessionId: string) {
    if (!this.sessions.has(sessionId)) {
      // 创建内存会话
      const session = SessionManager.inMemory();
      this.sessions.set(sessionId, session);
    }
    return this.sessions.get(sessionId);
  }

  /**
   * 存储消息到指定会话
   */
  storeMessage(sessionId: string, message: AgentMessage): void {
    const session = this.getSession(sessionId);
    session.appendMessage(message);
  }

  /**
   * 获取指定会话的消息历史
   */
  getMessages(sessionId: string): AgentMessage[] {
    const session = this.getSession(sessionId);
    const context = session.buildSessionContext();
    return context.messages;
  }

  /**
   * 获取指定会话的最新消息
   */
  getLatestMessages(sessionId: string, limit: number = 20): AgentMessage[] {
    const messages = this.getMessages(sessionId);
    return messages.slice(-limit);
  }

  /**
   * 清空指定会话的消息
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * 获取存储的会话数量
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 获取指定会话的消息数量
   */
  getMessageCount(sessionId: string): number {
    const session = this.getSession(sessionId);
    const context = session.buildSessionContext();
    return context.messages.length;
  }
}

export const messageStorageService = new MessageStorageService();
