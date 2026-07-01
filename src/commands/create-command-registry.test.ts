import { describe, expect, test } from "bun:test";
import type { SlashCommandContext } from "./command";
import { createDefaultCommandRegistry } from "./create-command-registry";

function createContext(): SlashCommandContext {
	return {
		historySession: {
			id: "session-1",
			agentId: "sonny",
			title: "Test session",
			messageCount: 3,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
			systemPrompt: "system",
		},
		skills: [
			{
				name: "typescript",
				description: "Write TypeScript code.",
				body: "body",
				path: "/skills/typescript/SKILL.md",
				directory: "/skills/typescript",
			},
		],
		getMessageCount: () => 4,
	};
}

describe("createDefaultCommandRegistry", () => {
	test("registers help command", async () => {
		const registry = createDefaultCommandRegistry();
		const result = await registry.dispatch("/help", createContext());

		expect(result).toEqual({
			handled: true,
			result: {
				type: "message",
				content: [
					"/help (/h) - Show available commands.",
					"/skills [query] - List loaded skills.",
					"/session - Show current session information.",
				].join("\n"),
			},
		});
	});

	test("registers skills command", async () => {
		const registry = createDefaultCommandRegistry();
		const result = await registry.dispatch("/skills type", createContext());

		expect(result).toEqual({
			handled: true,
			result: {
				type: "message",
				content: "typescript - Write TypeScript code.",
			},
		});
	});

	test("registers session command", async () => {
		const registry = createDefaultCommandRegistry();
		const result = await registry.dispatch("/session", createContext());

		expect(result).toEqual({
			handled: true,
			result: {
				type: "message",
				content: [
					"Session: session-1",
					"Title: Test session",
					"Messages: 4",
				].join("\n"),
			},
		});
	});
});
