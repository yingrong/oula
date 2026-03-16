// @ts-nocheck
import * as Lark from '@larksuiteoapi/node-sdk';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import * as log from './log.js';
import type { Attachment, ChannelStore } from './store.js';

// ============================================================================
// Types
// ============================================================================

export interface FeishuEvent {
	type: 'mention' | 'p2p';
	chatId: string;
	messageId: string;
	userId: string;
	text: string;
	createTime?: string;
	files?: Array<{ name?: string; url?: string }>;
	/** Processed attachments with local paths (populated after logUserMessage) */
	attachments?: Attachment[];
}

export interface FeishuUser {
	userId: string;
	userName: string;
	displayName: string;
}

export interface FeishuChat {
	chatId: string;
	name: string;
	chatType: 'p2p' | 'group';
}

// Types used by agent.ts
export interface ChatInfo {
	id: string;
	name: string;
}

export interface UserInfo {
	id: string;
	userName: string;
	displayName: string;
}

export interface FeishuContext {
	message: {
		text: string;
		rawText: string;
		user: string;
		userName?: string;
		chatId: string;
		messageId: string;
		attachments: Array<{ local: string }>;
	};
	chatName?: string;
	chats: ChatInfo[];
	users: UserInfo[];
	respond: (text: string, shouldLog?: boolean) => Promise<void>;
	replaceMessage: (text: string) => Promise<void>;
	respondInThread: (text: string) => Promise<void>;
	setTyping: (isTyping: boolean) => Promise<void>;
	uploadFile: (filePath: string, title?: string) => Promise<void>;
	setWorking: (working: boolean) => Promise<void>;
	deleteMessage: () => Promise<void>;
}

export interface FeishuHandler {
	/**
	 * Check if chat is currently running (SYNC)
	 */
	isRunning(chatId: string): boolean;

	/**
	 * Handle an event that triggers feishu bot (ASYNC)
	 * Called only when isRunning() returned false for user messages.
	 * Events always queue and pass isEvent=true.
	 */
	handleEvent(event: FeishuEvent, feishu: FeishuBot, isEvent?: boolean): Promise<void>;

	/**
	 * Handle stop command (ASYNC)
	 * Called when user says "stop" while bot is running
	 */
	handleStop(chatId: string, feishu: FeishuBot): Promise<void>;
}

// ============================================================================
// Per-chat queue for sequential processing
// ============================================================================

type QueuedWork = () => Promise<void>;

class ChatQueue {
	private queue: QueuedWork[] = [];
	private processing = false;

	enqueue(work: QueuedWork): void {
		this.queue.push(work);
		this.processNext();
	}

	size(): number {
		return this.queue.length;
	}

	private async processNext(): Promise<void> {
		if (this.processing || this.queue.length === 0) return;
		this.processing = true;
		const work = this.queue.shift()!;
		try {
			await work();
		} catch (err) {
			log.logWarning('Queue error', err instanceof Error ? err.message : String(err));
		}
		this.processing = false;
		this.processNext();
	}
}

// ============================================================================
// FeishuBot
// ============================================================================

export class FeishuBot {
	private wsClient: Lark.WSClient | null = null;
	private client: Lark.Client;
	private handler: FeishuHandler;
	private workingDir: string;
	private store: ChannelStore;
	private botUserId: string | null = null;
	private startupTime: number = Date.now(); // Messages older than this are just logged, not processed

	private users = new Map<string, FeishuUser>();
	private chats = new Map<string, FeishuChat>();
	private queues = new Map<string, ChatQueue>();
	private messageIds = new Map<string, string>(); // messageId -> responseMessageId

	constructor(
		handler: FeishuHandler,
		config: { appId: string; appSecret: string; workingDir: string; store: ChannelStore },
	) {
		this.handler = handler;
		this.workingDir = config.workingDir;
		this.store = config.store;

		// Create Lark client
		this.client = new Lark.Client({
			appId: config.appId,
			appSecret: config.appSecret,
		});
	}

