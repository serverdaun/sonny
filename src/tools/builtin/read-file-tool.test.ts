import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileTool } from "./read-file-tool";

async function createTempDir(): Promise<string> {
	return mkdtemp(join(tmpdir(), "sonny-read-file-tool-"));
}

describe("readFileTool", () => {
	test("reads a normal file", async () => {
		const dir = await createTempDir();
		const path = join(dir, "notes.txt");

		await writeFile(path, "hello from sonny");

		const result = await readFileTool.execute({ path });

		expect(result).toEqual({
			ok: true,
			content: "hello from sonny",
		});
	});

	test("returns error for missing file", async () => {
		const dir = await createTempDir();
		const path = join(dir, "missing.txt");

		const result = await readFileTool.execute({ path });

		expect(result).toEqual({
			ok: false,
			error: `File not found: ${path}`,
		});
	});

	test("returns error for directory", async () => {
		const dir = await createTempDir();
		const path = join(dir, "folder");

		await mkdir(path);

		const result = await readFileTool.execute({ path });

		expect(result).toEqual({
			ok: false,
			error: `Path is a directory: ${path}`,
		});
	});

	test("returns error for invalid parameters", async () => {
		const result = await readFileTool.execute({});

		expect(result).toEqual({
			ok: false,
			error: "Invalid parameters: path is required",
		});
	});
});
