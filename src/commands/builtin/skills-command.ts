import type { SlashCommand } from "../command";

export function createSkillsCommand(): SlashCommand {
	return {
		name: "skills",
		description: "List loaded skills.",
		usage: "/skills [query]",
		execute(args, context) {
			const query = args.trim().toLowerCase();
			const skills =
				query.length > 0
					? context.skills.filter((skill) =>
							`${skill.name} ${skill.description}`
								.toLowerCase()
								.includes(query),
						)
					: context.skills;

			if (skills.length === 0) {
				return {
					type: "message",
					content:
						query.length > 0
							? `No skills matched: ${query}`
							: "No skills are loaded.",
				};
			}

			return {
				type: "message",
				content: skills
					.map((skill) => `${skill.name} - ${skill.description}`)
					.join("\n"),
			};
		},
	};
}
