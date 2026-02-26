import type { Request, Response } from 'express';
import { getConfig } from '../config/index.js';
import { agentService } from '../services/agent.js';
import { feishuService } from '../services/feishu.js';

export interface FeishuWebhookBody {
  timestamp?: string;
  nonce?: string;
  signature?: string;
  challenge?: string;
  token?: string;
  encrypt?: string;
  event?: Record<string, unknown>;
}

export class FeishuController {
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as FeishuWebhookBody;
      const timestamp = req.headers['x-lark-request-timestamp'] as string | undefined;
      const nonce = req.headers['x-lark-request-nonce'] as string | undefined;
      const signature = req.headers['x-lark-signature'] as string | undefined;

      if (timestamp && nonce && signature) {
        const rawBody = JSON.stringify(req.body);
        const isValid = feishuService.verifySignature(timestamp, nonce, rawBody, signature);
        if (!isValid) {
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }
      }

      const event = feishuService.parseEvent(body as Record<string, unknown>);

      if (event.type === 'url_verification') {
        await this.handleUrlVerification(event.token, event.challenge, res);
        return;
      }

      if (event.type === 'message' && event.message) {
        await this.handleMessage(event.message, res);
        return;
      }

      res.status(200).json({ status: 'ignored' });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  private async handleUrlVerification(
    token: string | undefined,
    challenge: string | undefined,
    res: Response
  ): Promise<void> {
    if (!token || !challenge) {
      res.status(400).json({ error: 'Missing token or challenge' });
      return;
    }

    const isValid = feishuService.verifyToken(token);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    res.status(200).json({ challenge });
  }

  private async handleMessage(
    message: {
      messageId: string;
      chatId: string;
      chatType: 'p2p' | 'group';
      sender: { senderId: string; senderType: string };
      content: string;
      msgType: string;
      createTime: string;
    },
    res: Response
  ): Promise<void> {
    res.status(200).json({ status: 'processing' });

    try {
      if (message.msgType !== 'text') {
        await feishuService.sendMessage(message.chatId, '抱歉，我目前只支持文本消息。');
        return;
      }

      // 解析消息内容，检查是否包含命令
      const content = message.content.trim();

      // 调用 agentService 处理消息
      const response = await agentService.processMessage(content);

      // 发送响应
      await feishuService.sendMessage(message.chatId, response.content);
    } catch (error) {
      console.error('Error processing message:', error);
      try {
        await feishuService.sendMessage(message.chatId, '抱歉，处理消息时出现了错误，请稍后重试。');
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  }

  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      const config = getConfig();
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        config: {
          server: {
            port: config.server.port,
            nodeEnv: config.server.nodeEnv,
          },
          feishu: {
            appId: `${config.feishu.appId.substring(0, 4)}****`,
          },
          agent: {
            modelProvider: config.agent.modelProvider,
            modelName: config.agent.modelName,
          },
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export const feishuController = new FeishuController();
