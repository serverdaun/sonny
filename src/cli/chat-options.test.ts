import { describe, expect, test } from "bun:test";
import { resolveChatSessionSelection } from "./chat-options";

describe("resolveChatSessionSelection", () => {
	test("passes resume session id", () => {
		expect(resolveChatSessionSelection({ resume: "session-1" })).toEqual({
			resumeSessionId: "session-1",
			continueLatest: false,
		});
	});

	test("passes continue latest flag", () => {
		expect(resolveChatSessionSelection({ continue: true })).toEqual({
			resumeSessionId: undefined,
			continueLatest: true,
		});
	});

	test("rejects resume and continue together", () => {
		expect(() =>
			resolveChatSessionSelection({
				resume: "session-1",
				continue: true,
			}),
		).toThrow("Use either --resume or --continue, not both.");
	});
});
