import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Tool } from "../tool";

type WriteFileParameters = {
	path: string;
	content: string;
};

function parseWriteFileParameters(
	parameters: unknown,
): WriteFileParameters | null {
	if (
		typeof parameters !== "object" ||
		parameters === null ||
		!("path" in parameters) ||
		typeof parameters.path !== "string" ||
		!("content" in parameters) ||
		typeof parameters.content !== "string"
	) {
		return null;
	}

	return {
		path: parameters.path,
		content: parameters.content,
	};
}

export const writeFileTool: Tool = {
	name: "writeFile",
	description:
		"Write complete content to a file. Overwrites the entire file. Use editFile for targeted text replacement.",
	parameters: {
		type: "object",
		properties: {
			path: {
				type: "string",
				description:
					"Path to the file to write. Parent directories are created when needed.",
			},
			content: {
				type: "string",
				description: "Complete file content to write.",
			},
		},
		required: ["path", "content"],
		additionalProperties: false,
	},
	execute: async (parameters) => {
		const parsed = parseWriteFileParameters(parameters);

		if (parsed === null) {
			return {
				ok: false,
				error: "Invalid parameters: path and content are required",
			};
		}

		const filePath = parsed.path;

		try {
			const fileStat = await stat(filePath);

			if (fileStat.isDirectory()) {
				return {
					ok: false,
					error: `Path is a directory: ${filePath}`,
				};
			}
		} catch (error) {
			if (
				!(error instanceof Error) ||
				!("code" in error) ||
				error.code !== "ENOENT"
			) {
				return {
					ok: false,
					error: `Could not inspect file: ${
						error instanceof Error ? error.message : String(error)
					}`,
				};
			}
		}

		try {
			await mkdir(dirname(filePath), { recursive: true });
			await writeFile(filePath, parsed.content, "utf8");
		} catch (error) {
			return {
				ok: false,
				error: `Could not write file: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}

		return {
			ok: true,
			content: JSON.stringify({
				path: filePath,
				bytesWritten: new TextEncoder().encode(parsed.content).byteLength,
			}),
		};
	},
};
