import type { ToolEvent } from "../tools/tool-executor";

const maxPreviewLength = 500;

function getStringParameter(parameters: unknown, key: string): string | null {
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

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength)}...`;
}

function collapseWhitespace(text: string): string {
	return text.split(/\s+/).filter(Boolean).join(" ");
}

export function formatDuration(durationMs: number): string {
	if (durationMs < 1000) {
		return `${durationMs}ms`;
	}

	return `${(durationMs / 1000).toFixed(1)}s`;
}

export function formatToolPreview(
	toolName: string,
	parameters: unknown,
): string {
	const parameterKey = toolName === "bash" ? "command" : "path";
	const value = getStringParameter(parameters, parameterKey);

	if (value === null || value.length === 0) {
		return toolName;
	}

	return truncate(collapseWhitespace(value), 80);
}

export function formatToolResultPreview(
	toolName: string,
	content: string,
	ok: boolean,
): string | null {
	if (!ok && content.startsWith("BLOCKED:")) {
		return "[denied]";
	}

	if (toolName === "readFile") {
		return ok ? null : "[error]";
	}

	if (toolName === "bash") {
		try {
			const parsed = JSON.parse(content) as {
				exitCode?: number;
				stdout?: string;
				stderr?: string;
			};
			const output = collapseWhitespace(
				[parsed.stdout, parsed.stderr].filter(Boolean).join(" "),
			);
			const suffix =
				parsed.exitCode !== undefined && parsed.exitCode !== 0
					? `[exit ${parsed.exitCode}]`
					: null;

			if (output.length === 0) {
				return suffix;
			}

			return [truncate(output, maxPreviewLength), suffix]
				.filter(Boolean)
				.join(" ");
		} catch {
			return ok ? null : "[error]";
		}
	}

	if (toolName === "writeFile" || toolName === "editFile") {
		try {
			return truncate(
				collapseWhitespace(JSON.stringify(JSON.parse(content))),
				160,
			);
		} catch {
			return truncate(collapseWhitespace(content), 160);
		}
	}

	if (!ok) {
		return "[error]";
	}

	const preview = collapseWhitespace(content);
	return preview.length === 0 ? null : truncate(preview, maxPreviewLength);
}

export function formatCompletedToolMessage(
	event: Extract<ToolEvent, { type: "tool.completed" }>,
): string {
	const preview = formatToolPreview(event.toolName, event.parameters);
	const resultPreview = formatToolResultPreview(
		event.toolName,
		event.content,
		event.ok,
	);

	return [
		event.toolName,
		preview,
		formatDuration(event.durationMs),
		resultPreview,
	]
		.filter(Boolean)
		.join("  ");
}
