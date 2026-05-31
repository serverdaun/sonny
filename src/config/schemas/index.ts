import { join } from "node:path";
import { z } from "zod";

import { LLMConfigSchema } from "./llm.schema";

export const ConfigSchema = z.object({
	workspace: z.string().default(join(process.cwd(), "workspace")),
	llm: LLMConfigSchema,
	defaultAgent: z.string(),
	agentsPath: z.string().default("agents"),
});

export type Config = z.infer<typeof ConfigSchema>;

export * from "./llm.schema";
