import { z } from "zod";

export const AgentFrontmatterSchema = z.object({
	name: z.string().min(1),
	description: z.string().default(""),
});

export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;

export type AgentDefinition = {
	id: string;
	name: string;
	description: string;
	instructions: string;
};
