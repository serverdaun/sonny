import type { ChatMessage } from "./message";

export type SessionStateOptions = {
	initialMessages?: ChatMessage[];
};

export class SessionState {
	private readonly messages: ChatMessage[];

	constructor(options: SessionStateOptions = {}) {
		this.messages = [...(options.initialMessages ?? [])];
	}

	addMessage(message: ChatMessage): void {
		this.messages.push(message);
	}

	buildMessages(systemPrompt: string): ChatMessage[] {
		return [{ role: "system", content: systemPrompt }, ...this.messages];
	}

	getMessages(): ChatMessage[] {
		return [...this.messages];
	}

	get messageCount(): number {
		return this.messages.length;
	}
}
