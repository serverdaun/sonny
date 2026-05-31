import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseConfig } from "./parse-config";

describe("parseConfig", () => {
	test("loads valid config", () => {
		const config = parseConfig(
			{
				llm: {
					provider: "openai",
					model: "gpt-4.1",
					apiBase: null,
					temperature: 0.7,
					maxTokens: 2048,
				},
				defaultAgent: "sonny",
				agentsPath: "agents",
			},
			{ llmApiKey: "test-key" },
		);

		expect(config.llm.apiKey).toBe("test-key");
		expect(config.defaultAgent).toBe("sonny");
		expect(config.llm.provider).toBe("openai");
		expect(config.workspace).toBe(join(process.cwd(), "workspace"));
	});
});
