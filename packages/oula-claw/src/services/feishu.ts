import crypto from 'node:crypto';
import { getConfig } from '../config/index.js';

export interface FeishuMessage {
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

export interface FeishuEvent {
  type: 'message' | 'url_verification' | 'other';
  token?: string;
  challenge?: string;
  encrypt?: string;
  message?: FeishuMessage;
}

export class FeishuService {
  private get config() {
    return getConfig().feishu;
  }

  verifySignature(timestamp: string, nonce: string, body: string, signature: string): boolean {
    const encryptKey = this.config.encryptKey;
    if (!encryptKey) {
      return true;
    }

    const content = `${timestamp}${nonce}${encryptKey}${body}`;
    const computedSignature = crypto.createHash('sha256').update(content).digest('hex');
    return computedSignature === signature;
  }

  verifyToken(token: string): boolean {
    const verificationToken = this.config.verificationToken;
    if (!verificationToken) {
      return true;
    }
    return token === verificationToken;
  }

  parseEvent(body: Record<string, unknown>): FeishuEvent {
    if (body.challenge && body.token) {
      return {
        type: 'url_verification',
        token: body.token as string,
        challenge: body.challenge as string,
      };
    }

    const event = body.event as Record<string, unknown> | undefined;
    if (event?.message) {
      const message = event.message as Record<string, unknown>;
      const sender = event.sender as Record<string, unknown>;

      return {
        type: 'message',
        message: {
          messageId: message.message_id as string,
          chatId: message.chat_id as string,
          chatType: message.chat_type as 'p2p' | 'group',
          sender: {
            senderId: (sender.sender_id as Record<string, unknown>)?.union_id as string,
            senderType: sender.sender_type as string,
          },
          content: this.parseMessageContent(message.content as string, message.msg_type as string),
          msgType: message.msg_type as string,
          createTime: message.create_time as string,
        },
      };
    }

    return { type: 'other' };
  }

  private parseMessageContent(content: string, msgType: string): string {
    if (msgType === 'text') {
      try {
        const parsed = JSON.parse(content);
        return parsed.text || '';
      } catch {
        return content;
      }
    }
    return content;
  }

  async sendMessage(chatId: string, content: string, msgType = 'text'): Promise<void> {
    const { appId, appSecret } = this.config;

    const tenantToken = await this.getTenantToken(appId, appSecret);

    const url = 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id';

    const body = {
      receive_id: chatId,
      content: JSON.stringify({ text: content }),
      msg_type: msgType,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tenantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  private async getTenantToken(appId: string, appSecret: string): Promise<string> {
    const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get tenant token: ${error}`);
    }

    const data = (await response.json()) as { tenant_access_token: string };
    return data.tenant_access_token;
  }
}

export const feishuService = new FeishuService();
