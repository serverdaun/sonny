export type ChatCommandOptions = {
	resume?: string;
	continue?: boolean;
};

export type ChatSessionSelection = {
	resumeSessionId?: string;
	continueLatest?: boolean;
};

export function resolveChatSessionSelection(
	options: ChatCommandOptions,
): ChatSessionSelection {
	const continueLatest = options.continue === true;

	if (options.resume && continueLatest) {
		throw new Error("Use either --resume or --continue, not both.");
	}

	return {
		resumeSessionId: options.resume,
		continueLatest,
	};
}
