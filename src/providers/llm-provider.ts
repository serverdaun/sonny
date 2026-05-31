import OpenAI from "openai";
import type {
	ChatCompletion,
	ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import type { LLMConfig } from "../config";
import type { ChatMessage } from "../core/message";

type ChatOptions = Partial<
	Pick<
		ChatCompletionCreateParamsNonStreaming,
		"temperature" | "max_completion_tokens" | "reasoning_effort"
	>
>;

export type ChatCompletionCreateParams = ChatCompletionCreateParamsNonStreaming;

export type ChatCompletionClient = {
	chat: {
		completions: {
			create: (
				params: ChatCompletionCreateParams,
			) => PromiseLike<ChatCompletion>;
		};
	};
};

export class LLMProviderError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = "LLMProviderError";
	}
}

export class LLMProvider {
	private readonly client: ChatCompletionClient;
	private readonly config: LLMConfig;

	constructor(config: LLMConfig, client?: ChatCompletionClient) {
		this.config = config;
		this.client =
			client ??
			(new OpenAI({
				apiKey: config.apiKey,
				baseURL: config.apiBase ?? undefined,
			}) as ChatCompletionClient);
	}

	/**
	 * Sends request to OpenAI compatible model
	 * @param messages - list of messages to sent
	 * @param options - options to control request settings
	 * @returns content of the response from the model
	 */
	async chat(
		messages: ChatMessage[],
		options: ChatOptions = {},
	): Promise<string> {
		try {
			const completion = await this.client.chat.completions.create({
				model: this.config.model,
				messages,
				temperature: this.config.temperature,
				max_completion_tokens: this.config.maxTokens,
				...options,
			});

			const content = completion.choices[0]?.message.content;

			if (!content) {
				throw new LLMProviderError(
					"LLM response did not include assistant content",
				);
			}

			return content;
		} catch (error) {
			if (error instanceof LLMProviderError) {
				throw error;
			}

			throw new LLMProviderError("LLM request failed", { cause: error });
		}
	}
}
