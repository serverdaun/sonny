import matter from "gray-matter";

export type ParsedDefinition = {
	frontmatter: unknown;
	body: string;
};

export class DefinitionParseError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = "DefinitionParseError";
	}
}

export function parseDefinition(fileContent: string): ParsedDefinition {
	try {
		const { data, content } = matter(fileContent);

		return {
			frontmatter: data,
			body: content.trim(),
		};
	} catch (error) {
		throw new DefinitionParseError("Failed to parse definition frontmatter", {
			cause: error,
		});
	}
}
