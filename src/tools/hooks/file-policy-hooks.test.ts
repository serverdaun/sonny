import { describe, expect, test } from "bun:test";
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { filePolicyPreToolHook } from "./file-policy-hooks";

async function createTempDir(): Promise<string> {
	return mkdtemp(join(tmpdir(), "sonny-file-policy-hook-"));
}

describe("filePolicyPreToolHook", () => {
	test("allows non-file tools", async () => {
		const decision = await filePolicyPreToolHook({
			toolCallId: "call_test",
			toolName: "bash",
			description: "Execute command",
			parameters: {
				command: "pwd",
			},
		});

		expect(decision).toEqual({ action: "allow" });
	});

	test("allows file tools without path so tool validation can report params", async () => {
		const decision = await filePolicyPreToolHook({
			toolCallId: "call_test",
			toolName: "readFile",
			description: "Read file",
			parameters: {},
		});

		expect(decision).toEqual({ action: "allow" });
	});

	test("resolves readFile path", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		await writeFile(path, "hello", "utf8");

		const decision = await filePolicyPreToolHook({
			toolCallId: "call_test",
			toolName: "readFile",
			description: "Read file",
			parameters: {
				path,
			},
		});

		expect(decision).toEqual({
			action: "updateInput",
			parameters: {
				path: await realpath(path),
			},
			reason: "Resolved file path",
		});
	});

	test("resolves writeFile path while preserving other parameters", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		const decision = await filePolicyPreToolHook({
			toolCallId: "call_test",
			toolName: "writeFile",
			description: "Write file",
			parameters: {
				path,
				content: "hello",
			},
		});

		expect(decision).toEqual({
			action: "updateInput",
			parameters: {
				path,
				content: "hello",
			},
			reason: "Resolved file path",
		});
	});

	test("denies readFile blocked paths", async () => {
		const decision = await filePolicyPreToolHook({
			toolCallId: "call_test",
			toolName: "readFile",
			description: "Read file",
			parameters: {
				path: ".env",
			},
		});

		expect(decision).toEqual({
			action: "deny",
			reason: "Access denied: refusing to read environment files",
		});
	});

	test("denies writeFile blocked paths", async () => {
		const decision = await filePolicyPreToolHook({
			toolCallId: "call_test",
			toolName: "writeFile",
			description: "Write file",
			parameters: {
				path: ".env",
				content: "SECRET=value",
			},
		});

		expect(decision).toEqual({
			action: "deny",
			reason: "Access denied: refusing to write environment files",
		});
	});

	test("denies editFile blocked paths", async () => {
		const decision = await filePolicyPreToolHook({
			toolCallId: "call_test",
			toolName: "editFile",
			description: "Edit file",
			parameters: {
				path: ".env",
				oldText: "old",
				newText: "new",
			},
		});

		expect(decision).toEqual({
			action: "deny",
			reason: "Access denied: refusing to write environment files",
		});
	});
});
