import { Command } from "commander";
import { config } from "../config";
import { createAgentSession } from "../core/create-agent-session";
import { ChatLoop } from "./chat-loop";

const program = new Command();

program
	.name("Sonny")
	.description("Your personal lightweight assistant")
	.version("0.1.0");

program
	.command("chat")
	.description("Start an interactive chat session")
	.action(async () => {
		const session = await createAgentSession(config);
		const chatLoop = new ChatLoop(session);

		await chatLoop.run();
	});

await program.parseAsync();
