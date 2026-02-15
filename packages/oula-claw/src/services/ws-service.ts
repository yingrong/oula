import * as Lark from '@larksuiteoapi/node-sdk';
import { getConfig } from '../config/index.js';
import { agentService } from './agent.js';
import { feishuService } from './feishu.js';

export interface MessageEventData {
  message: {
    message_id: string;
    chat_id: string;
    chat_type: 'p2p' | 'group';
    content: string;
    message_type: string;
    create_time: string;
  };
  sender: {
    sender_id: {
      union_id: string;
    };
    sender_type: string;
  };
}

export class WsService {
  private wsClient: Lark.WSClient | null = null;
  private apiClient: Lark.Client | null = null;

  async start(): Promise<void> {
    const config = getConfig().feishu;

    const baseConfig = {
      appId: config.appId,
      appSecret: config.appSecret,
    };

    // 创建 API 客户端（用于发送消息）
    this.apiClient = new Lark.Client(baseConfig);

    // 创建 WebSocket 客户端
    this.wsClient = new Lark.WSClient({
      ...baseConfig,
      loggerLevel:
        process.env.NODE_ENV === 'development' ? Lark.LoggerLevel.debug : Lark.LoggerLevel.info,
    });

    // 启动 WebSocket 连接
    this.wsClient.start({
      eventDispatcher: new Lark.EventDispatcher({}).register({
        'im.message.receive_v1': async (data: MessageEventData) => {
          console.log('[WsService] Received message:', JSON.stringify(data, null, 2));
          await this.handleMessage(data);
        },
      }),
    });

    console.log('[WsService] WebSocket connection started');
  }

  async stop(): Promise<void> {
    if (this.wsClient) {
      // WSClient 没有 stop 方法，直接置空
      this.wsClient = null;
      console.log('[WsService] WebSocket connection stopped');
    }
  }

  private async handleMessage(data: MessageEventData): Promise<void> {
    const { message, sender } = data;

    try {
      console.log(`[WsService] Message type: ${message.message_type}`);
      console.log(`[WsService] Message content: ${message.content}`);

      // 解析消息内容
      const content = this.parseMessageContent(message.content, message.message_type);

      if (!content) {
        await feishuService.sendMessage(message.chat_id, '抱歉，我无法处理这条消息的内容。');
        return;
      }

      console.log(`[WsService] Processing message: "${content}" from ${sender.sender_id.union_id}`);

      // 调用 Agent 处理消息
      const response = await agentService.processMessage(content);

      // 发送回复
      await feishuService.sendMessage(message.chat_id, response.content);
      console.log('[WsService] Reply sent successfully');
    } catch (error) {
      console.error('[WsService] Error handling message:', error);
      try {
        await feishuService.sendMessage(
          message.chat_id,
          '抱歉，处理消息时出现了错误，请稍后重试。'
        );
      } catch (sendError) {
        console.error('[WsService] Error sending error message:', sendError);
      }
    }
  }

  private parseMessageContent(content: string, messageType: string): string {
    try {
      const parsed = JSON.parse(content);

      // 根据消息类型提取文本内容
      switch (messageType) {
        case 'text':
          return parsed.text || '';
        case 'post':
          // 富文本消息，尝试提取所有文本内容
          return this.extractTextFromPost(parsed);
        case 'interactive':
          // 卡片消息
          return parsed.title || parsed.header?.title?.content || JSON.stringify(parsed);
        default:
          // 其他类型，尝试提取文本字段或返回字符串化内容
          return parsed.text || parsed.content || JSON.stringify(parsed);
      }
    } catch {
      // 如果解析失败，返回原始内容
      return content;
    }
  }

  private extractTextFromPost(postData: unknown): string {
    try {
      const texts: string[] = [];
      const post = postData as { content?: Array<Array<{ text?: string; tag?: string }>> };

      if (post.content && Array.isArray(post.content)) {
        for (const paragraph of post.content) {
          if (Array.isArray(paragraph)) {
            for (const item of paragraph) {
              if (item.text) {
                texts.push(item.text);
              }
            }
          }
        }
      }

      return texts.join(' ');
    } catch {
      return JSON.stringify(postData);
    }
  }
}

export const wsService = new WsService();
