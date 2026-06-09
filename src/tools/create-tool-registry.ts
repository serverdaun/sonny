import { bashTool } from "./builtin/bash-tool";
import { editFileTool } from "./builtin/edit-file-tool";
import { readFileTool } from "./builtin/read-file-tool";
import { writeFileTool } from "./builtin/write-file-tool";
import { ToolRegistry } from "./tool-registry";

export function createDefaultToolRegistry(): ToolRegistry {
	const registry = new ToolRegistry();

	registry.register(readFileTool);
	registry.register(writeFileTool);
	registry.register(editFileTool);
	registry.register(bashTool);

	return registry;
}
