import { useEffect, useRef, useState } from "react";
import type { AgentExecution, ChatEntry } from "@curator/shared";
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
          {chat?.entries.length === 0 && <p className="small muted">Ask about the current User Flows. Repository inspection and catalog changes through chat arrive in later work.</p>}
          {chat?.executions.map((execution) => (
            <article key={execution.id} className="chat-attempt" aria-label={`Agent Execution, ${execution.status}`}>
              {entriesByExecution.get(execution.id)?.map((entry) => <Entry key={entry.sequence} entry={entry} />)}
              {execution.status !== "running" && <ExecutionOutcome execution={execution} session={session} />}
            </article>
          ))}
          {unavailable && <p className="chat-prerequisite">{unavailable}</p>}
        </div>
        <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); session.sendMessage(); }}>
          <textarea aria-label="Message Agent Chat" value={session.chatDraft}
            onChange={(event) => session.setChatDraft(event.target.value)} rows={2}
            placeholder="Ask about your User Flows…" disabled={!session.ready || session.working || chat === null || unavailable !== null} />
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
          <dt>Usage and cost</dt><dd>{execution.usage === null ? "Unavailable" : execution.usageComplete ? "Provider-reported" : "Incomplete provider totals"}</dd>
        </dl>
        {execution.usage !== null && <pre>{JSON.stringify(execution.usage, null, 2)}</pre>}
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
