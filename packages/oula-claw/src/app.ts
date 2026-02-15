import express from 'express';
import { getConfig, loadConfig } from './config/index.js';
import { feishuController } from './controllers/feishu.js';
import { wsService } from './services/ws-service.js';

function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // 健康检查端点
  app.get('/health', feishuController.healthCheck);

  // 保留 Webhook 端点用于兼容性（可选）
  app.post('/webhook/feishu', feishuController.handleWebhook);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  );

  return app;
}

async function startServer(): Promise<void> {
  try {
    loadConfig();
    const config = getConfig();

    // 启动 HTTP 服务（用于健康检查）
    const app = createApp();
    const port = config.server.port;

    const server = app.listen(port, () => {
      console.log(`🚀 HTTP server is running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🤖 Model: ${config.agent.modelProvider}/${config.agent.modelName}`);
    });

    // 启动 WebSocket 长连接（用于接收飞书事件）
    console.log('🔌 Starting WebSocket connection...');
    await wsService.start();
    console.log('✅ WebSocket connection established');

    // 优雅关闭
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      // 关闭 WebSocket 连接
      await wsService.stop();

      // 关闭 HTTP 服务
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // 强制关闭超时
      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { createApp, startServer };
