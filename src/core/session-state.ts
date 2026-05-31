import type { AgentDefinition } from "../agents/schemas/agent.schema";
import type { ChatMessage } from "./message";

export class SessionState {
	private readonly messages: ChatMessage[] = [];

	constructor(private readonly agent: AgentDefinition) {}

	addMessage(message: ChatMessage): void {
		this.messages.push(message);
	}

	buildMessages(): ChatMessage[] {
		return [
			{ role: "system", content: this.agent.instructions },
			...this.messages,
		];
	}

	get messageCount(): number {
		return this.messages.length;
	}
}
