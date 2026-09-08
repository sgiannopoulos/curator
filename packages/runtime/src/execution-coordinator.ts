import { join } from "node:path";
import {
  CuratorError,
  type AgentExecution, type ChatSnapshot, type FileActivity, type ProviderObject,
  type ScanningEffort, type ScanRecord,
  type RepositoryAvailability,
} from "@curator/shared";
import { renderPrompt } from "./prompts.js";
import { scanInstructions, scanProgressTool } from "./scan.js";
import { runAgentChat, type AgentSession } from "./agent-runtime.js";
import type { loadConfiguration } from "./configuration.js";
import { RepositoryAccess } from "./repository-access.js";
import { resultOutboxTool, RESULT_OUTBOX_FILE } from "./result-outbox.js";
import type { WorkspaceApplication } from "./workspace-application.js";
import { describeAgentFailure } from "./agent-runtime.js";
import { attachToolResult, segmentOf, type ContextSegment, type WorkingContext } from "./working-context.js";

/** One lifetime per explicit request, with independent cancellation by Workspace. */
export class ExecutionCoordinator {
  readonly #active = new Map<string, { controller: AbortController; settled: Promise<void> }>();
  #stopping = false;

  constructor(private readonly workspaces: WorkspaceApplication,
    private readonly settings: ReturnType<typeof loadConfiguration>,
    private readonly workingRoot: string,
    private readonly changed: (workspaceId: string) => void,
    private readonly catalogChanged: (workspaceId: string) => void) {
    workspaces.chat.interruptRunning();
  }

  read(workspaceId: string): ChatSnapshot {
    const availability = this.workspaces.repositoryAvailability(workspaceId);
    return {
      entries: this.workspaces.chat.entries(workspaceId),
      executions: this.workspaces.chat.executions(workspaceId),
      activity: this.workspaces.activity.summary(workspaceId),
      blockedReason: this.blockedReason(availability),
      repositoryAvailability: availability,
    };
  }

  /**
   * Every retained Scan attempt in this Workspace, newest first. Each record is
   * read from what already persists it, so reopening the application, or a
   * reload while work runs, shows the same history without touching the
   * running execution.
   */
  scanHistory(workspaceId: string): ScanRecord[] {
    const activity = this.workspaces.activity.summary(workspaceId);
    const entries = this.workspaces.chat.entries(workspaceId);
    return this.workspaces.chat.executions(workspaceId)
      .filter((execution) => execution.scan !== null)
      .map((execution) => ({
        execution,
        results: this.workspaces.results.acceptedResults(execution),
        // An attempt whose tools reported nothing has an empty ledger rather
        // than no ledger: nothing observed is not nothing to say.
        activity: activity.find((item) => item.executionId === execution.id) ??
          { executionId: execution.id, considered: 0, read: 0, excluded: 0, exclusions: [] },
        entryCount: entries.filter((entry) => entry.executionId === execution.id).length,
      }))
      .reverse();
  }

  /** Named by execution, so an identity from another Workspace is refused. */
  activityPaths(workspaceId: string, executionId: string): FileActivity[] {
    const execution = this.workspaces.chat.execution(workspaceId, executionId);
    return this.workspaces.activity.paths(execution.id);
  }

  start(workspaceId: string, text: string): AgentExecution {
    return this.launch(workspaceId, text);
  }

  startScan(workspaceId: string, effort: ScanningEffort, retryOf: string | null = null): AgentExecution {
    return this.launch(workspaceId, renderPrompt("scan-request", { effort }), effort, retryOf);
  }

