import type { DatabaseSync } from "node:sqlite";
import {
  fileActivityKindSchema,
  type AgentExecution, type ExecutionActivity, type FileActivity,
} from "@curator/shared";
import {
  readInteger, readOptionalInteger, readOptionalText, readText, type StoredRow,
} from "./storage/rows.js";
import { inTransaction } from "./storage/transaction.js";

/** What a tool observed about one Repository path, before it is recorded. */
export interface ActivityReport extends Pick<FileActivity, "path" | "kind"> {
  reason?: string;
  count?: number;
}

/** How many exclusions travel with a summary before the rest are read on request. */
const SUMMARY_EXCLUSIONS = 50;

/**
 * The strongest observation for a path wins: contents that actually reached the
 * agent outrank an intention to skip, which outranks having merely surfaced it.
 * The rule lives here, in one expression both the write and its guard use.
 */
function precedence(table: string): string {
  return `CASE ${table}.kind WHEN 'read' THEN 3 WHEN 'excluded' THEN 2 ELSE 1 END`;
}

function rank(kind: FileActivity["kind"]): number {
  return kind === "read" ? 3 : kind === "excluded" ? 2 : 1;
}

/**
 * What each Agent Execution was observed to do with Repository files.
 *
 * Considered means a path was surfaced and weighed for relevance, Read means
 * some of its contents reached the agent, and Excluded means it was explicitly
 * skipped with a reason. A path nobody looked at is none of the three: this is
 * observed activity, not a coverage measure and not evidence that the agent's
 * prompt-governed limits held.
 */
export class FileActivityLog {
  constructor(private readonly database: DatabaseSync) {}

  record(execution: AgentExecution, reports: ActivityReport[]): void {
    const strongest = new Map<string, ActivityReport>();
    for (const report of reports) {
      const held = strongest.get(report.path);
      if (held === undefined || rank(report.kind) > rank(held.kind)) {
        strongest.set(report.path, report);
      }
    }
    if (strongest.size === 0) return;
    inTransaction(this.database, () => {
      const now = new Date().toISOString();
      // One prepared statement for the whole call: a single listing can report
      // thousands of paths, and the transaction has to stay short.
      const write = this.database.prepare(
        `INSERT INTO file_activity (workspace_id, execution_id, path, kind, reason, grouped_count, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (execution_id, path) DO UPDATE
                 SET kind = excluded.kind, reason = excluded.reason, grouped_count = excluded.grouped_count
               WHERE ${precedence("excluded")} > ${precedence("file_activity")}`,
      );
      for (const report of strongest.values()) {
        write.run(execution.workspaceId, execution.id, report.path, report.kind,
          report.reason ?? null, report.count ?? null, now);
      }
    });
  }

  /**
   * Counts for every execution in the Workspace, with the exclusions spelled
   * out: they carry the reasons worth reading, and the counts say how much
   * more there is. Read publishes this after every tool call, so it counts in
   * the store rather than reading every recorded path back.
   */
  summary(workspaceId: string): ExecutionActivity[] {
    const summaries = new Map<string, ExecutionActivity>();
    const of = (executionId: string): ExecutionActivity => {
      const existing = summaries.get(executionId) ??
        { executionId, considered: 0, read: 0, excluded: 0, exclusions: [] };
      summaries.set(executionId, existing);
      return existing;
    };
    const counts = this.database.prepare(
      `SELECT execution_id, kind, COUNT(*) AS total FROM file_activity
        WHERE workspace_id = ? GROUP BY execution_id, kind`,
    ).all(workspaceId);
    for (const row of counts) {
      of(readText(row, "execution_id"))[fileActivityKindSchema.parse(readText(row, "kind"))] =
        readInteger(row, "total");
    }
    const exclusions = this.database.prepare(
      `SELECT execution_id, path, kind, reason, grouped_count FROM (
         SELECT execution_id, path, kind, reason, grouped_count,
                ROW_NUMBER() OVER (PARTITION BY execution_id ORDER BY sequence) AS position
           FROM file_activity WHERE workspace_id = ? AND kind = 'excluded'
       ) WHERE position <= ?`,
    ).all(workspaceId, SUMMARY_EXCLUSIONS);
    for (const row of exclusions) {
      of(readText(row, "execution_id")).exclusions.push(toActivity(row));
    }
    return [...summaries.values()];
  }

  /** Every recorded path for one execution, read on request rather than always. */
  paths(executionId: string): FileActivity[] {
    return this.database.prepare(
      `SELECT path, kind, reason, grouped_count FROM file_activity
        WHERE execution_id = ? ORDER BY kind, path`,
    ).all(executionId).map(toActivity);
  }
}

function toActivity(row: StoredRow): FileActivity {
  return {
    path: readText(row, "path"),
    kind: fileActivityKindSchema.parse(readText(row, "kind")),
    reason: readOptionalText(row, "reason"),
    count: readOptionalInteger(row, "grouped_count"),
  };
}
