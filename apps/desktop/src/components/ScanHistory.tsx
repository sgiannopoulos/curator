import { useEffect, useState } from "react";
import { describeResultKind, type ScanRecord } from "@curator/shared";
import { ExecutionUsage } from "./ExecutionUsage";
import { PathActivity } from "./PathActivity";
import { ScanOutcome } from "./ScanOutcome";
import { asCuratorError, sendCommand } from "../bridge";
import { describeMoment } from "../format";
import type { CuratorSession } from "../useCuratorSession";

/**
 * Every Scan this Workspace has attempted, newest first. It is retained
 * history and nothing more: it says what each attempt accepted and where it
 * stopped, and it cannot restore a User Flow that has since been deleted or
 * put back evidence a later review replaced.
 *
 * This is source analysis, not test-run history. Curator does not run the
 * product, and the testing controls elsewhere remain clearly marked previews.
 */
export function ScanHistory({ workspaceId, session, onOpenChat, onClose }: {
  workspaceId: string;
  session: CuratorSession;
  onOpenChat: (executionId: string) => void;
  onClose: () => void;
}) {
  const [records, setRecords] = useState<ScanRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Re-read whenever the Agent Chat snapshot changes, so an attempt that
  // starts, commits a result, or ends while this is open catches up from
  // persisted state instead of going stale. Reading changes nothing.
  const agentChat = session.chat;
  useEffect(() => {
    let listening = true;
    void sendCommand("scan.history", { workspaceId })
      .then((result) => { if (listening) { setRecords(result.records); setError(null); } })
      .catch((cause: unknown) => {
        if (listening) setError(asCuratorError(cause).toApplicationError().message);
      });
    return () => { listening = false; };
  }, [workspaceId, agentChat]);

  return (
    <article className="document">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3>Scan history</h3>
        <button onClick={onClose}>Close history</button>
      </div>
      {error !== null && <p>{error}</p>}
      {records === null && error === null && <p className="small muted">Reading Scan history…</p>}
      {records?.length === 0 && (
        <p className="small muted">No Scans yet.</p>
      )}
      {records?.map((record) => (
        <ScanRecordItem key={record.execution.id} record={record} session={session}
          onOpenChat={onOpenChat} />
      ))}
    </article>
  );
}

function ScanRecordItem({ record, session, onOpenChat }: {
  record: ScanRecord;
  session: CuratorSession;
  onOpenChat: (executionId: string) => void;
}) {
  const { execution, activity, results } = record;
  const scan = execution.scan;
  if (!scan) return null;
  const created = results.filter((result) => result.event.kind === "create-flow").length;
  return (
    <div className="history-item">
      <strong>{describeMoment(execution.startedAt)}</strong>
      <ScanOutcome execution={execution} acceptedCount={created} />
      <details>
        <summary>Accepted results · {results.length}</summary>
        <p className="small muted">
          Results at acceptance.
        </p>
        {results.length === 0
          ? <p className="small muted">No accepted results.</p>
          : <ul className="chat-exclusions">
              {results.map((result) => (
                <li key={result.outcome.eventId}>
                  {describeResultKind(result.event)} · {result.flow.title}
                  {session.flows.some((flow) => flow.id === result.outcome.flowId)
                    ? "" : " — no longer in the catalog"}
                </li>
              ))}
            </ul>}
      </details>
      <PathActivity execution={execution} activity={activity} />
      <details>
        <summary>Attempt details</summary>
        <dl>
          <dt>Model</dt><dd>{execution.model}</dd>
          <dt>Execution</dt><dd className="mono">{execution.id}</dd>
          {scan.retryOf !== null && <>
            <dt>Retry of</dt><dd className="mono">{scan.retryOf}</dd>
          </>}
          <ExecutionUsage execution={execution} />
        </dl>
      </details>
      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={() => onOpenChat(execution.id)}>
          Open in Agent Chat · {record.entryCount} {record.entryCount === 1 ? "entry" : "entries"}
        </button>
        <button disabled={session.agentBlocked} onClick={() => session.retryExecution(execution.id)}>
          Start a new {scan.effort} Scan
        </button>
      </div>
    </div>
  );
}
