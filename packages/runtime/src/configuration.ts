import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

export interface OpenRouterConfiguration {
  apiKey: string;
  model: string;
}

/** Read once, from the explicit checkout root. Never consult process.env. */
export function loadConfiguration(applicationRoot: string): {
  configuration: OpenRouterConfiguration | null;
  problem: string | null;
} {
  const path = join(applicationRoot, ".env");
  try {
    const values = parseEnv(readFileSync(path, "utf8"));
    const apiKey = values.OPENROUTER_API_KEY?.trim();
    const model = values.OPENROUTER_MODEL?.trim();
    if (apiKey && model) return { configuration: { apiKey, model }, problem: null };
  } catch {
    // Configuration errors must not echo file contents or credentials.
  }
  return {
    configuration: null,
    problem: `Set OPENROUTER_API_KEY and OPENROUTER_MODEL in ${path}, then restart Curator.`,
  };
}
