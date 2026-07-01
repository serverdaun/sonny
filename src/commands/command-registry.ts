import type {
	SlashCommand,
	SlashCommandContext,
	SlashCommandDispatchResult,
} from "./command";

export class CommandRegistry {
	private readonly commands = new Map<string, SlashCommand>();
	private readonly aliases = new Map<string, string>();

	register(command: SlashCommand): void {
		if (this.commands.has(command.name)) {
			throw new Error(`Command already registered: /${command.name}`);
		}

		if (this.aliases.has(command.name)) {
			throw new Error(`Command name conflicts with alias: /${command.name}`);
		}

		this.commands.set(command.name, command);

		for (const alias of command.aliases ?? []) {
			if (this.commands.has(alias) || this.aliases.has(alias)) {
				throw new Error(`Command alias already registered: /${alias}`);
			}

			this.aliases.set(alias, command.name);
		}
	}

	list(): SlashCommand[] {
		return Array.from(this.commands.values());
	}

	async dispatch(
		input: string,
		context: SlashCommandContext,
	): Promise<SlashCommandDispatchResult> {
		const trimmed = input.trim();

		if (!trimmed.startsWith("/")) {
			return { handled: false };
		}

		const withoutSlash = trimmed.slice(1);
		const [rawName = "", ...argParts] = withoutSlash.split(/\s+/);
		const name = rawName.trim();

		if (name.length === 0) {
			return { handled: false };
		}

		const commandName = this.aliases.get(name) ?? name;
		const command = this.commands.get(commandName);

		if (command === undefined) {
			return {
				handled: true,
				result: {
					type: "message",
					content: `Unknown command: /${name}`,
				},
			};
		}

		const args = argParts.join(" ");

		return {
			handled: true,
			result: await command.execute(args, context),
		};
	}
}
