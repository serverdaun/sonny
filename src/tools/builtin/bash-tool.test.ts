import { describe, expect, test } from "bun:test";
import { mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bashTool } from "./bash-tool";

async function createTempDir(): Promise<string> {
	return mkdtemp(join(tmpdir(), "sonny-bash-tool-"));
}

function parseResultContent(
	result: Awaited<ReturnType<typeof bashTool.execute>>,
) {
	expect(result.ok).toBe(true);

	if (!result.ok) {
		throw new Error(result.error);
	}

	return JSON.parse(result.content) as {
		exitCode: number;
		stdout: string;
		stderr: string;
		timedOut: boolean;
		stdoutTruncated: boolean;
		stderrTruncated: boolean;
	};
}

describe("bashTool", () => {
	test("captures stdout, stderr, and exit code", async () => {
		const result = await bashTool.execute({
			command: "echo hello; echo problem >&2; exit 7",
		});
		const content = parseResultContent(result);

		expect(content.exitCode).toBe(7);
		expect(content.stdout).toBe("hello\n");
		expect(content.stderr).toBe("problem\n");
		expect(content.timedOut).toBe(false);
	});

	test("uses provided cwd", async () => {
		const dir = await createTempDir();

		const result = await bashTool.execute({
			command: "pwd",
			cwd: dir,
		});
		const content = parseResultContent(result);
		const resolvedDir = await realpath(dir);

		expect(content.exitCode).toBe(0);
		expect(content.stdout.trim()).toBe(resolvedDir);
	});

	test("times out long commands", async () => {
		const result = await bashTool.execute({
			command: "sleep 1",
			timeoutMs: 10,
		});
		const content = parseResultContent(result);

		expect(content.timedOut).toBe(true);
	});

	test("truncates large output", async () => {
		const result = await bashTool.execute({
			command: "printf '%*s' 20050 '' | tr ' ' a",
		});
		const content = parseResultContent(result);

		expect(content.stdoutTruncated).toBe(true);
		expect(content.stdout).toContain("[truncated after 20000 characters]");
	});

	test("rejects invalid parameters", async () => {
		const result = await bashTool.execute({});

		expect(result).toEqual({
			ok: false,
			error: "Invalid parameters: command is required",
		});
	});

	test("rejects excessive timeout", async () => {
		const result = await bashTool.execute({
			command: "echo hello",
			timeoutMs: 300_001,
		});

		expect(result).toEqual({
			ok: false,
			error: "Invalid parameters: timeoutMs must be between 1 and 300000",
		});
	});
});
