import type { DatabaseSync } from "node:sqlite";
import { CuratorError } from "@curator/shared";

// A deletion reserves only its Workspace while filesystem cleanup yields.
// The runtime owns this transient state; a restart retains the database rows
// and discards attempt working data under the normal interruption contract.
const deletingWorkspaces = new WeakMap<DatabaseSync, Set<string>>();

/** Call inside the same short transaction as every manual mutation/start. */
export function requireIdle(database: DatabaseSync, workspaceId: string): void {
  if (deletingWorkspaces.get(database)?.has(workspaceId)) {
    throw new CuratorError("workspace_busy", "This Workspace is being deleted. Wait for deletion to finish before making changes.");
  }
  if (database.prepare(
    "SELECT id FROM agent_executions WHERE workspace_id = ? AND status = 'running'",
  ).get(workspaceId)) {
    throw new CuratorError("workspace_busy", "This Workspace has an active Agent Execution. Stop it or wait before making changes.");
  }
}

/** Acquire inside a transaction, and always release after cleanup/commit fails or succeeds. */
export function reserveWorkspaceDeletion(database: DatabaseSync, workspaceId: string): () => void {
  requireIdle(database, workspaceId);
  let deleting = deletingWorkspaces.get(database);
  if (!deleting) {
    deleting = new Set<string>();
    deletingWorkspaces.set(database, deleting);
  }
  deleting.add(workspaceId);
  return () => { deleting.delete(workspaceId); };
}
