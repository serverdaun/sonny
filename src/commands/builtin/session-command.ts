import type { SlashCommand } from "../command";

export function createSessionCommand(): SlashCommand {
	return {
		name: "session",
		description: "Show current session information.",
		usage: "/session",
		execute(_args, context) {
			const { historySession } = context;

			return {
				type: "message",
				content: [
					`Session: ${historySession.id}`,
					`Title: ${historySession.title ?? "Untitled"}`,
					`Messages: ${context.getMessageCount()}`,
				].join("\n"),
			};
		},
	};
}
