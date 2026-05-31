import { z } from "zod";

export const LLMConfigSchema = z.object({
	provider: z.string().min(1),
	model: z.string().min(1),
	apiKey: z.string().min(1),
	apiBase: z.string().url().nullable().default(null),
	temperature: z.number().min(0).max(2).default(0.7),
	maxTokens: z.number().int().positive().default(2048),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;
