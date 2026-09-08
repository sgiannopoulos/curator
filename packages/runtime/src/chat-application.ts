import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  CuratorError, agentExecutionSchema, chatEntrySchema,
  type AgentExecution, type ChatEntry, type ProviderObject, type ToolInvocation,
  type ScanningEffort, type ScanReport, type ScanProgress,
} from "@curator/shared";
import { initialScan, advanceScan } from "./scan.js";
import { readInteger, readText, type StoredRow } from "./storage/rows.js";
import { inTransaction } from "./storage/transaction.js";
import { requireIdle } from "./storage/execution-state.js";
import type { Compaction } from "./working-context.js";

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

  start(workspaceId: string, text: string, model: string, effort?: ScanningEffort): AgentExecution {
    return inTransaction(this.database, () => {
      requireIdle(this.database, workspaceId);
      if (effort && this.database.prepare("SELECT 1 FROM user_flows WHERE workspace_id = ? LIMIT 1").get(workspaceId)) {
        throw new CuratorError("invalid_request", "Scanning a populated catalog requires the Review Pass, which is not available yet. You can still curate through Agent Chat.");
      }
      const execution: AgentExecution = {
        id: randomUUID(), workspaceId, kind: effort ? "scan" : "ordinary-chat", scan: effort ? initialScan(effort) : null, requestId: randomUUID(),
        model, status: "running", startedAt: new Date().toISOString(), endedAt: null,
        cancellationRequestedAt: null, reason: null, usage: null, usageRequests: 0,
        usageComplete: false,
      };
      this.database.prepare("INSERT INTO agent_executions (id, workspace_id, status, data) VALUES (?, ?, ?, ?)")
        .run(execution.id, workspaceId, execution.status, JSON.stringify(execution));
      this.append(execution, "user", text, { providerMessage: { role: "user", content: text } });
      this.append(execution, "lifecycle", "Running");
      return execution;
    });
  }

  reportScan(execution: AgentExecution, report: ScanReport): ScanProgress {
    return inTransaction(this.database, () => {
      const current = this.execution(execution.workspaceId, execution.id);
      if (current.status !== "running" || current.cancellationRequestedAt || !current.scan) {
        throw new CuratorError("invalid_request", "This attempt is not an active Scan accepting progress.");
      }
      const scan = advanceScan(current.scan, report);
      this.saveExecution({ ...current, scan });
      this.append(current, "lifecycle", report.kind === "orientation"
        ? `Discovery Pass · Review Pass skipped for an empty catalog. ${scan.applicationDescription}`
        : report.kind === "gap-check" ? `Gap check recorded: ${report.summary}`
          : `Recorded unfinished work: ${report.unfinishedWork.join("; ") || "None recorded"}`);
      return scan;
    });
  }

  /** An accepted discovery after a gap check means that check must be revisited.
   * Called inside result acceptance's transaction, alongside catalog and history. */
  recordScanDiscovery(execution: AgentExecution): void {
    const current = this.execution(execution.workspaceId, execution.id);
    if (current.scan) this.saveExecution({ ...current, scan: { ...current.scan, gapCheck: null } });
  }

  append(execution: AgentExecution, kind: ChatEntry["kind"], text: string,
    detail: Partial<Pick<ChatEntry, "providerMessage" | "unfinished" | "tool" | "usage" | "compaction" | "result">> = {}): number {
    const entry: Omit<ChatEntry, "sequence"> = {
      workspaceId: execution.workspaceId, executionId: execution.id, kind,
      text, createdAt: new Date().toISOString(), providerMessage: null,
      unfinished: false, tool: null, usage: null, compaction: null, result: null, ...detail,
    };
    this.database.prepare("INSERT INTO chat_entries (workspace_id, execution_id, data) VALUES (?, ?, ?)")
      .run(execution.workspaceId, execution.id, JSON.stringify(entry));
    return readInteger(
      this.database.prepare("SELECT last_insert_rowid() AS sequence").get() as StoredRow,
      "sequence",
    );
  }

  /**
   * Opens the entry one model turn writes into. An execution that calls tools
   * takes several turns, and each keeps its own entry, its own request usage,
   * and its own unfinished mark.
   */
  beginTurn(execution: AgentExecution): number {
    return inTransaction(this.database, () =>
      this.append(execution, "assistant", "", {
        providerMessage: { role: "assistant", content: "" }, unfinished: true,
      }));
  }

  /** The turn's provider request ended cleanly, so its content is complete. */
  completeTurn(execution: AgentExecution, turn: number): void {
    inTransaction(this.database, () => {
      this.database.prepare(
        "UPDATE chat_entries SET data = json_set(data, '$.unfinished', json('false')) WHERE sequence = ? AND execution_id = ?",
      ).run(turn, execution.id);
    });
  }

  /** The output of one tool call, recorded as the provider-native tool reply. */
  appendToolResult(execution: AgentExecution, tool: ToolInvocation, output: string): void {
    inTransaction(this.database, () => {
      const current = this.execution(execution.workspaceId, execution.id);
      if (current.status !== "running") return;
      this.append(execution, "tool", output, {
        providerMessage: { role: "tool", tool_call_id: tool.callId, content: output }, tool,
      });
    });
  }

  /**
   * Records one compaction. The summary is an event of its own: no earlier
   * entry is rewritten, replaced, or removed, and a later request reads this
   * instead of the exchanges it stands for.
   */
  beginCompaction(execution: AgentExecution): number {
    return this.append(execution, "compaction", "", { unfinished: true });
  }

  appendCompaction(execution: AgentExecution, turn: number, compaction: Compaction): void {
    inTransaction(this.database, () => {
      const current = this.execution(execution.workspaceId, execution.id);
      if (current.status !== "running") return;
      const row = this.database.prepare("SELECT sequence, data FROM chat_entries WHERE sequence = ? AND execution_id = ?")
        .get(turn, execution.id);
      if (!row) throw new Error("Compaction entry is missing.");
      this.database.prepare("UPDATE chat_entries SET data = ? WHERE sequence = ?").run(JSON.stringify({
        ...readEntry(row), text: compaction.summary, providerMessage: compaction.message,
        compaction: compaction.record, usage: compaction.usage, unfinished: false,
      }), turn);
      this.saveExecution({ ...current, ...this.totals(execution.id) });
    });
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

  checkpoint(execution: AgentExecution, turn: number, message: ProviderObject,
    text: string, usage: ProviderObject | null): void {
    inTransaction(this.database, () => {
      const current = this.execution(execution.workspaceId, execution.id);
      if (current.status !== "running") return;
      const row = this.database.prepare(
        "SELECT sequence, data FROM chat_entries WHERE sequence = ? AND execution_id = ?",
      ).get(turn, execution.id);
      if (!row) throw new Error("Agent response entry is missing.");
      const entry = readEntry(row);
      this.database.prepare("UPDATE chat_entries SET data = ? WHERE sequence = ?")
        .run(JSON.stringify({ ...entry, providerMessage: message, text, usage }), entry.sequence);
      // Usage frames are snapshots for their own request, never additive
      // deltas, so the execution total is recomputed from every request.
      if (usage !== null) this.saveExecution({ ...current, ...this.totals(execution.id) });
    });
  }

  requestCancellation(workspaceId: string, executionId: string): AgentExecution {
    return inTransaction(this.database, () => {
      const current = this.execution(workspaceId, executionId);
      if (current.status !== "running" || current.cancellationRequestedAt) return current;
      const updated = { ...current, cancellationRequestedAt: new Date().toISOString() };
      this.saveExecution(updated);
      this.append(updated, "lifecycle", "Stop requested; waiting for the request and its tools to settle. Provider-side cancellation and final cost are not guaranteed.");
      return updated;
    });
  }

  finish(execution: AgentExecution, status: Exclude<AgentExecution["status"], "running">, reason: string): void {
    inTransaction(this.database, () => {
      const current = this.execution(execution.workspaceId, execution.id);
      if (current.status !== "running") return;
      const totals = this.totals(execution.id);
      const updated: AgentExecution = {
        ...current, ...totals, status, reason, endedAt: new Date().toISOString(),
        // An attempt that ended early may never have been told what its last
        // request cost, so only a normal ending can report complete totals.
        usageComplete: status === "completed" && totals.usageComplete,
      };
      this.saveExecution(updated);
      this.append(updated, "lifecycle", `${status[0]?.toUpperCase()}${status.slice(1)}: ${reason}`);
    });
  }

  interruptRunning(): void {
    const running = this.database.prepare("SELECT data FROM agent_executions WHERE status = 'running'")
      .all().map(readExecution);
    for (const execution of running) {
      this.finish(execution, "interrupted", "The application runtime ended before this attempt settled. Retained response content is unfinished; start new work against the current catalog. Scans with retained discoveries require the Review Pass before another Scan.");
    }
  }

  /**
   * Adds up what the provider reported across an execution's requests. Only
   * numbers add; anything else stays with the request that returned it, and a
   * request that reported nothing keeps the total incomplete rather than
   * counting as zero.
   */
  private totals(executionId: string): Pick<AgentExecution, "usage" | "usageRequests" | "usageComplete"> {
    const snapshots = this.database.prepare(
      `SELECT sequence, data FROM chat_entries
        WHERE execution_id = ? AND json_extract(data, '$.kind') IN ('assistant', 'compaction')
        ORDER BY sequence`,
    ).all(executionId).map((row) => readEntry(row).usage);
    const reported = snapshots.filter((usage): usage is ProviderObject => usage !== null);
    if (reported.length === 0) return { usage: null, usageRequests: 0, usageComplete: false };
    const usage: ProviderObject = {};
    for (const snapshot of reported) {
      for (const [key, value] of Object.entries(snapshot)) {
        if (typeof value !== "number") continue;
        const running = usage[key];
        usage[key] = (typeof running === "number" ? running : 0) + value;
      }
    }
    return {
      usage,
      usageRequests: reported.length,
      usageComplete: reported.length === snapshots.length && reported.every((snapshot) =>
        [snapshot.prompt_tokens, snapshot.completion_tokens, snapshot.total_tokens, snapshot.cost]
          .every((value) => typeof value === "number")),
    };
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
