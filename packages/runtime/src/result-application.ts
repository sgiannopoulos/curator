import type { DatabaseSync } from "node:sqlite";
import {
  CuratorError, acceptedResultSchema, resultEventSchema,
  type AgentExecution, type ResultEvent, type ResultOrigin, type ResultOutcome, type UserFlow,
} from "@curator/shared";
import { requireScanResult } from "./scan.js";
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
    const current = this.chat.execution(execution.workspaceId, execution.id);
    if (current.kind === "scan") requireScanResult(current.scan, event);
    if (event.kind !== "create-flow") this.catalog.requireResultTarget(event);
    const evidence = "citations" in event ? await repository.inspectCitations(event.citations, signal) : [];
    return inTransaction(this.database, () => {
      signal.throwIfAborted();
      this.#requireActive(execution);
      const replay = this.#outcome(execution.id, event.eventId);
      if (replay) return { outcome: replay, applied: false };
      // Source was read before this transaction opened, so the identity,
      // lifecycle, and Scan phase this result depends on are checked again
      // inside it against state that cannot move while it commits.
      const settled = this.chat.execution(execution.workspaceId, execution.id);
      if (settled.kind === "scan") requireScanResult(settled.scan, event);
      const origin: ResultOrigin = settled.kind === "scan" ? "scan" : "agent";
      const flow = event.kind === "create-flow"
        ? this.catalog.createFromEvidence(execution.workspaceId,
          { title: event.title, description: event.description }, evidence, origin)
        : this.catalog.applyExistingResult(event, evidence, origin);
      const outcome: ResultOutcome = {
        executionId: execution.id, eventId: event.eventId, kind: event.kind,
        flowId: flow.id, acceptedAt: new Date().toISOString(),
      };
      const result = { event, outcome, flow };
      this.database.prepare("INSERT INTO accepted_results (execution_id, event_id, data) VALUES (?, ?, ?)")
        .run(execution.id, event.eventId, JSON.stringify(result));
      this.chat.recordScanResult(execution, event);
      this.chat.append(execution, "result", describeResult(event, flow), { result });
      return { outcome, applied: !(event.kind === "review-flow" && event.judgment === "indeterminate") };
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
  }

  #outcome(executionId: string, eventId: string): ResultOutcome | null {
    const row = this.database.prepare("SELECT data FROM accepted_results WHERE execution_id = ? AND event_id = ?")
      .get(executionId, eventId);
    return row ? acceptedResultSchema.parse(JSON.parse(readText(row, "data"))).outcome : null;
  }
}

function describeResult(event: ResultEvent, flow: UserFlow): string {
  switch (event.kind) {
    case "create-flow": return `Created User Flow: ${flow.title}`;
    case "edit-wording": return `Edited wording of User Flow: ${flow.title}. Existing citations retained.`;
    case "edit-behavior": return `Updated behavior of User Flow: ${flow.title}. Supporting citations replaced.`;
    case "delete-flow": return `Permanently deleted User Flow: ${flow.title}. Historical mentions remain; later rediscovery may create a new identity.`;
    case "review-flow": return event.judgment === "indeterminate"
      ? `Reconsidered User Flow: ${flow.title}. Left unchanged: ${event.explanation}`
      : `Reviewed User Flow: ${flow.title}. ${event.judgment === "supported" ? "Active" : "Outdated"} with fresh supporting citations.`;
  }
}
