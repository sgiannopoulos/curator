import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  CuratorError,
  mutationOriginSchema,
  userFlowStatusSchema,
  type SourceCitation,
  type UserFlow,
  type UserFlowDraft,
} from "@curator/shared";
import { readInteger, readText, type StoredRow } from "./storage/rows.js";
import { inTransaction } from "./storage/transaction.js";
import { requireIdle } from "./storage/execution-state.js";

const FLOW_COLUMNS =
  "id, workspace_id, title, description, status, created_at, updated_at, created_by, updated_by";

const CITATION_COLUMNS = [
  "id",
  "user_flow_id",
  "path",
  "start_line",
  "end_line",
  "explanation",
  "accepted_at",
];

/**
 * Owns the catalog: the current state of a Workspace's User Flows and the
 * Source Citations attached to them.
 *
 * The catalog is current state, not a log. Nothing here records what a flow
 * used to say, and removal takes the flow and its citations out of the store
 * for good — there is no tombstone to restore from and no undo. A later Scan
 * that finds the same behavior again creates a new flow with a new identity.
 */
export class CatalogApplication {
  readonly #database: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.#database = database;
  }

  list(workspaceId: string): UserFlow[] {
    this.#requireWorkspace(workspaceId);
    return this.#read(workspaceId);
  }

  /**
   * Records behavior the user already knows about. A flow written by hand
   * starts Active and carries no Source Citations, because nothing has
   * inspected the Repository on its behalf.
   */
  add(workspaceId: string, draft: UserFlowDraft): UserFlow {
    return inTransaction(this.#database, () => {
      requireIdle(this.#database, workspaceId);
      this.#requireWorkspace(workspaceId);
      const now = new Date().toISOString();
      const flow: UserFlow = {
        id: randomUUID(),
        workspaceId,
        title: draft.title,
        description: draft.description,
        status: "active",
        createdAt: now,
        updatedAt: now,
        createdBy: "manual",
        updatedBy: "manual",
        citations: [],
      };
      this.#database
        .prepare(
          `INSERT INTO user_flows (${FLOW_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          flow.id,
          flow.workspaceId,
          flow.title,
          flow.description,
          flow.status,
          flow.createdAt,
          flow.updatedAt,
          flow.createdBy,
          flow.updatedBy,
        );
      return flow;
    });
  }

  /**
   * Commits an edit to the wording. Identity, status, and citations survive it
   * untouched: improving a description is not a source review, and it is not a
   * judgment that the behavior came back.
   */
  save(workspaceId: string, flowId: string, draft: UserFlowDraft): UserFlow {
    return inTransaction(this.#database, () => {
      requireIdle(this.#database, workspaceId);
      const flow = this.#requireFlow(workspaceId, flowId);
      const now = new Date().toISOString();
      this.#database
        .prepare(
          `UPDATE user_flows
              SET title = ?, description = ?, updated_at = ?, updated_by = ?
            WHERE id = ?`,
        )
        .run(draft.title, draft.description, now, "manual", flowId);
      return {
        ...flow,
        title: draft.title,
        description: draft.description,
        updatedAt: now,
        updatedBy: "manual",
      };
    });
  }

  /** The user's own judgment that an Outdated flow describes current behavior. */
  reactivate(workspaceId: string, flowId: string): UserFlow {
    return inTransaction(this.#database, () => {
      requireIdle(this.#database, workspaceId);
      const flow = this.#requireFlow(workspaceId, flowId);
      const now = new Date().toISOString();
      this.#database
        .prepare(
          "UPDATE user_flows SET status = ?, updated_at = ?, updated_by = ? WHERE id = ?",
        )
        .run("active", now, "manual", flowId);
      return { ...flow, status: "active", updatedAt: now, updatedBy: "manual" };
    });
  }

  /** Permanent. The flow and its citations leave the store together. */
  remove(workspaceId: string, flowId: string): string {
    return inTransaction(this.#database, () => {
      requireIdle(this.#database, workspaceId);
      this.#requireFlow(workspaceId, flowId);
      this.#database.prepare("DELETE FROM user_flows WHERE id = ?").run(flowId);
      return flowId;
    });
  }

  #read(workspaceId: string, flowId?: string): UserFlow[] {
    const rows = flowId
      ? this.#database
          .prepare(`SELECT ${FLOW_COLUMNS} FROM user_flows WHERE workspace_id = ? AND id = ?`)
          .all(workspaceId, flowId)
      : this.#database
          .prepare(
            `SELECT ${FLOW_COLUMNS} FROM user_flows
              WHERE workspace_id = ?
              ORDER BY title COLLATE NOCASE ASC, created_at ASC`,
          )
          .all(workspaceId);

    const citations = this.#readCitations(workspaceId, flowId);
    return rows.map((row) => {
      const flow = toFlow(row);
      return { ...flow, citations: citations.get(flow.id) ?? [] };
    });
  }

  #readCitations(workspaceId: string, flowId?: string): Map<string, SourceCitation[]> {
    const columns = CITATION_COLUMNS.map((column) => `c.${column}`).join(", ");
    const rows = flowId
      ? this.#database
          .prepare(
            `SELECT ${columns}
               FROM source_citations c
               JOIN user_flows f ON f.id = c.user_flow_id
              WHERE f.workspace_id = ? AND f.id = ?
              ORDER BY c.position ASC`,
          )
          .all(workspaceId, flowId)
      : this.#database
          .prepare(
            `SELECT ${columns}
               FROM source_citations c
               JOIN user_flows f ON f.id = c.user_flow_id
              WHERE f.workspace_id = ?
              ORDER BY c.position ASC`,
          )
          .all(workspaceId);

    const byFlow = new Map<string, SourceCitation[]>();
    for (const row of rows) {
      const flowId = readText(row, "user_flow_id");
      const existing = byFlow.get(flowId) ?? [];
      existing.push({
        id: readText(row, "id"),
        path: readText(row, "path"),
        startLine: readInteger(row, "start_line"),
        endLine: readInteger(row, "end_line"),
        explanation: readText(row, "explanation"),
        acceptedAt: readText(row, "accepted_at"),
      });
      byFlow.set(flowId, existing);
    }
    return byFlow;
  }

  #requireWorkspace(workspaceId: string): void {
    const row = this.#database
      .prepare("SELECT id FROM workspaces WHERE id = ?")
      .get(workspaceId);
    if (!row) {
      throw new CuratorError(
        "workspace_not_found",
        "That Workspace is no longer in this Curator data store.",
      );
    }
  }

  #requireFlow(workspaceId: string, flowId: string): UserFlow {
    const [flow] = this.#read(workspaceId, flowId);
    if (!flow) {
      throw new CuratorError(
        "user_flow_not_found",
        "That User Flow is no longer in this Workspace.",
      );
    }
    return flow;
  }
}

function toFlow(row: StoredRow): UserFlow {
  return {
    id: readText(row, "id"),
    workspaceId: readText(row, "workspace_id"),
    title: readText(row, "title"),
    description: readText(row, "description"),
    status: userFlowStatusSchema.parse(readText(row, "status")),
    createdAt: readText(row, "created_at"),
    updatedAt: readText(row, "updated_at"),
    createdBy: mutationOriginSchema.parse(readText(row, "created_by")),
    updatedBy: mutationOriginSchema.parse(readText(row, "updated_by")),
    citations: [],
  };
}
