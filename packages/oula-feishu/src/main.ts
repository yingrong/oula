#!/usr/bin/env node
// @ts-nocheck

import { join, resolve } from "path";
import { type AgentRunner, getOrCreateRunner } from "./agent.js";
import { createEventsWatcher } from "./events.js";
import * as log from "./log.js";
import { parseSandboxArg, type SandboxConfig, validateSandbox } from "./sandbox.js";
import { type FeishuHandler, type FeishuBot, FeishuBot as FeishuBotClass, type FeishuEvent } from "./feishu.js";
import { ChannelStore } from "./store.js";

// ============================================================================
// Config
// ============================================================================

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

interface ParsedArgs {
	workingDir?: string;
	sandbox: SandboxConfig;
}

function parseArgs(): ParsedArgs {
	const args = process.argv.slice(2);
	let sandbox: SandboxConfig = { type: "host" };
	let workingDir: string | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--sandbox=")) {
			sandbox = parseSandboxArg(arg.slice("--sandbox=".length));
		} else if (arg === "--sandbox") {
			sandbox = parseSandboxArg(args[++i] || "");
		} else if (!arg.startsWith("-")) {
			workingDir = arg;
		}
	}

	return {
		workingDir: workingDir ? resolve(workingDir) : undefined,
		sandbox,
	};
}

const parsedArgs = parseArgs();

// Normal bot mode - require working dir
if (!parsedArgs.workingDir) {
	console.error("Usage: oula-feishu [--sandbox=host|docker:<name>] <working-directory>");
	process.exit(1);
}

const { workingDir, sandbox } = { workingDir: parsedArgs.workingDir, sandbox: parsedArgs.sandbox };

if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
	console.error("Missing env: FEISHU_APP_ID, FEISHU_APP_SECRET");
	process.exit(1);
}

await validateSandbox(sandbox);

// ============================================================================
// State (per chat)
// ============================================================================

interface ChatState {
	running: boolean;
	runner: AgentRunner;
	store: ChannelStore;
	stopRequested: boolean;
	stopMessageId?: string;
}

const chatStates = new Map<string, ChatState>();

function getState(chatId: string): ChatState {
	let state = chatStates.get(chatId);
	if (!state) {
		const chatDir = join(workingDir, chatId);
		state = {
			running: false,
			runner: getOrCreateRunner(sandbox, chatId, chatDir),
			store: new ChannelStore({ workingDir }),
			stopRequested: false,
		};
		chatStates.set(chatId, state);
	}
	return state;
}

// ============================================================================
// Create FeishuContext adapter
// ============================================================================

