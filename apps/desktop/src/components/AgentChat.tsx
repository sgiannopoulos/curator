import { useEffect, useRef, useState } from "react";
import type { AgentExecution, ChatEntry, ExecutionActivity, FileActivity } from "@curator/shared";
import { sendCommand } from "../bridge";
import type { CuratorSession } from "../useCuratorSession";

export function AgentChat({ session }: { session: CuratorSession }) {
  const { chat, panels } = session;
  const history = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const running = chat?.executions.find((execution) => execution.status === "running");
  const unavailable = chat?.blockedReason ?? null;
  useEffect(() => {
    if (following.current && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [chat, panels.chatMinimized]);
  const entriesByExecution = new Map<string, ChatEntry[]>();
  for (const entry of chat?.entries ?? []) {
    const entries = entriesByExecution.get(entry.executionId) ?? [];
    entries.push(entry);
    entriesByExecution.set(entry.executionId, entries);
  }

  return (
    <section className={`agent-chat ${panels.chatMinimized ? "minimized" : ""} ${panels.flowsMinimized && !panels.chatMinimized ? "fill" : ""}`}
      style={!panels.chatMinimized && !panels.flowsMinimized ? { flexBasis: panels.chatHeight } : undefined}>
      <header className="chat-heading">
        <h2 className="label grow">Agent Chat</h2>
        {running && <span className="small" role="status">{!session.ready ? "Runtime lost" : running.cancellationRequestedAt ? "Stopping…" : "Running"}</span>}
        <button className="plain icon-button" onClick={() => session.setPanels({ chatMinimized: !panels.chatMinimized })}
          aria-expanded={!panels.chatMinimized} aria-controls="agent-chat-content"
          aria-label={panels.chatMinimized ? "Restore Agent Chat" : "Minimize Agent Chat"}>
          {panels.chatMinimized ? "+" : "−"}
        </button>
      </header>
      <div className="chat-content" id="agent-chat-content" hidden={panels.chatMinimized}>
        <div className="chat-history" ref={history} aria-label="Agent Chat history" onScroll={() => {
          const element = history.current;
          if (element) following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 40;
        }}>
          {chat === null && <p className="small muted">Loading Agent Chat…</p>}
          {chat?.entries.length === 0 && <p className="small muted">Ask about this Repository or the User Flows you have. Curator reads source to answer; changing the catalog through chat arrives in later work.</p>}
          {chat?.executions.map((execution) => (
            <article key={execution.id} className="chat-attempt" aria-label={`Agent Execution, ${execution.status}`}>
              {entriesByExecution.get(execution.id)?.map((entry) => <Entry key={entry.sequence} entry={entry} />)}
              <Activity execution={execution}
                activity={chat.activity.find((item) => item.executionId === execution.id) ?? null} />
              {execution.status !== "running" && <ExecutionOutcome execution={execution} session={session} />}
            </article>
          ))}
          {unavailable && <p className="chat-prerequisite">{unavailable}</p>}
        </div>
        <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); session.sendMessage(); }}>
          <textarea aria-label="Message Agent Chat" value={session.chatDraft}
            onChange={(event) => session.setChatDraft(event.target.value)} rows={2}
            placeholder="Ask about this Repository…" disabled={!session.ready || session.working || chat === null || unavailable !== null} />
          {running ? (
            <button type="button" onClick={() => session.stopExecution(running.id)}
              disabled={!session.ready || running.cancellationRequestedAt !== null}>Stop</button>
          ) : (
            <button className="primary" type="submit" disabled={!session.ready || session.working || chat === null || unavailable !== null || !session.chatDraft.trim()}>Send</button>
          )}
        </form>
      </div>
    </section>
  );
}

