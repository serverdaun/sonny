import { beforeEach, describe, expect, test } from "bun:test";
import type { AgentDefinition } from "../agents/schemas/agent.schema";
import { AgentSession } from "./agent-session";
import type { ChatMessage } from "./message";
import { SessionState } from "./session-state";

class FakeLLM {
	readonly calls: ChatMessage[][] = [];

	async chat(messages: ChatMessage[]): Promise<string> {
		this.calls.push(messages);
		return "Hello back";
	}
}

const agent: AgentDefinition = {
	id: "sonny",
	name: "Sonny",
	description: "Test assistant",
	instructions: "You are Sonny.",
};

describe("AgentSession", () => {
	let state: SessionState;
	let llm: FakeLLM;
	let session: AgentSession;

	beforeEach(() => {
		state = new SessionState(agent);
		llm = new FakeLLM();
		session = new AgentSession(state, llm);
	});

	test("sends system prompt and user message to the LLM", async () => {
		await session.chat("Hello");

		expect(llm.calls).toEqual([
			[
				{ role: "system", content: "You are Sonny." },
				{ role: "user", content: "Hello" },
			],
		]);
	});

	test("returns the assistant response", async () => {
		const response = await session.chat("Hello");

		expect(response).toBe("Hello back");
	});

	test("adds user and assistant messages to session state", async () => {
		await session.chat("Hello");

		expect(state.buildMessages()).toEqual([
			{ role: "system", content: "You are Sonny." },
			{ role: "user", content: "Hello" },
			{ role: "assistant", content: "Hello back" },
		]);
	});
});
