import { useEffect, useRef, useState } from "react";
import type { AgentExecution, ChatEntry } from "@curator/shared";
import { ExecutionUsage } from "./ExecutionUsage";
import { PathActivity } from "./PathActivity";
import { ScanOutcome } from "./ScanOutcome";
import { sendCommand } from "../bridge";
import type { CuratorSession } from "../useCuratorSession";

export function AgentChat({ session, focusComposer, focusAttempt }: {
  session: CuratorSession;
  focusComposer: number;
  /** An attempt to bring into view, from Scan history; the token repeats it. */
  focusAttempt: { executionId: string; token: number } | null;
}) {
  const { chat, panels } = session;
  const history = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const attempts = useRef(new Map<string, HTMLElement>());
  const following = useRef(true);
  const [shown, setShown] = useState<string | null>(null);
  const running = chat?.executions.find((execution) => execution.status === "running");
  const unavailable = chat?.blockedReason ?? null;
  useEffect(() => {
    if (following.current && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [chat, panels.chatMinimized]);
  // Scan history opens the conversation where that attempt sits, rather than
  // repeating its entries somewhere else: there is one Agent Chat per Workspace.
  useEffect(() => {
    if (focusAttempt === null) return;
    setShown(focusAttempt.executionId);
    // Wait for the panel to finish restoring before scrolling, and jump only
    // for this request: later entries arriving must not drag the reader back.
    const frame = requestAnimationFrame(() => {
      const element = attempts.current.get(focusAttempt.executionId);
      if (element === undefined) return;
      following.current = false;
      element.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusAttempt]);
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
          {chat?.executions.map((execution) => (
            <article key={execution.id} aria-label={`Agent Execution, ${execution.status}`}
              className={`chat-attempt ${shown === execution.id ? "shown" : ""}`}
              ref={(element) => {
                if (element) attempts.current.set(execution.id, element);
                else attempts.current.delete(execution.id);
              }}>
              {entriesByExecution.get(execution.id)?.map((entry) => <Entry key={entry.sequence} entry={entry} />)}
              <ScanOutcome execution={execution} acceptedCount={
                entriesByExecution.get(execution.id)?.filter((entry) => entry.result?.event.kind === "create-flow").length ?? 0} />
              <PathActivity execution={execution}
                activity={chat.activity.find((item) => item.executionId === execution.id) ?? null} />
              {execution.status !== "running" && <ExecutionOutcome execution={execution} session={session} />}
            </article>
          ))}
          {unavailable && <p className="chat-prerequisite">{unavailable}</p>}
        </div>
        <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); session.sendMessage(); }}>
          <textarea ref={composer} aria-label="Message Agent Chat" value={session.chatDraft}
            onChange={(event) => session.setChatDraft(event.target.value)} rows={2}
            placeholder="Ask about this Repository or request a User Flow…" disabled={session.agentBlocked} />
          {running ? (
            <button type="button" onClick={() => session.stopExecution(running.id)}
              disabled={!session.ready || running.cancellationRequestedAt !== null}>Stop</button>
          ) : (
            <button className="primary" type="submit" disabled={session.agentBlocked || !session.chatDraft.trim()}>Send</button>
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
      <details className="chat-tool">
        <summary>{entry.kind === "result" ? entry.text : "Result rejected · repair requested"}</summary>
        {entry.result ? <>
          <p>{entry.result.flow.description}</p>
          <p className="small muted">
            {entry.result.event.kind === "delete-flow"
              ? "Snapshot before deletion"
              : "Snapshot at acceptance"}
            {" · "}{entry.result.flow.status === "active" ? "Active" : "Outdated"}
            {" · "}{entry.result.flow.citations.length} {entry.result.flow.citations.length === 1 ? "source" : "sources"}
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
            ? "Summary sent to the model. Original messages are kept."
            : "Compaction incomplete. Working context is unchanged."}
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

function ExecutionOutcome({ execution, session }: { execution: AgentExecution; session: CuratorSession }) {
  const [frames, setFrames] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // A Scan may be run again as it was requested; an ordinary message is only
  // worth resending when its attempt did not finish. Either way this starts a
  // new Agent Execution against current state rather than resuming anything.
  const retriable = execution.status !== "running" &&
    (execution.scan !== null || ["failed", "cancelled", "interrupted"].includes(execution.status));
  return (
    <div className="chat-outcome">
      <details><summary>Request details · {execution.status}</summary>
        <dl>
          <dt>Model</dt><dd>{execution.model}</dd>
          <dt>Execution</dt><dd className="mono">{execution.id}</dd>
          <dt>Request</dt><dd className="mono">{execution.requestId}</dd>
          <ExecutionUsage execution={execution} />
        </dl>
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
      {retriable && <button disabled={session.agentBlocked}
        onClick={() => session.retryExecution(execution.id)}>
        {execution.scan === null ? "Retry as new attempt" : `Start a new ${execution.scan.effort} Scan`}</button>}
    </div>
  );
}

function summarize(argumentsJson: string): string {
  const single = argumentsJson.replace(/\s+/g, " ").trim();
  return single.length > 64 ? `${single.slice(0, 64)}…` : single;
}
