import { vi } from 'vitest';

/**
 * Mock OpenAI API
 * 用于测试时模拟 AI 响应
 */

export interface MockAIResponse {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface MockAIRequest {
  messages: Array<{ role: string; content: string }>;
  model: string;
  max_tokens: number;
  temperature: number;
}

export class MockOpenAIClient {
  private responses: Map<string, MockAIResponse> = new Map();
  private defaultResponse: MockAIResponse = {
    content: '这是一个默认的 AI 回复',
    promptTokens: 10,
    completionTokens: 5,
    totalTokens: 15,
  };
  private requestHistory: MockAIRequest[] = [];
  private shouldFail = false;
  private failureError: Error = new Error('Mock AI error');

  // 设置特定输入的响应
  setResponse(input: string, response: string | MockAIResponse): void {
    const normalizedInput = input.toLowerCase().trim();
    const mockResponse = typeof response === 'string' ? { content: response } : response;
    this.responses.set(normalizedInput, mockResponse);
  }

  // 设置默认响应
  setDefaultResponse(response: string | MockAIResponse): void {
    this.defaultResponse = typeof response === 'string' ? { content: response } : response;
  }

  // 模拟失败模式
  setShouldFail(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    if (error) {
      this.failureError = error;
    }
  }

  // 模拟 API 调用
  async chatCompletion(request: MockAIRequest): Promise<MockAIResponse> {
    if (this.shouldFail) {
      throw this.failureError;
    }

    this.requestHistory.push(request);

    // 查找匹配的响应
    const userMessage = request.messages.find((m) => m.role === 'user');
    if (userMessage) {
      const normalizedInput = userMessage.content.toLowerCase().trim();
      const matchedResponse = this.responses.get(normalizedInput);
      if (matchedResponse) {
        return matchedResponse;
      }
    }

    return this.defaultResponse;
  }

  // 获取请求历史
  getRequestHistory(): MockAIRequest[] {
    return [...this.requestHistory];
  }

  // 清除请求历史
  clearRequestHistory(): void {
    this.requestHistory = [];
  }

  // 清除所有响应设置
  clearResponses(): void {
    this.responses.clear();
    this.defaultResponse = {
      content: '这是一个默认的 AI 回复',
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    };
  }
}

// Vitest mock 工厂函数
export function createMockOpenAI() {
  const mockClient = new MockOpenAIClient();

  return {
    // 模拟 fetch 调用 OpenAI API
    mockFetch: vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
      if (url !== 'https://api.openai.com/v1/chat/completions') {
        return {
          ok: false,
          status: 404,
          text: async () => 'Not Found',
        };
      }

      const body = JSON.parse(options.body as string);

      try {
        const response = await mockClient.chatCompletion(body);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: response.content,
                },
              },
            ],
            usage: {
              prompt_tokens: response.promptTokens || 10,
              completion_tokens: response.completionTokens || 5,
              total_tokens: response.totalTokens || 15,
            },
          }),
        };
      } catch (error) {
        return {
          ok: false,
          status: 500,
          text: async () => (error instanceof Error ? error.message : 'Unknown error'),
        };
      }
    }),
    // 导出 mock 客户端供测试使用
    _mockClient: mockClient,
  };
}

// 预设的测试响应
export const mockResponses = {
  greeting: {
    content: '你好！很高兴为你服务。有什么我可以帮助你的吗？',
    promptTokens: 5,
    completionTokens: 10,
    totalTokens: 15,
  },
  help: {
    content: '我可以帮助你回答问题、提供信息、协助完成任务等。请告诉我你需要什么帮助。',
    promptTokens: 5,
    completionTokens: 15,
    totalTokens: 20,
  },
  unknown: {
    content: '抱歉，我不太理解你的问题。你能提供更多细节吗？',
    promptTokens: 5,
    completionTokens: 12,
    totalTokens: 17,
  },
  error: {
    content: '抱歉，我遇到了一些问题，无法处理你的请求。',
    promptTokens: 5,
    completionTokens: 10,
    totalTokens: 15,
  },
};

// 快速设置常用响应的辅助函数
export function setupCommonResponses(mockClient: MockOpenAIClient): void {
  mockClient.setResponse('你好', mockResponses.greeting);
  mockClient.setResponse('hello', mockResponses.greeting);
  mockClient.setResponse('帮助', mockResponses.help);
  mockClient.setResponse('help', mockResponses.help);
  mockClient.setDefaultResponse(mockResponses.unknown);
}
