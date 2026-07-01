import type { SlashCommand } from "../command";

export function createHelpCommand(
	getCommands: () => SlashCommand[],
): SlashCommand {
	return {
		name: "help",
		description: "Show available commands.",
		aliases: ["h"],
		usage: "/help",
		execute() {
			const commands = getCommands();

			return {
				type: "message",
				content: commands
					.map((command) => {
						const aliases =
							command.aliases && command.aliases.length > 0
								? ` (${command.aliases.map((alias) => `/${alias}`).join(", ")})`
								: "";

						return `${command.usage ?? `/${command.name}`}${aliases} - ${command.description}`;
					})
					.join("\n"),
			};
		},
	};
}
