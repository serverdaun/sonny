import { beforeEach, describe, expect, test } from "bun:test";
import type { AgentDefinition } from "../agents/schemas/agent.schema";
import { SessionState } from "./session-state";

describe("SessionState", () => {
	let state: SessionState;

	const agent: AgentDefinition = {
		id: "sonny",
		name: "Sonny",
		description: "Test assistant",
		instructions: "You are Sonny",
	};

	beforeEach(() => {
		state = new SessionState(agent);
	});

	test("starts with no conversation messages", () => {
		expect(state.messageCount).toBe(0);
	});

	test("builds messages with the system prompt first", () => {
		state.addMessage({ role: "user", content: "Hello" });

		expect(state.buildMessages()).toEqual([
			{ role: "system", content: "You are Sonny" },
			{ role: "user", content: "Hello" },
		]);
	});

	test("counts added conversation messages", () => {
		state.addMessage({ role: "user", content: "Hello" });
		state.addMessage({ role: "assistant", content: "Hey there" });

		expect(state.messageCount).toBe(2);
	});
});
