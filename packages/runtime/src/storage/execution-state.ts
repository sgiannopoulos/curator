import type { DatabaseSync } from "node:sqlite";
import { CuratorError } from "@curator/shared";

/** Call inside the same short transaction as every manual mutation/start. */
export function requireIdle(database: DatabaseSync, workspaceId: string): void {
  if (database.prepare(
    "SELECT id FROM agent_executions WHERE workspace_id = ? AND status = 'running'",
  ).get(workspaceId)) {
    throw new CuratorError("workspace_busy", "This Workspace has an active Agent Execution. Stop it or wait before making changes.");
  }
}
