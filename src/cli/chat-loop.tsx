import { Box, render, Text, useApp, useInput } from "ink";
import { useRef, useState } from "react";
import type { AgentSession } from "../core/agent-session";

type UiMessage = {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
};

type ChatAppProps = {
	session: AgentSession;
};

function ChatApp({ session }: ChatAppProps) {
	const { exit } = useApp();
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<UiMessage[]>([]);
	const [isThinking, setIsThinking] = useState(false);
	const nextMessageId = useRef(0);

	function createMessage(role: UiMessage["role"], content: string): UiMessage {
		nextMessageId.current += 1;

		return {
			id: String(nextMessageId.current),
			role,
			content,
		};
	}

	async function submit(rawInput: string): Promise<void> {
		const text = rawInput.trim();

		if (!text || isThinking) {
			return;
		}

		if (["q", "quit", "exit"].includes(text.toLowerCase())) {
			exit();
			return;
		}

		setInput("");
		setMessages((items) => [...items, createMessage("user", text)]);
		setIsThinking(true);

		try {
			const response = await session.chat(text);
			setMessages((items) => [...items, createMessage("assistant", response)]);
		} catch (error) {
			setMessages((items) => [
				...items,
				createMessage(
					"system",
					error instanceof Error ? error.message : String(error),
				),
			]);
		} finally {
			setIsThinking(false);
		}
	}

	useInput((character, key) => {
		if (key.ctrl && character === "c") {
			exit();
			return;
		}

		if (key.return) {
			void submit(input);
			return;
		}

		if (isThinking) {
			return;
		}

		if (key.backspace) {
			setInput((value) => value.slice(0, -1));
			return;
		}

		if (character) {
			setInput((value) => value + character);
		}
	});

	return (
		<Box flexDirection="column" width="100%" gap={1}>
			<Box width="100%" justifyContent="space-between">
				<Text>
					<Text color="green" bold>
						Sonny
					</Text>{" "}
					<Text dimColor>chat</Text>
				</Text>
				<Text dimColor>q / quit / exit</Text>
			</Box>

			<Box width="100%" borderStyle="single" borderColor="gray" />

			<Box flexDirection="column" width="100%" minHeight={3}>
				{messages.length === 0 ? (
					<Text dimColor>
						Ask a question, describe a task, or paste context below.
					</Text>
				) : (
					messages.map((message) => (
						<Text key={message.id}>
							{message.role === "assistant" ? (
								<Text color="green" bold>
									●{" "}
								</Text>
							) : null}
							{message.role === "system" ? (
								<Text color="red" bold>
									!{" "}
								</Text>
							) : null}
							<Text dimColor={message.role === "user"}>{message.content}</Text>
						</Text>
					))
				)}
			</Box>

			{isThinking ? (
				<Text>
					<Text color="green" bold>
						●
					</Text>{" "}
					<Text dimColor>Thinking...</Text>
				</Text>
			) : null}

			<Box width="100%" borderStyle="round" borderColor="gray" paddingX={1}>
				<Text color="green" bold>
					›{" "}
				</Text>
				<Box flexGrow={1}>
					<Text>
						{input ? input : <Text dimColor>Ask Sonny...</Text>}
						{isThinking ? null : <Text color="green">▌</Text>}
					</Text>
				</Box>
			</Box>
		</Box>
	);
}

export class ChatLoop {
	constructor(private readonly session: AgentSession) {}

	async run(): Promise<void> {
		const app = render(<ChatApp session={this.session} />);
		await app.waitUntilExit();
	}
}