function Entry({ entry }: { entry: ChatEntry }) {
  if (entry.kind === "lifecycle") return <p className="chat-lifecycle">{entry.text}</p>;
  if (entry.kind === "tool") {
    // What ran, with the arguments the provider asked for and everything that
    // came back, collapsed so a long inspection does not bury the answer.
    const tool = entry.tool;
    return (
      <details className="chat-tool">
        <summary>
          {tool?.name ?? "tool"}{tool?.failed === true ? " · failed" : ""}
          <span className="mono muted"> {summarize(tool?.arguments ?? "")}</span>
        </summary>
        <pre>{tool?.arguments}</pre>
        <pre>{entry.text}</pre>
      </details>
    );
  }
  if (entry.kind === "compaction") {
    // The summary is an event beside the conversation, not a replacement for
    // it: every entry it stands for is still above, in order.
    return (
      <details className="chat-compaction">
        <summary>
          Context compacted · {entry.compaction?.replaced ?? 0} earlier exchanges summarized
        </summary>
        <p className="small muted">
          The model's working context was filling, so these exchanges were summarized for later
          requests. Nothing was removed from this conversation, and the summary is what the model
          was given in their place.
        </p>
        <pre>{entry.text}</pre>
      </details>
    );
  }
  const message = entry.providerMessage;
  const reasoning = message && Object.fromEntries(Object.entries(message).filter(([key]) => key.startsWith("reasoning")));
  return (
    <div className={`chat-entry ${entry.kind}`}>
      <span className="label">{entry.kind === "user" ? "You" : "Curator"}</span>
      {entry.text && <p>{entry.text}</p>}
      {entry.unfinished && <span className="small muted">Unfinished response</span>}
      {reasoning && Object.keys(reasoning).length > 0 && (
        <details><summary>Returned reasoning</summary><pre>{JSON.stringify(reasoning, null, 2)}</pre></details>
      )}
    </div>
  );
}

/**
 * What the attempt was observed to do with Repository files. These are the
 * paths its tools reported, not an account of everything it touched: nothing
 * here claims complete tracking, and a path nobody looked at is simply absent
 * rather than excluded.
 */
function Activity({ execution, activity }: { execution: AgentExecution; activity: ExecutionActivity | null }) {
  const [paths, setPaths] = useState<FileActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (activity === null) return null;
  return (
    <details className="chat-activity">
      <summary>
        Files · {activity.considered} considered · {activity.read} read · {activity.excluded} excluded
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
      <details onToggle={(event) => {
        if (!event.currentTarget.open || paths !== null) return;
        void sendCommand("chat.activity", { workspaceId: execution.workspaceId, executionId: execution.id })
          .then((result) => { setPaths(result.paths); setError(null); })
          .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
      }}>
        <summary>Every recorded path</summary>
        {error ? <p>{error}</p> : paths === null ? <p>Loading…</p> : (
          <pre>{paths.map((path) => `${path.kind}\t${path.path}${path.reason === null ? "" : ` — ${path.reason}`}`).join("\n")}</pre>
        )}
      </details>
    </details>
  );
}

function ExecutionOutcome({ execution, session }: { execution: AgentExecution; session: CuratorSession }) {
  const [frames, setFrames] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const retriable = ["failed", "cancelled", "interrupted"].includes(execution.status);
  return (
    <div className="chat-outcome">
      <details><summary>Request details · {execution.status}</summary>
        <dl>
          <dt>Model</dt><dd>{execution.model}</dd>
          <dt>Execution</dt><dd className="mono">{execution.id}</dd>
          <dt>Request</dt><dd className="mono">{execution.requestId}</dd>
          <dt>Provider requests</dt><dd>{execution.usageRequests === 0 ? "None reported usage" : `${execution.usageRequests} reported usage`}</dd>
          <dt>Usage and cost</dt><dd>{execution.usage === null ? "Unavailable" : execution.usageComplete ? "Provider-reported numbers, added across this attempt's requests" : "Incomplete provider totals"}</dd>
        </dl>
        {execution.usage !== null && <pre>{JSON.stringify(execution.usage, null, 2)}</pre>}
        {execution.usage !== null && <p className="small muted">Only numeric fields add up. What each request reported on its own is in its complete payloads.</p>}
        <details onToggle={(event) => {
          if (!event.currentTarget.open || frames !== null || loading) return;
          setLoading(true);
          void sendCommand("chat.provider", { workspaceId: execution.workspaceId, executionId: execution.id })
            .then((result) => { setFrames(result.frames); setError(null); })
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
            .finally(() => setLoading(false));
        }}><summary>Complete provider payloads</summary>
          {error ? <p>{error}</p> : frames === null ? <p>Loading…</p> : <pre>{JSON.stringify(frames, null, 2)}</pre>}
        </details>
      </details>
      {retriable && <button disabled={!session.ready || session.working || session.chat?.blockedReason !== null}
        onClick={() => session.retryExecution(execution.id)}>Retry as new attempt</button>}
    </div>
  );
}

function summarize(argumentsJson: string): string {
  const single = argumentsJson.replace(/\s+/g, " ").trim();
  return single.length > 64 ? `${single.slice(0, 64)}…` : single;
}
