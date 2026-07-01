import { createHelpCommand } from "./builtin/help-command";
import { createSessionCommand } from "./builtin/session-command";
import { createSkillsCommand } from "./builtin/skills-command";
import { CommandRegistry } from "./command-registry";

export function createDefaultCommandRegistry(): CommandRegistry {
	const registry = new CommandRegistry();

	registry.register(createHelpCommand(() => registry.list()));
	registry.register(createSkillsCommand());
	registry.register(createSessionCommand());

	return registry;
}
