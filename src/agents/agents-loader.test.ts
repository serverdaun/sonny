import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAgentDefinition } from "./agents-loader";

describe("loadAgentDefinition", () => {
	test("loads an agent definition from AGENT.md", async () => {
		const root = await mkdtemp(join(tmpdir(), "sonny-agent"));
		const agentsPath = join(root, "agents");
		const agentPath = join(agentsPath, "sonny");

		await mkdir(agentPath, { recursive: true });
		await writeFile(
			join(agentPath, "AGENT.md"),
			`---
name: Sonny
description: Test assistant
---
You are sonny.
`,
		);

		const agent = await loadAgentDefinition(agentsPath, "sonny");

		expect(agent).toEqual({
			id: "sonny",
			name: "Sonny",
			description: "Test assistant",
			instructions: "You are sonny.",
		});
	});
});
