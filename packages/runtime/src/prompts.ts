import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CuratorError, type ScanningEffort } from "@curator/shared";

type PromptName =
  | "system" | "scan" | "scan-request"
  | "chat-authorization" | "chat-curation" | "chat-execution"
  | "compaction" | "compaction-context"
  | `effort/${ScanningEffort}`
  | "tools/report-scan-progress" | "tools/submit-result-scan" | "tools/submit-result-chat";

const templates = new Map<PromptName, string>();

/**
 * src/ and dist/ share the same sibling prompts/ directory in this checkout.
 * Lazy loading leaves stored data available if a prompt cannot be read. Restart
 * the runtime after editing: each template is cached for this process's lifetime.
 */
export function renderPrompt(name: PromptName, values: Record<string, string | number> = {}): string {
  const file = new URL(`../prompts/${name}.md`, import.meta.url);
  let template = templates.get(name);
  if (template === undefined) {
    try {
      template = readFileSync(file, "utf8").trim();
    } catch {
      throw new CuratorError("agent_unavailable", `Could not read the agent prompt at ${fileURLToPath(file)}. Restore the file and restart Curator.`);
    }
    if (!template) {
      throw new CuratorError("agent_unavailable", `The agent prompt at ${fileURLToPath(file)} is empty. Add its instructions and restart Curator.`);
    }
    templates.set(name, template);
  }
  // One pass with a callback keeps inserted source/state literal, including
  // dollar signs and text that happens to contain another {{placeholder}}.
  return template.replace(/\{\{([^{}]+)\}\}/g, (_match, key: string) => {
    if (!Object.hasOwn(values, key)) {
      throw new CuratorError("agent_unavailable", `Unknown prompt placeholder {{${key}}} in ${fileURLToPath(file)}. Correct the template and restart Curator.`);
    }
    return String(values[key]);
  });
}
