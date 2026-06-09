import { beforeEach, describe, expect, test } from "bun:test";
import type { Tool } from "./tool";
import {
	type ToolApprover,
	type ToolEvent,
	ToolExecutor,
} from "./tool-executor";
import { ToolRegistry } from "./tool-registry";

const createTestTool = (name = "test_tool"): Tool => ({
	name,
	description: "A test tool",
	parameters: {
		type: "object",
		properties: {},
	},
	execute: async () => ({ ok: true, content: "done" }),
});

const createThrowingTool = (name = "throwing_tool"): Tool => ({
	name,
	description: "A tool that throws",
	parameters: {
		type: "object",
		properties: {},
	},
	execute: async () => {
		throw new Error("Something bad happened");
	},
});

const createFailingTool = (name = "failing_tool"): Tool => ({
	name,
	description: "A tool that returns an error",
	parameters: {
		type: "object",
		properties: {},
	},
	execute: async () => ({ ok: false, error: "tool failed" }),
});

describe("ToolExecutor", () => {
	let executor: ToolExecutor;
	let rejectedExecutor: ToolExecutor;
	let registry: ToolRegistry;
	let tool: Tool;
	let throwingTool: Tool;
	let approver: ToolApprover;
	let falseApprover: ToolApprover;

	beforeEach(() => {
		registry = new ToolRegistry();
		tool = createTestTool();
		throwingTool = createThrowingTool();
		approver = async () => ({ approved: true });
		falseApprover = async () => ({
			approved: false,
			reason: "Command can not be executed in this directory",
		});

		registry.register(tool);
		registry.register(throwingTool);

		executor = new ToolExecutor(registry, approver);
		rejectedExecutor = new ToolExecutor(registry, falseApprover);
	});

	test("executes an approved tool call", async () => {
		const result = await executor.execute({
			id: "call_test",
			name: "test_tool",
			parameters: {},
		});

		expect(result).toEqual({
			ok: true,
			content: "done",
		});
	});

	test("rejects denied approval", async () => {
		const result = await rejectedExecutor.execute({
			id: "call_test",
			name: "test_tool",
			parameters: {},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe("denied");
			expect(result.error).toContain("BLOCKED");
			expect(result.error).toContain("User denied this tool call");
			expect(result.error).toContain("Do NOT retry");
			expect(result.error).toContain("do NOT rephrase");
			expect(result.error).toContain("different tool");
			expect(result.error).toContain(
				"Reason: Command can not be executed in this directory",
			);
		}
	});

	test("returns error for unknown tool", async () => {
		const result = await executor.execute({
			id: "call_test",
			name: "unknown_tool",
			parameters: {},
		});

		expect(result).toEqual({
			ok: false,
			error: "Tool not found: unknown_tool",
			reason: "not_found",
		});
	});

	test("returns error when tool throws", async () => {
		const result = await executor.execute({
			id: "call_test",
			name: "throwing_tool",
			parameters: {},
		});

		expect(result).toEqual({
			ok: false,
			error: "Tool execution failed: Something bad happened",
			reason: "execution_failed",
		});
	});

	test("emits started and completed events for approved successful tools", async () => {
		const events: ToolEvent[] = [];
		const executor = new ToolExecutor(registry, approver, (event) => {
			events.push(event);
		});

		await executor.execute({
			id: "call_test",
			name: "test_tool",
			parameters: {
				path: "notes.txt",
			},
		});

		expect(events).toHaveLength(2);
		expect(events[0]).toEqual({
			type: "tool.started",
			toolCallId: "call_test",
			toolName: "test_tool",
			parameters: {
				path: "notes.txt",
			},
			preview: "notes.txt",
		});
		expect(events[1]).toMatchObject({
			type: "tool.completed",
			toolCallId: "call_test",
			toolName: "test_tool",
			parameters: {
				path: "notes.txt",
			},
			ok: true,
			content: "done",
		});
	});

	test("emits completed event for failed tool results", async () => {
		const events: ToolEvent[] = [];
		const failingTool = createFailingTool();
		registry.register(failingTool);
		const executor = new ToolExecutor(registry, approver, (event) => {
			events.push(event);
		});

		await executor.execute({
			id: "call_fail",
			name: "failing_tool",
			parameters: {},
		});

		expect(events).toHaveLength(2);
		expect(events[1]).toMatchObject({
			type: "tool.completed",
			toolCallId: "call_fail",
			toolName: "failing_tool",
			ok: false,
			content: "tool failed",
		});
	});

	test("emits denied completed event", async () => {
		const events: ToolEvent[] = [];
		const executor = new ToolExecutor(registry, falseApprover, (event) => {
			events.push(event);
		});

		await executor.execute({
			id: "call_denied",
			name: "test_tool",
			parameters: {},
		});

		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			type: "tool.completed",
			toolCallId: "call_denied",
			toolName: "test_tool",
			ok: false,
		});
		expect(
			events[0]?.type === "tool.completed" ? events[0].content : "",
		).toContain("BLOCKED");
	});
});
