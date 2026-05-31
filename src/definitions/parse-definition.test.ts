import { describe, expect, test } from "bun:test";
import { DefinitionParseError, parseDefinition } from "./parse-definition";

describe("parseDefinition", () => {
	test("parses markdown definition frontmatter and body", () => {
		const definition = parseDefinition(`---
name: Test Name
description: Test Description
---
Body
`);

		expect(definition.frontmatter).toEqual({
			name: "Test Name",
			description: "Test Description",
		});
		expect(definition.body).toBe("Body");
	});

	test("throws DefinitionParseError for invalid frontmatter", () => {
		expect(() =>
			parseDefinition(`---
name: [broken
---
Body
`),
		).toThrow(DefinitionParseError);
	});
});
