import type { ChatMessage } from "./message";
import type { SessionState } from "./session-state";

type ChatModel = {
	chat(messages: ChatMessage[]): Promise<string>;
};

export class AgentSession {
	constructor(
		private readonly state: SessionState,
		private readonly llm: ChatModel,
	) {}

	async chat(message: string): Promise<string> {
		this.state.addMessage({ role: "user", content: message });

		const messages = this.state.buildMessages();
		const response = await this.llm.chat(messages);

		this.state.addMessage({ role: "assistant", content: response });

		return response;
	}
}
