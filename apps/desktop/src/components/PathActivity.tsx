import { useEffect, useState } from "react";
import type { AgentExecution, ExecutionActivity, FileActivity } from "@curator/shared";
import { sendCommand } from "../bridge";

/**
 * What the attempt was observed to do with Repository files. These are the
 * paths its tools reported, not an account of everything it touched: nothing
 * here claims complete tracking, and a path nobody looked at is simply absent
 * rather than excluded.
 */
export function PathActivity({ execution, activity }: { execution: AgentExecution; activity: ExecutionActivity | null }) {
  const [paths, setPaths] = useState<FileActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    let listening = true;
    void sendCommand("chat.activity", { workspaceId: execution.workspaceId, executionId: execution.id })
      .then((result) => { if (listening) { setPaths(result.paths); setError(null); } })
      .catch((cause: unknown) => {
        if (listening) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => { listening = false; };
  }, [expanded, execution.workspaceId, execution.id, execution.status,
    activity?.considered, activity?.read, activity?.excluded]);
  if (activity === null) return null;
  return (
    <details className="chat-activity">
      <summary>
        Path records · {activity.considered} considered · {activity.read} read · {activity.excluded} excluded
      </summary>
      <p className="small muted">
        Considered means a path was surfaced and weighed for relevance, Read means some of its
        contents reached the agent, and Excluded means it was explicitly skipped. A path nobody
        opened is none of these.
      </p>
      {activity.exclusions.length > 0 && (
        <>
          <ul className="chat-exclusions">
            {activity.exclusions.map((exclusion) => (
              <li key={exclusion.path}>
                <span className="mono">{exclusion.path}</span>
                {exclusion.count === null ? "" : ` (about ${exclusion.count} files)`} — {exclusion.reason}
              </li>
            ))}
          </ul>
          {activity.excluded > activity.exclusions.length && (
            <p className="small muted">
              The first {activity.exclusions.length} of {activity.excluded}; the rest are below.
            </p>
          )}
        </>
      )}
      <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>Every recorded path</summary>
        {error ? <p>{error}</p> : paths === null ? <p>Loading…</p> : (
          <pre>{paths.map((path) => `${path.kind}\t${path.path}${path.count === null ? "" : ` (${path.count} grouped paths)`}${path.reason === null ? "" : ` — ${path.reason}`}`).join("\n")}</pre>
        )}
      </details>
    </details>
  );
}
