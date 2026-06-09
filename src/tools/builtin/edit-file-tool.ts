import { readFile, stat, writeFile } from "node:fs/promises";
import { checkFileWriteAccess } from "../policies/file-access-policy";
import type { Tool } from "../tool";

type EditFileParameters = {
	path: string;
	oldText: string;
	newText: string;
	replaceAll: boolean;
};

function parseEditFileParameters(
	parameters: unknown,
): EditFileParameters | null {
	if (
		typeof parameters !== "object" ||
		parameters === null ||
		!("path" in parameters) ||
		typeof parameters.path !== "string" ||
		!("oldText" in parameters) ||
		typeof parameters.oldText !== "string" ||
		!("newText" in parameters) ||
		typeof parameters.newText !== "string"
	) {
		return null;
	}

	if (
		"replaceAll" in parameters &&
		parameters.replaceAll !== undefined &&
		typeof parameters.replaceAll !== "boolean"
	) {
		return null;
	}

	return {
		path: parameters.path,
		oldText: parameters.oldText,
		newText: parameters.newText,
		replaceAll:
			"replaceAll" in parameters && typeof parameters.replaceAll === "boolean"
				? parameters.replaceAll
				: false,
	};
}

function countOccurrences(content: string, search: string): number {
	if (search.length === 0) {
		return 0;
	}

	let count = 0;
	let index = content.indexOf(search);

	while (index !== -1) {
		count++;
		index = content.indexOf(search, index + search.length);
	}

	return count;
}

export const editFileTool: Tool = {
	name: "editFile",
	description:
		"Edit a file by replacing current file text. oldText should be copied exactly from the current file content.",
	parameters: {
		type: "object",
		properties: {
			path: {
				type: "string",
				description: "Path to the file to edit.",
			},
			oldText: {
				type: "string",
				description:
					"Exact text to replace. Use text copied from the current file content.",
			},
			newText: {
				type: "string",
				description:
					"Replacement text. Use an empty string to delete the matched text.",
			},
			replaceAll: {
				type: "boolean",
				description:
					"Replace every occurrence. Defaults to false, which requires exactly one match.",
				default: false,
			},
		},
		required: ["path", "oldText", "newText"],
		additionalProperties: false,
	},
	execute: async (parameters) => {
		const parsed = parseEditFileParameters(parameters);

		if (parsed === null) {
			return {
				ok: false,
				error: "Invalid parameters: path, oldText, and newText are required",
			};
		}

		if (parsed.oldText.length === 0) {
			return {
				ok: false,
				error: "Invalid parameters: oldText must not be empty",
			};
		}

		const decision = checkFileWriteAccess(parsed.path);

		if (!decision.allowed) {
			return {
				ok: false,
				error: decision.reason,
			};
		}

		const filePath = decision.path;

		try {
			const fileStat = await stat(filePath);

			if (fileStat.isDirectory()) {
				return {
					ok: false,
					error: `Path is a directory: ${filePath}`,
				};
			}
		} catch {
			return {
				ok: false,
				error: `File not found: ${filePath}`,
			};
		}

		let content: string;

		try {
			content = await readFile(filePath, "utf8");
		} catch (error) {
			return {
				ok: false,
				error: `Could not read file: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}

		const occurrenceCount = countOccurrences(content, parsed.oldText);

		if (occurrenceCount === 0) {
			return {
				ok: false,
				error:
					"oldText not found. Read or inspect the current file content again before retrying.",
			};
		}

		if (!parsed.replaceAll && occurrenceCount > 1) {
			return {
				ok: false,
				error:
					"oldText matched multiple times. Provide a more specific oldText or set replaceAll to true.",
			};
		}

		const updatedContent = parsed.replaceAll
			? content.split(parsed.oldText).join(parsed.newText)
			: content.replace(parsed.oldText, parsed.newText);

		try {
			await writeFile(filePath, updatedContent, "utf8");
		} catch (error) {
			return {
				ok: false,
				error: `Could not edit file: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}

		return {
			ok: true,
			content: JSON.stringify({
				path: filePath,
				replacements: parsed.replaceAll ? occurrenceCount : 1,
			}),
		};
	},
};
