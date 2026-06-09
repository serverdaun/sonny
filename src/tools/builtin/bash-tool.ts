import { stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { Tool } from "../tool";

const defaultTimeoutMs = 30_000;
const maxTimeoutMs = 300_000;
const maxOutputChars = 20_000;

type BashParameters = {
	command: string;
	cwd?: string;
	timeoutMs: number;
};

function parseBashParameters(parameters: unknown): BashParameters | null {
	if (
		typeof parameters !== "object" ||
		parameters === null ||
		!("command" in parameters) ||
		typeof parameters.command !== "string"
	) {
		return null;
	}

	if (
		"cwd" in parameters &&
		parameters.cwd !== undefined &&
		typeof parameters.cwd !== "string"
	) {
		return null;
	}

	if (
		"timeoutMs" in parameters &&
		parameters.timeoutMs !== undefined &&
		!(
			typeof parameters.timeoutMs === "number" &&
			Number.isInteger(parameters.timeoutMs)
		)
	) {
		return null;
	}

	const timeoutMs =
		"timeoutMs" in parameters && typeof parameters.timeoutMs === "number"
			? parameters.timeoutMs
			: defaultTimeoutMs;

	return {
		command: parameters.command,
		cwd:
			"cwd" in parameters && typeof parameters.cwd === "string"
				? parameters.cwd
				: undefined,
		timeoutMs,
	};
}

function truncateOutput(output: string): {
	content: string;
	truncated: boolean;
} {
	if (output.length <= maxOutputChars) {
		return {
			content: output,
			truncated: false,
		};
	}

	return {
		content: `${output.slice(0, maxOutputChars)}\n[truncated after ${maxOutputChars} characters]`,
		truncated: true,
	};
}

async function readProcessStream(
	stream: ReadableStream<Uint8Array> | number | undefined | null,
): Promise<string> {
	if (stream === undefined || stream === null || typeof stream === "number") {
		return "";
	}

	return await new Response(stream).text();
}

async function resolveCwd(
	cwd: string | undefined,
): Promise<string | undefined> {
	if (cwd === undefined) {
		return undefined;
	}

	const resolvedCwd = isAbsolute(cwd)
		? resolve(cwd)
		: resolve(process.cwd(), cwd);
	const cwdStat = await stat(resolvedCwd);

	if (!cwdStat.isDirectory()) {
		throw new Error(`cwd is not a directory: ${resolvedCwd}`);
	}

	return resolvedCwd;
}

export const bashTool: Tool = {
	name: "bash",
	description: `Execute a shell command.

Use dedicated file tools for full file reads and file changes:
readFile for full file contents, writeFile for full-file writes, editFile for targeted text replacement.

Shell commands may still be used for narrow inspection, search, listing, counting, git, tests, builds, package managers, and scripts.`,
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "Shell command to execute.",
			},
			cwd: {
				type: "string",
				description:
					"Working directory for the command. Relative paths resolve from the current process directory.",
			},
			timeoutMs: {
				type: "integer",
				description: `Maximum runtime in milliseconds. Default: ${defaultTimeoutMs}. Maximum: ${maxTimeoutMs}.`,
				default: defaultTimeoutMs,
				minimum: 1,
				maximum: maxTimeoutMs,
			},
		},
		required: ["command"],
		additionalProperties: false,
	},
	execute: async (parameters) => {
		const parsed = parseBashParameters(parameters);

		if (parsed === null) {
			return {
				ok: false,
				error: "Invalid parameters: command is required",
			};
		}

		if (parsed.command.trim().length === 0) {
			return {
				ok: false,
				error: "Invalid parameters: command must not be empty",
			};
		}

		if (parsed.timeoutMs < 1 || parsed.timeoutMs > maxTimeoutMs) {
			return {
				ok: false,
				error: `Invalid parameters: timeoutMs must be between 1 and ${maxTimeoutMs}`,
			};
		}

		let cwd: string | undefined;

		try {
			cwd = await resolveCwd(parsed.cwd);
		} catch (error) {
			return {
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}

		try {
			const process = Bun.spawn({
				cmd: ["bash", "-lc", parsed.command],
				cwd,
				stdout: "pipe",
				stderr: "pipe",
				timeout: parsed.timeoutMs,
			});

			const [stdout, stderr, exitCode] = await Promise.all([
				readProcessStream(process.stdout),
				readProcessStream(process.stderr),
				process.exited,
			]);
			const truncatedStdout = truncateOutput(stdout);
			const truncatedStderr = truncateOutput(stderr);
			const timedOut = process.killed && process.signalCode !== null;

			return {
				ok: true,
				content: JSON.stringify({
					exitCode,
					stdout: truncatedStdout.content,
					stderr: truncatedStderr.content,
					timedOut,
					stdoutTruncated: truncatedStdout.truncated,
					stderrTruncated: truncatedStderr.truncated,
				}),
			};
		} catch (error) {
			return {
				ok: false,
				error: `Command execution failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};
