import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  CuratorError, agentExecutionSchema, chatEntrySchema,
  type AgentExecution, type ChatEntry, type ProviderObject,
} from "@curator/shared";
import { readInteger, readText, type StoredRow } from "./storage/rows.js";
import { inTransaction } from "./storage/transaction.js";
import { requireIdle } from "./storage/execution-state.js";

/** Workspace-owned transcript and lifecycle persistence share catalog transactions. */
export class ChatApplication {
  constructor(private readonly database: DatabaseSync) {}

  entries(workspaceId: string): ChatEntry[] {
    return this.database.prepare(
      "SELECT sequence, data FROM chat_entries WHERE workspace_id = ? ORDER BY sequence",
    ).all(workspaceId).map(readEntry);
  }

  executions(workspaceId: string): AgentExecution[] {
    return this.database.prepare(
      "SELECT data FROM agent_executions WHERE workspace_id = ? ORDER BY rowid",
    ).all(workspaceId).map(readExecution);
  }

  execution(workspaceId: string, executionId: string): AgentExecution {
    const row = this.database.prepare(
      "SELECT data FROM agent_executions WHERE workspace_id = ? AND id = ?",
    ).get(workspaceId, executionId);
    if (!row) throw new CuratorError("execution_not_found", "That Agent Execution is not in this Workspace.");
    return readExecution(row);
  }

  start(workspaceId: string, text: string, model: string): AgentExecution {
    return inTransaction(this.database, () => {
      requireIdle(this.database, workspaceId);
      const execution: AgentExecution = {
        id: randomUUID(), workspaceId, kind: "ordinary-chat", requestId: randomUUID(),
        model, status: "running", startedAt: new Date().toISOString(), endedAt: null,
        cancellationRequestedAt: null, reason: null, usage: null, usageComplete: false,
      };
      this.database.prepare("INSERT INTO agent_executions (id, workspace_id, status, data) VALUES (?, ?, ?, ?)")
        .run(execution.id, workspaceId, execution.status, JSON.stringify(execution));
      this.append(execution, "user", text, { role: "user", content: text });
      this.append(execution, "lifecycle", "Running");
      this.append(execution, "assistant", "", { role: "assistant", content: "" }, true);
      return execution;
    });
  }

  append(execution: AgentExecution, kind: ChatEntry["kind"], text: string,
    providerMessage: ProviderObject | null = null, unfinished = false): void {
    const entry = {
      workspaceId: execution.workspaceId, executionId: execution.id, kind,
      text, createdAt: new Date().toISOString(), providerMessage, unfinished,
    };
    this.database.prepare("INSERT INTO chat_entries (workspace_id, execution_id, data) VALUES (?, ?, ?)")
      .run(execution.workspaceId, execution.id, JSON.stringify(entry));
  }

  /** Raw payload is committed BEFORE any display or continuation normalization. */
  recordFrame(execution: AgentExecution, frame: unknown): void {
    this.database.prepare("INSERT INTO provider_frames (execution_id, data) VALUES (?, ?)")
      .run(execution.id, JSON.stringify(frame));
  }

  frames(workspaceId: string, executionId: string): unknown[] {
    this.execution(workspaceId, executionId);
    return this.database.prepare("SELECT data FROM provider_frames WHERE execution_id = ? ORDER BY sequence")
      .all(executionId).map((row) => JSON.parse(readText(row, "data")) as unknown);
  }

  checkpoint(execution: AgentExecution, message: ProviderObject, text: string, usage: ProviderObject | null): void {
    inTransaction(this.database, () => {
      const current = this.execution(execution.workspaceId, execution.id);
      if (current.status !== "running") return;
      const row = this.database.prepare(
        "SELECT sequence, data FROM chat_entries WHERE execution_id = ? AND json_extract(data, '$.kind') = 'assistant'",
      ).get(execution.id);
      if (!row) throw new Error("Agent response entry is missing.");
      const entry = readEntry(row);
      this.database.prepare("UPDATE chat_entries SET data = ? WHERE sequence = ?")
        .run(JSON.stringify({ ...entry, providerMessage: message, text }), entry.sequence);
      // Usage frames are snapshots for this request, never additive deltas.
      if (usage !== null) this.saveExecution({ ...current, usage });
    });
  }

  requestCancellation(workspaceId: string, executionId: string): AgentExecution {
    return inTransaction(this.database, () => {
      const current = this.execution(workspaceId, executionId);
      if (current.status !== "running" || current.cancellationRequestedAt) return current;
      const updated = { ...current, cancellationRequestedAt: new Date().toISOString() };
      this.saveExecution(updated);
      this.append(updated, "lifecycle", "Stop requested; waiting for the request to settle. Provider-side cancellation and final cost are not guaranteed.");
      return updated;
    });
  }

  finish(execution: AgentExecution, status: Exclude<AgentExecution["status"], "running">, reason: string): void {
    inTransaction(this.database, () => {
      const current = this.execution(execution.workspaceId, execution.id);
      if (current.status !== "running") return;
      const usage = current.usage;
      const updated: AgentExecution = {
        ...current, status, reason, endedAt: new Date().toISOString(),
        usageComplete: status === "completed" && usage !== null &&
          [usage.prompt_tokens, usage.completion_tokens, usage.total_tokens, usage.cost]
            .every((value) => typeof value === "number"),
      };
      this.saveExecution(updated);
      if (status === "completed") {
        this.database.prepare(
          "UPDATE chat_entries SET data = json_set(data, '$.unfinished', json('false')) WHERE execution_id = ? AND json_extract(data, '$.kind') = 'assistant'",
        ).run(execution.id);
      }
      this.append(updated, "lifecycle", `${status[0]?.toUpperCase()}${status.slice(1)}: ${reason}`);
    });
  }

  interruptRunning(): void {
    const running = this.database.prepare("SELECT data FROM agent_executions WHERE status = 'running'")
      .all().map(readExecution);
    for (const execution of running) {
      this.finish(execution, "interrupted", "The application runtime ended before this attempt settled. Retained response content is unfinished; send a new message or Retry to start a new attempt.");
    }
  }

  private saveExecution(execution: AgentExecution): void {
    this.database.prepare("UPDATE agent_executions SET status = ?, data = ? WHERE id = ?")
      .run(execution.status, JSON.stringify(execution), execution.id);
  }
}

function readEntry(row: StoredRow): ChatEntry {
  return chatEntrySchema.parse({ ...JSON.parse(readText(row, "data")), sequence: readInteger(row, "sequence") });
}
function readExecution(row: StoredRow): AgentExecution {
  return agentExecutionSchema.parse(JSON.parse(readText(row, "data")));
}