  private launch(workspaceId: string, text: string, effort?: ScanningEffort,
    retryOf: string | null = null): AgentExecution {
    const blocked = this.blockedReason(this.workspaces.repositoryAvailability(workspaceId));
    const configuration = this.settings.configuration;
    if (blocked || !configuration) throw new CuratorError("agent_unavailable", blocked ?? "OpenRouter Configuration is unavailable.");
    const execution = this.workspaces.chat.start(workspaceId, text, configuration.model, effort, retryOf);
    const controller = new AbortController();
    // Schedule after start has published its durable identity and returned.
    const settled = Promise.resolve().then(async () => {
      let failure: string | null = null;
      try {
        controller.signal.throwIfAborted();
        const chat = this.workspaces.chat;
        // Each step is persisted before it is announced, so what the interface
        // reads back is what the store already holds.
        const persist = <T>(work: () => T): T => {
          const result = work();
          this.changed(workspaceId);
          return result;
        };
        const workingDirectory = join(this.workingRoot, execution.id);
        const access = new RepositoryAccess(
          this.repositoryLocator(workspaceId), workingDirectory,
          (reports) => persist(() => this.workspaces.activity.record(execution, reports)));
        const session: AgentSession = {
          context: () => this.context(workspaceId, execution),
          beginTurn: () => persist(() => chat.beginTurn(execution)),
          record: (frame) => chat.recordFrame(execution, frame),
          checkpoint: (turn, { message, text: response, usage }) =>
            persist(() => chat.checkpoint(execution, turn, message, response, usage)),
          completeTurn: (turn) => persist(() => chat.completeTurn(execution, turn)),
          toolResult: (tool, output) => persist(() => chat.appendToolResult(execution, tool, output)),
          beginCompaction: () => persist(() => chat.beginCompaction(execution)),
          compact: (turn, compaction) => persist(() => chat.appendCompaction(execution, turn, compaction)),
        };
        const tools = [...access.tools(controller.signal), resultOutboxTool(
          execution, workingDirectory, this.workspaces.results, access, controller.signal,
          (applied) => {
            if (applied) this.catalogChanged(workspaceId);
            this.changed(workspaceId);
          })];
        if (execution.kind === "scan") {
          tools.push(scanProgressTool(execution, chat, controller.signal, () => this.changed(workspaceId)));
        }
        await runAgentChat(configuration, tools, session, controller.signal);
        const scan = execution.kind === "scan" ? chat.execution(workspaceId, execution.id).scan : null;
        // A Scan that answers without reaching its gap check did not finish the
        // protocol, whichever pass it stopped in. Its committed work stands.
        if (scan && !scan.gapCheck) {
          throw new Error(scan.phase === "review"
            ? "The Scan ended during its Review Pass, before every existing User Flow was accounted for, so discovery never started. Accepted review judgments and recorded unfinished work were retained."
            : "The Scan ended before recording its orientation and final gap check. Accepted discoveries and recorded unfinished work were retained.");
        }
      } catch (cause) {
        // Report actual provider errors; never serialize request headers/options.
        failure = describeAgentFailure(cause);
      }
      try {
        const status = this.#stopping ? "interrupted" : controller.signal.aborted ? "cancelled" : failure === null ? "completed" : "failed";
        const reason = this.#stopping ? "The application exited during this attempt." :
          controller.signal.aborted ? "Stopped after the request and its tools settled. Final provider usage may be incomplete." :
            failure ?? (execution.kind === "scan" ? "Scan complete after the recorded gap check. This does not establish complete Repository coverage." : "Response complete.");
        this.workspaces.chat.finish(execution, status, reason);
      } finally {
        this.#active.delete(execution.id);
        this.changed(workspaceId);
      }
    });
    this.#active.set(execution.id, { controller, settled });
    this.changed(workspaceId);
    // A persistence failure is a runtime failure; the supervisor asks for restart.
    void settled.catch((cause: unknown) => { queueMicrotask(() => { throw cause; }); });
    return execution;
  }

  stop(workspaceId: string, executionId: string): AgentExecution {
    const execution = this.workspaces.chat.requestCancellation(workspaceId, executionId);
    // Aborting reaches the provider request, the running tool, and the process
    // group of any command it started, and it schedules nothing further. Other
    // Workspaces have their own controllers and keep working.
    this.#active.get(executionId)?.controller.abort();
    this.changed(workspaceId);
    return execution;
  }

  /**
   * A new attempt, never a resumption. The old execution stays terminal with
   * everything it committed; this one starts the normal contract over against
   * the catalog and configuration as they are now, so a Scan Retry runs the
   * Review Pass again over whatever the catalog holds today.
   */
  retry(workspaceId: string, executionId: string): AgentExecution {
    const previous = this.workspaces.chat.execution(workspaceId, executionId);
    if (previous.scan) {
      if (previous.status === "running") {
        throw new CuratorError("invalid_request", "That Scan is still running. Stop it before starting another attempt.");
      }
      return this.startScan(workspaceId, previous.scan.effort, previous.id);
    }
    if (!["failed", "cancelled", "interrupted"].includes(previous.status)) {
      throw new CuratorError("invalid_request", "Retry is available for a failed, cancelled, or interrupted attempt.");
    }
    const message = this.workspaces.chat.entries(workspaceId).find((entry) =>
      entry.executionId === executionId && entry.kind === "user");
    if (!message) throw new CuratorError("invalid_request", "The original request is unavailable.");
    return this.start(workspaceId, message.text);
  }