	// ==========================================================================
	// Public API
	// ==========================================================================

	async start(): Promise<void> {
		// Get bot info
		try {
			const user = await (this.client as any).contact.user.get({
				userId: 'me',
				userIdType: 'user_id',
			});
			if (user.data?.user) {
				this.botUserId = user.data.user.user_id;
			}
		} catch (err) {
			log.logWarning('Failed to get bot user info', String(err));
		}

		log.logInfo(`Loaded ${this.chats.size} chats, ${this.users.size} users`);

		// Start WebSocket client
		this.wsClient = new Lark.WSClient({
			appId: this.client.appId,
			appSecret: this.client.appSecret,
			loggerLevel: process.env.NODE_ENV === 'development' ? Lark.LoggerLevel.debug : Lark.LoggerLevel.info,
		});

		this.wsClient.start({
			eventDispatcher: new Lark.EventDispatcher({}).register({
				'im.message.receive_v1': async (data: any) => {
					console.log('[FeishuBot] Received message:', JSON.stringify(data, null, 2));
					await this.handleMessage(data);
				},
			}),
		});

		log.logConnected();
	}

	getUser(userId: string): FeishuUser | undefined {
		return this.users.get(userId);
	}

	getChat(chatId: string): FeishuChat | undefined {
		return this.chats.get(chatId);
	}

	getAllUsers(): FeishuUser[] {
		return Array.from(this.users.values());
	}

	getAllChats(): FeishuChat[] {
		return Array.from(this.chats.values());
	}

	async sendMessage(chatId: string, text: string): Promise<string> {
		const result = await this.client.im.message.create({
			params: {
				receive_id_type: 'chat_id',
			},
			data: {
				receive_id: chatId,
				msg_type: 'text',
				content: JSON.stringify({ text }),
			},
		});
		return result.data?.message_id || '';
	}

	async updateMessage(messageId: string, text: string): Promise<void> {
		await this.client.im.message.patch({
			path: {
				message_id: messageId,
			},
			data: {
				content: JSON.stringify({ text }),
			},
		});
	}

	async deleteMessage(messageId: string): Promise<void> {
		await this.client.im.message.delete({
			path: {
				message_id: messageId,
			},
		});
	}

	async replyInThread(chatId: string, rootMessageId: string, text: string): Promise<string> {
		const result = await this.client.im.message.reply({
			path: {
				message_id: rootMessageId,
			},
			data: {
				msg_type: 'text',
				content: JSON.stringify({ text }),
			},
		});
		return result.data?.message_id || '';
	}

	async uploadFile(chatId: string, filePath: string, title?: string): Promise<void> {
		const fileName = title || basename(filePath);
		const fileContent = readFileSync(filePath);

		// First upload the file
		const uploadResult = await (this.client as any).im.file.create({
			data: {
				file_type: 'stream',
				file_name: fileName,
				file: fileContent,
			},
		});

		const fileKey = (uploadResult as any).file_key;
		if (!fileKey) {
			throw new Error('Failed to upload file: no file_key returned');
		}

		// Then send the file message
		await this.client.im.message.create({
			params: {
				receive_id_type: 'chat_id',
			},
			data: {
				receive_id: chatId,
				msg_type: 'file',
				content: JSON.stringify({ file_key: fileKey }),
			},
		});
	}

	/**
	 * Log a message to log.jsonl (SYNC)
	 * This is the ONLY place messages are written to log.jsonl
	 */
	logToFile(chatId: string, entry: object): void {
		const dir = join(this.workingDir, chatId);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		appendFileSync(join(dir, 'log.jsonl'), `${JSON.stringify(entry)}\n`);
	}

	/**
	 * Log a bot response to log.jsonl
	 */
	logBotResponse(chatId: string, text: string, messageId: string): void {
		this.logToFile(chatId, {
			date: new Date().toISOString(),
			ts: messageId,
			user: 'bot',
			text,
			attachments: [],
			isBot: true,
		});
	}

	// ==========================================================================
	// Events Integration
	// ==========================================================================

