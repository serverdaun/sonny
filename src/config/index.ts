import { join } from "node:path";
import { loadConfig } from "./load-config";

export { loadConfig } from "./load-config";
export type { Config, LLMConfig } from "./schemas";

const CONFIG_PATH = join(import.meta.dirname, "config.yaml");

export const config = await loadConfig(CONFIG_PATH);
