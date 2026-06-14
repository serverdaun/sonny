import {
	checkFileReadAccess,
	checkFileWriteAccess,
	type FileAccessDecision,
} from "../policies/file-access-policy";
import type { PreToolDecision, PreToolHook } from "./tool-hooks";

const readTools = new Set(["readFile"]);
const writeTools = new Set(["writeFile", "editFile"]);

function getPath(parameters: unknown): string | null {
	if (
		typeof parameters !== "object" ||
		parameters === null ||
		!("path" in parameters)
	) {
		return null;
	}

	const path = (parameters as Record<string, unknown>).path;

	return typeof path === "string" ? path : null;
}

function withResolvedPath(parameters: unknown, path: string): unknown {
	if (typeof parameters !== "object" || parameters === null) {
		return parameters;
	}

	return {
		...parameters,
		path,
	};
}

function decisionToPreToolDecision(
	parameters: unknown,
	decision: FileAccessDecision,
): PreToolDecision {
	if (!decision.allowed) {
		return {
			action: "deny",
			reason: decision.reason,
		};
	}

	return {
		action: "updateInput",
		parameters: withResolvedPath(parameters, decision.path),
		reason: "Resolved file path",
	};
}

export const filePolicyPreToolHook: PreToolHook = (context) => {
	const path = getPath(context.parameters);

	if (path === null) {
		return { action: "allow" };
	}

	if (readTools.has(context.toolName)) {
		return decisionToPreToolDecision(
			context.parameters,
			checkFileReadAccess(path),
		);
	}

	if (writeTools.has(context.toolName)) {
		return decisionToPreToolDecision(
			context.parameters,
			checkFileWriteAccess(path),
		);
	}

	return { action: "allow" };
};