function createFeishuContext(event: FeishuEvent, feishu: FeishuBot, state: ChatState, isEvent?: boolean) {
	let messageId: string | null = null;
	const threadMessageIds: string[] = [];
	let accumulatedText = "";
	let isWorking = true;
	const workingIndicator = " ...";
	let updatePromise = Promise.resolve();

	const user = feishu.getUser(event.userId);

	// Extract event filename for status message
	const eventFilename = isEvent ? event.text.match(/^\[EVENT:([^:]+):/)?.[1] : undefined;

	return {
		message: {
			text: event.text,
			rawText: event.text,
			user: event.userId,
			userName: user?.userName,
			chatId: event.chatId,
			messageId: event.messageId,
			attachments: (event.attachments || []).map((a) => ({ local: a.local })),
		},
		chatName: feishu.getChat(event.chatId)?.name,
		chats: feishu.getAllChats().map((c) => ({ id: c.chatId, name: c.name })),
		users: feishu.getAllUsers().map((u) => ({ id: u.userId, userName: u.userName, displayName: u.displayName })),

		respond: async (text: string, shouldLog = true) => {
			updatePromise = updatePromise.then(async () => {
				accumulatedText = accumulatedText ? `${accumulatedText}\n${text}` : text;
				const displayText = isWorking ? accumulatedText + workingIndicator : accumulatedText;

				if (messageId) {
					await feishu.updateMessage(messageId, displayText);
				} else {
					messageId = await feishu.sendMessage(event.chatId, displayText);
				}

				if (shouldLog && messageId) {
					feishu.logBotResponse(event.chatId, text, messageId);
				}
			});
			await updatePromise;
		},

		replaceMessage: async (text: string) => {
			updatePromise = updatePromise.then(async () => {
				accumulatedText = text;
				const displayText = isWorking ? accumulatedText + workingIndicator : accumulatedText;
				if (messageId) {
					await feishu.updateMessage(messageId, displayText);
				} else {
					messageId = await feishu.sendMessage(event.chatId, displayText);
				}
			});
			await updatePromise;
		},

		respondInThread: async (text: string) => {
			updatePromise = updatePromise.then(async () => {
				if (messageId) {
					const ts = await feishu.replyInThread(event.chatId, messageId, text);
					threadMessageIds.push(ts);
				}
			});
			await updatePromise;
		},

		setTyping: async (isTyping: boolean) => {
			if (isTyping && !messageId) {
				updatePromise = updatePromise.then(async () => {
					if (!messageId) {
						accumulatedText = eventFilename ? `_Starting event: ${eventFilename}_` : "_Thinking_";
						messageId = await feishu.sendMessage(event.chatId, accumulatedText + workingIndicator);
					}
				});
				await updatePromise;
			}
		},

		uploadFile: async (filePath: string, title?: string) => {
			await feishu.uploadFile(event.chatId, filePath, title);
		},

		setWorking: async (working: boolean) => {
			updatePromise = updatePromise.then(async () => {
				isWorking = working;
				if (messageId) {
					const displayText = isWorking ? accumulatedText + workingIndicator : accumulatedText;
					await feishu.updateMessage(messageId, displayText);
				}
			});
			await updatePromise;
		},

		deleteMessage: async () => {
			updatePromise = updatePromise.then(async () => {
				// Delete thread messages first (in reverse order)
				for (let i = threadMessageIds.length - 1; i >= 0; i--) {
					try {
						await feishu.deleteMessage(threadMessageIds[i]);
					} catch {
						// Ignore errors deleting thread messages
					}
				}
				threadMessageIds.length = 0;
				// Then delete main message
				if (messageId) {
					await feishu.deleteMessage(messageId);
					messageId = null;
				}
			});
			await updatePromise;
		},
	};
}

// ============================================================================
// Handler
// ============================================================================

const handler: FeishuHandler = {
	isRunning(chatId: string): boolean {
		const state = chatStates.get(chatId);
		return state?.running ?? false;
	},

	async handleStop(chatId: string, feishu: FeishuBot): Promise<void> {
		const state = chatStates.get(chatId);
		if (state?.running) {
			state.stopRequested = true;
			state.runner.abort();
			const msgId = await feishu.sendMessage(chatId, "_Stopping..._");
			state.stopMessageId = msgId; // Save for updating later
		} else {
			await feishu.sendMessage(chatId, "_Nothing running_");
		}
	},

	async handleEvent(event: FeishuEvent, feishu: FeishuBot, isEvent?: boolean): Promise<void> {
		const state = getState(event.chatId);

		// Start run
		state.running = true;
		state.stopRequested = false;

		log.logInfo(`[${event.chatId}] Starting run: ${event.text.substring(0, 50)}`);

		try {
			// Create context adapter
			const ctx = createFeishuContext(event, feishu, state, isEvent);

			// Run the agent
			await ctx.setTyping(true);
			await ctx.setWorking(true);
			const result = await state.runner.run(ctx as any, state.store);
			await ctx.setWorking(false);

			if (result.stopReason === "aborted" && state.stopRequested) {
				if (state.stopMessageId) {
					await feishu.updateMessage(state.stopMessageId, "_Stopped_");
					state.stopMessageId = undefined;
				} else {
					await feishu.sendMessage(event.chatId, "_Stopped_");
				}
			}
		} catch (err) {
			log.logWarning(`[${event.chatId}] Run error`, err instanceof Error ? err.message : String(err));
		} finally {
			state.running = false;
		}
	},
};

// ============================================================================
// Start
// ============================================================================

log.logStartup(workingDir, sandbox.type === "host" ? "host" : `docker:${sandbox.container}`);

// Shared store for attachment downloads (also used per-chat in getState)
const sharedStore = new ChannelStore({ workingDir });

const bot = new FeishuBotClass(handler, {
	appId: FEISHU_APP_ID,
	appSecret: FEISHU_APP_SECRET,
	workingDir,
	store: sharedStore,
});

// Start events watcher
const eventsWatcher = createEventsWatcher(workingDir, bot);
eventsWatcher.start();

// Handle shutdown
process.on("SIGINT", () => {
	log.logInfo("Shutting down...");
	eventsWatcher.stop();
	process.exit(0);
});

process.on("SIGTERM", () => {
	log.logInfo("Shutting down...");
	eventsWatcher.stop();
	process.exit(0);
});

bot.start();
