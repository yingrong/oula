// Type overrides for compatibility with pi packages
declare module "@mariozechner/pi-agent-core" {
	export type AgentTool<T = any> = any;
}

// Allow any for AuthStorage since constructor is private
declare module "@mariozechner/pi-coding-agent" {
	export class AuthStorage {
		static open(path: string): AuthStorage;
		getApiKey(provider: string): Promise<string | null>;
	}
}
