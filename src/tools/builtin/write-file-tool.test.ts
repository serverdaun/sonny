import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileTool } from "./write-file-tool";

async function createTempDir(): Promise<string> {
	return mkdtemp(join(tmpdir(), "sonny-write-file-tool-"));
}

describe("writeFileTool", () => {
	test("creates a new file", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		const result = await writeFileTool.execute({
			path,
			content: "hello from writeFile",
		});

		expect(result.ok).toBe(true);
		expect(await readFile(path, "utf8")).toBe("hello from writeFile");

		if (result.ok) {
			expect(JSON.parse(result.content)).toEqual({
				path,
				bytesWritten: 20,
			});
		}
	});

	test("overwrites an existing file", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		await writeFile(path, "old");

		const result = await writeFileTool.execute({
			path,
			content: "new",
		});

		expect(result.ok).toBe(true);
		expect(await readFile(path, "utf8")).toBe("new");
	});

	test("creates parent directories", async () => {
		const dir = await createTempDir();
		const path = join(dir, "nested", "notes.txt");

		const result = await writeFileTool.execute({
			path,
			content: "nested content",
		});

		expect(result.ok).toBe(true);
		expect(await readFile(path, "utf8")).toBe("nested content");
	});

	test("returns error for invalid parameters", async () => {
		const result = await writeFileTool.execute({});

		expect(result).toEqual({
			ok: false,
			error: "Invalid parameters: path and content are required",
		});
	});

	test("returns error for directory target", async () => {
		const dir = await createTempDir();
		const path = join(dir, "folder");

		await mkdir(path);

		const result = await writeFileTool.execute({
			path,
			content: "content",
		});

		expect(result).toEqual({
			ok: false,
			error: `Path is a directory: ${path}`,
		});
	});
});
