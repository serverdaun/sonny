import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { ChatCompletion } from "openai/resources/chat/completions";
import type { LLMConfig } from "../config";
import type { ChatMessage } from "../core/message";
import {
	type ChatCompletionClient,
	type ChatCompletionCreateParams,
	LLMProvider,
	LLMProviderError,
} from "./llm-provider";

const config: LLMConfig = {
	provider: "openai",
	model: "gpt-test",
	apiKey: "test-key",
	apiBase: null,
	temperature: 0.7,
	maxTokens: 2048,
};

const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

function createFakeClient(
	create: (params: ChatCompletionCreateParams) => PromiseLike<ChatCompletion>,
): ChatCompletionClient {
	return {
		chat: {
			completions: {
				create,
			},
		},
	};
}

function createCompletion(content: string | null): ChatCompletion {
	return {
		id: "chatcmpl-test",
		object: "chat.completion",
		created: 0,
		model: "gpt-test",
		choices: [
			{
				index: 0,
				finish_reason: "stop",
				logprobs: null,
				message: {
					role: "assistant",
					content,
					refusal: null,
				},
			},
		],
	};
}

function createMockCreate(content: string | null) {
	return mock(
		async (_params: ChatCompletionCreateParams): Promise<ChatCompletion> =>
			createCompletion(content),
	);
}

describe("LLMProvider", () => {
	let create: ReturnType<typeof createMockCreate>;
	let provider: LLMProvider;

	beforeEach(() => {
		create = createMockCreate("Hello from the model");
		provider = new LLMProvider(config, createFakeClient(create));
	});

	test("returns assistant content", async () => {
		const response = await provider.chat(messages);

		expect(response).toBe("Hello from the model");
	});

	test("sends configured request parameters", async () => {
		await provider.chat(messages, { temperature: 0.2 });

		expect(create).toHaveBeenCalledTimes(1);
		expect(create.mock.calls[0]?.[0]).toEqual({
			model: "gpt-test",
			messages,
			temperature: 0.2,
			max_completion_tokens: 2048,
		});
	});

	test("throws LLMProviderError when response content is missing", async () => {
		create = createMockCreate(null);
		provider = new LLMProvider(config, createFakeClient(create));

		await expect(provider.chat(messages)).rejects.toThrow(LLMProviderError);
		await expect(provider.chat(messages)).rejects.toThrow(
			"LLM response did not include assistant content",
		);
	});

	test("wraps client errors as LLMProviderError", async () => {
		const cause = new Error("network failed");
		const create = mock(
			async (_params: ChatCompletionCreateParams): Promise<ChatCompletion> => {
				throw cause;
			},
		);
		const provider = new LLMProvider(config, createFakeClient(create));

		try {
			await provider.chat(messages);
			throw new Error("Expected provider.chat to throw");
		} catch (error) {
			expect(error).toBeInstanceOf(LLMProviderError);
			expect((error as Error).message).toBe("LLM request failed");
			expect((error as Error).cause).toBe(cause);
		}
	});
});
