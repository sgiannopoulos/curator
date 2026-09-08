import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { CuratorError, type AgentExecution } from "@curator/shared";
import type { RepositoryAccess } from "./repository-access.js";
import type { ResultApplication } from "./result-application.js";

export const RESULT_OUTBOX_FILE = "outbox/result.json";

/**
 * Explicit handoff of one complete file, never a watcher or a startup replay.
 * The agent replaces this file using write_working_file before each submission.
 * Leaving it in place makes replay/repair possible; startup discards agent-work.
 */
export function resultOutboxTool(execution: AgentExecution, workingDirectory: string,
  results: ResultApplication, repository: RepositoryAccess, signal: AbortSignal,
  changed: (applied: boolean) => void) {
  return tool(async () => {
    signal.throwIfAborted();
    let submitted: string | null = null;
    try {
      submitted = await readFile(join(workingDirectory, RESULT_OUTBOX_FILE), { encoding: "utf8", signal })
        .catch((cause: unknown) => {
          signal.throwIfAborted();
          throw new CuratorError("invalid_result", `Cannot read ${RESULT_OUTBOX_FILE}. Write one JSON result event there first. ${cause instanceof Error ? cause.message : String(cause)}`);
        });
      let input: unknown;
      try { input = JSON.parse(submitted); } catch (cause) {
        throw new CuratorError("invalid_result", `Outbox JSON is invalid: ${cause instanceof Error ? cause.message : String(cause)}`);
      }
      const accepted = await results.accept(execution, input, repository, signal);
      // accept resolves only after COMMIT. Publication never leads persistence.
      changed(accepted.applied);
      return JSON.stringify({ status: "accepted", ...accepted });
    } catch (cause) {
      signal.throwIfAborted();
      if (!(cause instanceof CuratorError) || cause.code !== "invalid_result") throw cause;
      results.reject(execution, cause.message, submitted);
      changed(false);
      return JSON.stringify({ status: "rejected", error: cause.message,
        repair: "Correct outbox/result.json and submit again. A rejected identity may be reused; a committed identity always returns its original outcome." });
    }
  }, {
    name: "submit_result",
    description: `Validate and accept the single JSON event in ${RESULT_OUTBOX_FILE}, written with write_working_file. Use only for catalog curation explicitly requested by the user, including creation, wording/behavior edits, source review and status changes, or permanent deletion. Accepted changes commit immediately; indeterminate review retains the unchanged flow and explanation. Rejected events can be repaired in this conversation.`,
    schema: z.object({}).strict(),
  });
}
