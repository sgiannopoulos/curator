import { useEffect, useRef, useState } from "react";
import type { AgentExecution, ChatEntry, ExecutionActivity, FileActivity } from "@curator/shared";
import { ScanOutcome } from "./ScanOutcome";
import { sendCommand } from "../bridge";
import type { CuratorSession } from "../useCuratorSession";

export function AgentChat({ session, focusComposer }: { session: CuratorSession; focusComposer: number }) {
  const { chat, panels } = session;
  const history = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const following = useRef(true);
  const running = chat?.executions.find((execution) => execution.status === "running");
  const unavailable = chat?.blockedReason ?? null;
  useEffect(() => {
    if (following.current && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [chat, panels.chatMinimized]);
  useEffect(() => {
    if (focusComposer === 0) return;
    // Wait until the generation dialog has closed and restored focus.
    const frame = requestAnimationFrame(() => composer.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusComposer]);
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
          {chat?.entries.length === 0 && <p className="small muted">Ask about this Repository or request a new User Flow. Curator reads the implementation and adds supporting Source Citations to flows it creates.</p>}
          {chat?.executions.map((execution) => (
            <article key={execution.id} className="chat-attempt" aria-label={`Agent Execution, ${execution.status}`}>
              {entriesByExecution.get(execution.id)?.map((entry) => <Entry key={entry.sequence} entry={entry} />)}
              <ScanOutcome execution={execution} acceptedCount={
                entriesByExecution.get(execution.id)?.filter((entry) => entry.result?.event.kind === "create-flow").length ?? 0} />
              <Activity execution={execution}
                activity={chat.activity.find((item) => item.executionId === execution.id) ?? null} />
              {execution.status !== "running" && <ExecutionOutcome execution={execution} session={session} />}
            </article>
          ))}
          {unavailable && <p className="chat-prerequisite">{unavailable}</p>}
        </div>
        <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); session.sendMessage(); }}>
          <textarea ref={composer} aria-label="Message Agent Chat" value={session.chatDraft}
            onChange={(event) => session.setChatDraft(event.target.value)} rows={2}
            placeholder="Ask about this Repository or request a User Flow…" disabled={!session.ready || session.working || chat === null || unavailable !== null} />
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
  if (entry.kind === "result" || entry.kind === "validation") {
    return (
      <details className="chat-tool" open={entry.kind === "result"}>
        <summary>{entry.kind === "result" ? entry.text : "Result rejected · repair requested"}</summary>
        {entry.result ? <>
          <p>{entry.result.flow.description}</p>
          <p className="small muted">
            {entry.result.event.kind === "delete-flow"
              ? "This is the flow as it was before permanent deletion. It is no longer in the catalog."
              : "This records the flow when the result was accepted; the catalog shows its current state."}
            {" "}Recorded status: {entry.result.flow.status === "active" ? "Active" : "Outdated"}.
            {" "}{entry.result.flow.citations.length} retained source citation(s).
          </p>
          <details><summary>Accepted result details</summary><pre>{JSON.stringify(entry.result, null, 2)}</pre></details>
        </> : <pre>{entry.text}</pre>}
      </details>
    );
  }
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
          {entry.compaction ? `Context compacted · ${entry.compaction.replaced} earlier exchanges summarized` : "Context compaction · unfinished"}
        </summary>
        <p className="small muted">
          {entry.compaction
            ? "These earlier exchanges were summarized for later requests. The original conversation is retained, and this summary was given to the model."
            : "The summary request has not completed successfully. Its available response and usage are retained; working context has not been replaced."}
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

function ExecutionOutcome({ execution, session }: { execution: AgentExecution; session: CuratorSession }) {
  const [frames, setFrames] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const retriable = execution.kind === "ordinary-chat" && ["failed", "cancelled", "interrupted"].includes(execution.status);
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
