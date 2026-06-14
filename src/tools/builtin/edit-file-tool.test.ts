import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editFileTool } from "./edit-file-tool";

async function createTempDir(): Promise<string> {
	return mkdtemp(join(tmpdir(), "sonny-edit-file-tool-"));
}

describe("editFileTool", () => {
	test("replaces one exact match", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		await writeFile(path, "hello old world", "utf8");

		const result = await editFileTool.execute({
			path,
			oldText: "old",
			newText: "new",
		});

		expect(result.ok).toBe(true);
		expect(await readFile(path, "utf8")).toBe("hello new world");

		if (result.ok) {
			expect(JSON.parse(result.content)).toEqual({
				path,
				replacements: 1,
			});
		}
	});

	test("rejects zero matches", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		await writeFile(path, "hello world", "utf8");

		const result = await editFileTool.execute({
			path,
			oldText: "missing",
			newText: "new",
		});

		expect(result).toEqual({
			ok: false,
			error:
				"oldText not found. Read or inspect the current file content again before retrying.",
		});
	});

	test("rejects multiple matches by default", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		await writeFile(path, "old old", "utf8");

		const result = await editFileTool.execute({
			path,
			oldText: "old",
			newText: "new",
		});

		expect(result).toEqual({
			ok: false,
			error:
				"oldText matched multiple times. Provide a more specific oldText or set replaceAll to true.",
		});
	});

	test("replaces multiple matches when replaceAll is true", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		await writeFile(path, "old old", "utf8");

		const result = await editFileTool.execute({
			path,
			oldText: "old",
			newText: "new",
			replaceAll: true,
		});

		expect(result.ok).toBe(true);
		expect(await readFile(path, "utf8")).toBe("new new");

		if (result.ok) {
			expect(JSON.parse(result.content).replacements).toBe(2);
		}
	});

	test("supports deletion with empty newText", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		await writeFile(path, "hello delete world", "utf8");

		const result = await editFileTool.execute({
			path,
			oldText: "delete ",
			newText: "",
		});

		expect(result.ok).toBe(true);
		expect(await readFile(path, "utf8")).toBe("hello world");
	});

	test("returns error for missing file", async () => {
		const dir = await createTempDir();
		const path = join(dir, "missing.txt");

		const result = await editFileTool.execute({
			path,
			oldText: "old",
			newText: "new",
		});

		expect(result).toEqual({
			ok: false,
			error: `File not found: ${path}`,
		});
	});

	test("returns error for invalid parameters", async () => {
		const result = await editFileTool.execute({});

		expect(result).toEqual({
			ok: false,
			error: "Invalid parameters: path, oldText, and newText are required",
		});
	});
});
