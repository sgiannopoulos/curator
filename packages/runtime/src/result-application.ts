import type { DatabaseSync } from "node:sqlite";
import {
  CuratorError, acceptedResultSchema, resultEventSchema,
  type AgentExecution, type ResultOutcome,
} from "@curator/shared";
import type { CatalogApplication } from "./catalog-application.js";
import type { ChatApplication } from "./chat-application.js";
import type { RepositoryAccess } from "./repository-access.js";
import { readText } from "./storage/rows.js";
import { inTransaction } from "./storage/transaction.js";

/** Result identities and history share the catalog and lifecycle authority. */
export class ResultApplication {
  constructor(private readonly database: DatabaseSync,
    private readonly catalog: CatalogApplication, private readonly chat: ChatApplication) {}

  /** Kept outside summaries alongside the current catalog, never inferred from chat. */
  accepted(execution: AgentExecution): ResultOutcome[] {
    this.chat.execution(execution.workspaceId, execution.id);
    return this.database.prepare("SELECT data FROM accepted_results WHERE execution_id = ? ORDER BY rowid")
      .all(execution.id).map((row) => acceptedResultSchema.parse(JSON.parse(readText(row, "data"))).outcome);
  }

  async accept(execution: AgentExecution, input: unknown, repository: RepositoryAccess,
    signal: AbortSignal): Promise<{ outcome: ResultOutcome; applied: boolean }> {
    signal.throwIfAborted();
    this.#requireActive(execution);
    const parsed = resultEventSchema.safeParse(input);
    if (!parsed.success) {
      throw new CuratorError("invalid_result", parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "event"}: ${issue.message}`).join("\n"));
    }
    const event = parsed.data;
    if (event.executionId !== execution.id || event.workspaceId !== execution.workspaceId) {
      throw new CuratorError("invalid_result", "executionId and workspaceId must match this active Agent Execution.");
    }
    // A committed identity returns its original outcome, even if source changed.
    const previous = this.#outcome(execution.id, event.eventId);
    if (previous) return { outcome: previous, applied: false };
    const evidence = await repository.inspectCitations(event.citations, signal);
    return inTransaction(this.database, () => {
      signal.throwIfAborted();
      this.#requireActive(execution);
      const replay = this.#outcome(execution.id, event.eventId);
      if (replay) return { outcome: replay, applied: false };
      const flow = this.catalog.createFromEvidence(execution.workspaceId,
        { title: event.title, description: event.description }, evidence);
      const outcome: ResultOutcome = {
        executionId: execution.id, eventId: event.eventId, kind: event.kind,
        flowId: flow.id, acceptedAt: flow.createdAt,
      };
      const result = { event, outcome, flow };
      this.database.prepare("INSERT INTO accepted_results (execution_id, event_id, data) VALUES (?, ?, ?)")
        .run(execution.id, event.eventId, JSON.stringify(result));
      this.chat.append(execution, "result", `Created User Flow: ${flow.title}`, { result });
      return { outcome, applied: true };
    });
  }

  reject(execution: AgentExecution, message: string, submitted: string | null): void {
    inTransaction(this.database, () => {
      this.#requireActive(execution);
      this.chat.append(execution, "validation", [
        `Result rejected: ${message}`,
        "No result identity was reserved. Correct the event and submit it again during this attempt.",
        ...(submitted === null ? [] : [`Submitted outbox content:\n${submitted}`]),
      ].join("\n\n"));
    });
  }

  #requireActive(execution: AgentExecution): void {
    const current = this.chat.execution(execution.workspaceId, execution.id);
    if (current.status !== "running" || current.cancellationRequestedAt !== null) {
      throw new CuratorError("invalid_result", "This Agent Execution has stopped accepting results. Start a new request to continue.");
    }
    if (current.kind !== "ordinary-chat") {
      throw new CuratorError("invalid_result", "create-flow is not allowed in this execution phase.");
    }
  }

  #outcome(executionId: string, eventId: string): ResultOutcome | null {
    const row = this.database.prepare("SELECT data FROM accepted_results WHERE execution_id = ? AND event_id = ?")
      .get(executionId, eventId);
    return row ? acceptedResultSchema.parse(JSON.parse(readText(row, "data"))).outcome : null;
  }
}
