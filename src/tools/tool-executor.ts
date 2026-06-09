import type { ToolCall } from "../core/message";
import { createLogger } from "../utils/logger";
import type { Tool, ToolResult } from "./tool";
import type { ToolRegistry } from "./tool-registry";

export type ToolApprovalRequest = {
	toolName: string;
	description: string;
	parameters: unknown;
};

export type ToolApprovalDecision =
	| { approved: true }
	| { approved: false; reason?: string };

export type ToolApprover = (
	request: ToolApprovalRequest,
) => Promise<ToolApprovalDecision>;

export type ToolEvent =
	| {
			type: "tool.started";
			toolCallId: string;
			toolName: string;
			parameters: unknown;
			preview: string;
	  }
	| {
			type: "tool.completed";
			toolCallId: string;
			toolName: string;
			parameters: unknown;
			ok: boolean;
			content: string;
			durationMs: number;
	  };

export type ToolEventHandler = (event: ToolEvent) => void;

const logger = createLogger("tools.tool-executor");

function createDeniedToolMessage(reason?: string): string {
	const details = reason === undefined ? "" : ` Reason: ${reason}`;

	return (
		"BLOCKED: User denied this tool call. The user has NOT consented " +
		"to this action. Do NOT retry this tool call, do NOT rephrase it, " +
		"and do NOT attempt the same outcome via a different tool. Stop the " +
		`current workflow and wait for the user before taking further action.${details}`
	);
}

function getParameterValue(parameters: unknown, key: string): string | null {
	if (
		typeof parameters !== "object" ||
		parameters === null ||
		!(key in parameters)
	) {
		return null;
	}

	const value = (parameters as Record<string, unknown>)[key];

	return typeof value === "string" ? value : null;
}

function createToolPreview(toolName: string, parameters: unknown): string {
	const parameterKey = toolName === "bash" ? "command" : "path";
	const value = getParameterValue(parameters, parameterKey);

	return value ?? toolName;
}

export class ToolExecutor {
	constructor(
		private registry: ToolRegistry,
		private approve: ToolApprover,
		private onToolEvent?: ToolEventHandler,
	) {}

	async execute(call: ToolCall): Promise<ToolResult> {
		let tool: Tool;
		const startedAt = Date.now();

		try {
			tool = this.registry.get(call.name);
		} catch (error) {
			const result = {
				ok: false as const,
				error: error instanceof Error ? error.message : String(error),
				reason: "not_found" as const,
			};

			logger.warn("tool.not_found", {
				toolName: call.name,
				toolCallId: call.id,
			});

			this.onToolEvent?.({
				type: "tool.completed",
				toolCallId: call.id,
				toolName: call.name,
				parameters: call.parameters,
				ok: false,
				content: result.error,
				durationMs: Date.now() - startedAt,
			});

			return result;
		}

		logger.info("tool.approval.requested", {
			toolName: call.name,
			toolCallId: call.id,
			parameters: call.parameters,
		});

		const decision = await this.approve({
			toolName: call.name,
			description: tool.description,
			parameters: call.parameters,
		});

		if (!decision.approved) {
			const error = createDeniedToolMessage(decision.reason);
			logger.info("tool.approval.denied", {
				toolName: call.name,
				toolCallId: call.id,
				reason: decision.reason,
			});

			this.onToolEvent?.({
				type: "tool.completed",
				toolCallId: call.id,
				toolName: call.name,
				parameters: call.parameters,
				ok: false,
				content: error,
				durationMs: 0,
			});

			return {
				ok: false,
				error,
				reason: "denied",
			};
		}

		logger.info("tool.approval.approved", {
			toolName: call.name,
			toolCallId: call.id,
		});
		logger.info("tool.started", {
			toolName: call.name,
			toolCallId: call.id,
		});

		this.onToolEvent?.({
			type: "tool.started",
			toolCallId: call.id,
			toolName: call.name,
			parameters: call.parameters,
			preview: createToolPreview(call.name, call.parameters),
		});

		const executionStartedAt = Date.now();

		try {
			const result = await tool.execute(call.parameters);
			const durationMs = Date.now() - executionStartedAt;

			if (result.ok) {
				logger.info("tool.completed", {
					toolName: call.name,
					toolCallId: call.id,
					durationMs,
					contentLength: result.content.length,
				});
			} else {
				logger.warn("tool.failed", {
					toolName: call.name,
					toolCallId: call.id,
					durationMs,
					error: result.error,
				});
			}

			this.onToolEvent?.({
				type: "tool.completed",
				toolCallId: call.id,
				toolName: call.name,
				parameters: call.parameters,
				ok: result.ok,
				content: result.ok ? result.content : result.error,
				durationMs,
			});

			return result;
		} catch (error) {
			const durationMs = Date.now() - executionStartedAt;
			const result = {
				ok: false as const,
				error: `Tool execution failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
				reason: "execution_failed" as const,
			};

			logger.error("tool.failed", {
				toolName: call.name,
				toolCallId: call.id,
				durationMs,
				error: error instanceof Error ? error.message : String(error),
			});

			this.onToolEvent?.({
				type: "tool.completed",
				toolCallId: call.id,
				toolName: call.name,
				parameters: call.parameters,
				ok: false,
				content: result.error,
				durationMs,
			});

			return result;
		}
	}
}