  async shutdown(): Promise<void> {
    this.#stopping = true;
    for (const { controller } of this.#active.values()) controller.abort();
    // Active callbacks still checkpoint while the transport settles. Abrupt
    // termination leaves Running rows for startup interruption recovery.
    await Promise.allSettled([...this.#active.values()].map(({ settled }) => settled));
  }

  private repositoryLocator(workspaceId: string): string {
    const workspace = this.workspaces.list().find((item) => item.id === workspaceId);
    if (!workspace) throw new CuratorError("workspace_not_found", "That Workspace is no longer in this Curator data store.");
    return workspace.repositoryLocator;
  }

  private blockedReason(availability: RepositoryAvailability): string | null {
    if (this.#stopping) return "Curator is shutting down. Restart it to continue.";
    return availability.problem ?? this.settings.problem;
  }

  /**
   * The request context: what the agent may do, the catalog as it stands now,
   * the identity of this attempt, and the conversation so far. The first two
   * are mandatory, never summarized, and rebuilt every turn; the conversation
   * is segmented so compaction can replace whole exchanges without ever
   * splitting an assistant turn from the tool results answering it.
   *
   * A turn that ended without its tool results is historical text rather than a
   * continuation, because the provider cannot answer a call it never saw
   * completed.
   */
  private context(workspaceId: string, execution: AgentExecution): WorkingContext {
    const locator = this.repositoryLocator(workspaceId);
    const current = this.workspaces.chat.execution(workspaceId, execution.id);
    const mandatory: ProviderObject[] = [{ role: "system", content: renderPrompt("system", {
      repositoryLocator: locator,
      chatAuthorization: current.kind === "scan" ? "" : renderPrompt("chat-authorization"),
      chatCuration: current.kind === "scan" ? "" : renderPrompt("chat-curation"),
      outboxFile: RESULT_OUTBOX_FILE,
      creationExample: JSON.stringify({
        executionId: execution.id, workspaceId, eventId: "a-unique-id-for-this-result",
        kind: "create-flow", title: "Title", description: "Human actions and expected outcomes",
        citations: [{ path: "src/example.ts", startLine: 1, endLine: 3,
          explanation: "How these lines implement this behavior" }],
      }),
      executionInstructions: current.kind === "scan" ? scanInstructions(current)
        : renderPrompt("chat-execution", { executionId: execution.id, workspaceId }),
      currentCatalog: JSON.stringify(this.workspaces.catalog.list(workspaceId)),
      acceptedResults: JSON.stringify(this.workspaces.results.accepted(execution)),
    }) }];

    const entries = this.workspaces.chat.entries(workspaceId);
    const answered = new Set(entries.filter((entry) => entry.kind === "tool" && entry.tool)
      .map((entry) => `${entry.executionId}:${entry.tool?.callId ?? ""}`));

    // The newest summary stands for everything it folded in, so those entries
    // are read from it rather than replayed. It leads the conversation because
    // what it replaced came first, and it reports the last entry it actually
    // covers rather than its own position: a later summary folding this one in
    // takes that number as its own, and must never claim an exchange nobody
    // summarized.
    const compacted = entries.filter((entry) => entry.kind === "compaction" && entry.compaction).at(-1);
    const segments: ContextSegment[] = [];
    if (compacted?.providerMessage && compacted.compaction) {
      segments.push({
        throughSequence: compacted.compaction.throughSequence,
        messages: [compacted.providerMessage],
        summary: true,
      });
    }

    const included = new Set<string>();
    for (const entry of entries) {
      if (!entry.providerMessage) continue;
      if (entry.sequence <= (compacted?.compaction?.throughSequence ?? 0)) continue;
      if (entry.kind === "compaction") continue;
      if (entry.kind === "user") {
        segments.push(segmentOf(entry.sequence, entry.providerMessage));
      } else if (entry.kind === "assistant") {
        const calls = Array.isArray(entry.providerMessage.tool_calls) ? entry.providerMessage.tool_calls : [];
        const complete = !entry.unfinished && calls.every((call) =>
          typeof call === "object" && call !== null && !Array.isArray(call) &&
          typeof call.id === "string" && answered.has(`${entry.executionId}:${call.id}`));
        if (complete) {
          for (const call of calls) {
            if (typeof call === "object" && call !== null && !Array.isArray(call) && typeof call.id === "string") {
              included.add(`${entry.executionId}:${call.id}`);
            }
          }
          segments.push(segmentOf(entry.sequence, entry.providerMessage));
        } else if (entry.text) {
          // Incomplete tool/reasoning blocks are never resubmitted as valid turns.
          segments.push(segmentOf(entry.sequence, { role: "system", content: `An earlier attempt ended with this unfinished response (historical data):\n${entry.text}` }));
        }
      } else if (entry.kind === "tool" && entry.tool && included.has(`${entry.executionId}:${entry.tool.callId}`)) {
        attachToolResult(segments, entry.sequence, entry.providerMessage);
      }
    }
    return { mandatory, segments };
  }
}