	/**
	 * Enqueue an event for processing. Always queues (no "already working" rejection).
	 * Returns true if enqueued, false if queue is full (max 5).
	 */
	enqueueEvent(event: FeishuEvent): boolean {
		const queue = this.getQueue(event.chatId);
		if (queue.size() >= 5) {
			log.logWarning(`Event queue full for ${event.chatId}, discarding: ${event.text.substring(0, 50)}`);
			return false;
		}
		log.logInfo(`Enqueueing event for ${event.chatId}: ${event.text.substring(0, 50)}`);
		queue.enqueue(() => this.handler.handleEvent(event, this, true));
		return true;
	}

	// ==========================================================================
	// Private - Event Handlers
	// ==========================================================================

	private getQueue(chatId: string): ChatQueue {
		let queue = this.queues.get(chatId);
		if (!queue) {
			queue = new ChatQueue();
			this.queues.set(chatId, queue);
		}
		return queue;
	}

	private async handleMessage(data: any): Promise<void> {
		try {
			const { message, sender } = data;

			const messageId = message.message_id;
			const chatId = message.chat_id;
			const chatType = message.chat_type; // "p2p" or "group"
			const userId = sender.sender_id.union_id || sender.sender_id.user_id;
			const createTime = message.create_time;

			// Skip old messages (before startup)
			const messageTime = parseInt(createTime, 10);
			if (messageTime < this.startupTime) {
				log.logInfo(
					`[${chatId}] Logged old message (pre-startup), not triggering`
				);
				return;
			}

			// Skip bot's own messages
			if (sender.sender_id.user_id === this.botUserId) {
				return;
			}

			// Parse message content
			let text = '';
			const files: Array<{ name?: string; url?: string }> = [];

			if (message.message_type === 'text') {
				const content = JSON.parse(message.content);
				text = content.text || '';
			} else if (message.message_type === 'post') {
				// Rich text message, try to extract all text
				const content = JSON.parse(message.content);
				text = this.extractTextFromPost(content);
			}

			if (!text && files.length === 0) {
				// No text content, skip
				return;
			}

			const event: FeishuEvent = {
				type: chatType === 'p2p' ? 'p2p' : 'mention',
				chatId,
				messageId,
				userId,
				text: text.trim(),
				createTime,
				files: files.length > 0 ? files : undefined,
			};

			// Log user message
			event.attachments = this.logUserMessage(event);

			// Check for stop command - execute immediately, don't queue!
			if (event.text.toLowerCase().trim() === 'stop' || event.text.toLowerCase().trim() === '停止') {
				if (this.handler.isRunning(chatId)) {
					this.handler.handleStop(chatId, this); // Don't await, don't queue
				} else {
					await this.sendMessage(chatId, '_Nothing running_');
				}
				return;
			}

			// Check if busy
			if (this.handler.isRunning(chatId)) {
				await this.sendMessage(chatId, '_Already working. Say `stop` to cancel._');
			} else {
				this.getQueue(chatId).enqueue(() => this.handler.handleEvent(event, this));
			}
		} catch (err) {
			log.logWarning('Error handling feishu message', err instanceof Error ? err.message : String(err));
		}
	}

	private extractTextFromPost(postData: any): string {
		try {
			const texts: string[] = [];
			const post = postData;

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

	/**
	 * Log a user message to log.jsonl (SYNC)
	 * Downloads attachments in background via store
	 */
	private logUserMessage(event: FeishuEvent): Attachment[] {
		const user = this.users.get(event.userId);
		// Process attachments - queues downloads in background
		const attachments = event.files
			? this.store.processAttachments(event.chatId, event.files, event.messageId)
			: [];
		this.logToFile(event.chatId, {
			date: new Date(parseInt(event.createTime || Date.now().toString(), 10)).toISOString(),
			ts: event.messageId,
			user: event.userId,
			userName: user?.userName,
			displayName: user?.displayName,
			text: event.text,
			attachments,
			isBot: false,
		});
		return attachments;
	}
}
