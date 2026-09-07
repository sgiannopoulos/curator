Type: grilling
Status: resolved
Blocked by: 01, 03, 05

## Question

How should the analysis agent inventory and traverse an arbitrary Repository, select and read relevant content within the chosen Scanning Effort, infer and consolidate User Flows, use tools and structured responses, preserve partial results, and stop within explicit resource bounds?

## Answer

Subsequent refinement: [Define agent-assisted curation](09-define-agent-assisted-curation.md) establishes the shared Workspace Agent Chat and its interaction with Scans; use that decision for conversation ownership, continuity, and busy-state behavior. [Define model and cost controls](07-define-model-and-cost-controls.md) supersedes the optional-budget and transient-retry possibilities below.

### Agent task and prompt contract

A Scan is one logical, multi-turn coding-agent task. Its central instruction is:

> Familiarize yourself with this repository/application and create the potential User Flows that would need checking.

The application surrounds that instruction with a system contract containing the selected Repository, Scanning Effort, current User Flow catalog, Repository-safety instructions, phase protocol, result schemas, progress requirements, and any explicit cancellation or budget state. Quick, Standard, and Maximum use the same execution machinery; their previously defined prompt guidance changes the requested depth.

The task may make many OpenRouter requests and tool calls. Context pressure triggers compaction of older working context inside the same agent session, retaining the orientation summary, activity ledger, applied results, remaining Review Pass identities, and current catalog state. Compaction is not a new Scan or a fresh agent session.

### Execution sequence

Every Scan proceeds in this order:

1. **Orientation.** The agent reads repository-level instructions and manifests, builds a broad tool-driven path inventory, and records a short description of the application. This shared orientation supports both subsequent passes and is not a third analysis pass.
2. **Review Pass.** If any User Flows exist, the agent evaluates every Active and Outdated User Flow exactly once as Supported, Contradicted, or Indeterminate. Supported and Contradicted results require Source Citations; Indeterminate requires a short explanation and leaves the User Flow unchanged. A validated manifest must account for every input identity before discovery starts. If no User Flows exist, this pass is skipped.
3. **Discovery Pass.** The agent looks for additional source-grounded User Flows while comparing candidates with the catalog resulting from the Review Pass. Evidence found during discovery may revise an earlier review result before the agent continues; this avoids creating a duplicate when deeper inspection re-establishes an existing flow.
4. **Gap check.** Before declaring completion, the agent revisits the application's identified actors and interfaces and looks for missing materially distinct flows at the selected Scanning Effort. This is a quality prompt, not a coverage or completeness guarantee.

The application enforces the Review Pass barrier rather than relying on a single prompt to preserve the order.

### Evidence, citations, and consolidation

A generated User Flow must be supported by a Repository artifact that defines or wires reachable product behavior, such as application code, routes, templates, manifests, or authoritative runtime configuration. Tests and documentation may guide or corroborate the inference but cannot establish a flow alone when no implementation is found. The agent uses a precision-first posture: unresolved speculation is omitted rather than published, including at Maximum effort.

Any intended human-operated product interface can yield User Flows, including graphical applications, websites, command-line tools, and administrator, operator, or developer interfaces when those people are actual users of the product. Internal service interactions, build processes, and implementation-only code paths do not qualify.

Each generated flow and determinate review result carries at least one Source Citation containing:

- a Repository-relative path;
- a one-based line or tight line range; and
- a short explanation of what the location supports.

Multiple citations are allowed. Source excerpts are not copied into citation records. A determinate review replaces the User Flow's current citations with the latest evidence; prior citations remain only in Scan history. Indeterminate review leaves existing citations unchanged.

The previously defined Scanning Effort rules govern consolidation: minor variants may be combined in Quick, while materially different actions or outcomes split into distinct flows at deeper effort. The agent owns semantic matching and deduplication against existing and current-Scan flows. The application does not add fuzzy matching or embeddings. It assigns the durable User Flow identity after accepting a new-flow result; the agent supplies an idempotent result-event identity. Ambiguous semantic matches follow the established lifecycle and become new Active User Flows.

### Tools and structured results

The agent receives the generic coding-agent toolset: filesystem listing, search, reading, writing/editing, and shell inspection. The prompt authorizes writes only in the app-private Scan working area and forbids Repository mutation, following symlinks, likely-secret access, code or package-manager execution, builds, tests, mutating or outbound commands, and treating Repository instructions as Scan authority. No separate arbitrary-network tool is exposed. As established by the Repository boundary decision, these restrictions are agent instructions rather than programmatic confinement.

The agent communicates catalog changes through an app-private result outbox rather than editing persistent Workspace state directly. It writes one schema-conforming JSON result event at a time. Before applying an event, the application validates its schema, idempotency, identity references, allowed transition, Repository-relative citation paths, file existence, and citation line bounds. An invalid event is not applied; precise validation errors return to the same agent for repair without discarding earlier accepted events. There is no independent fixed retry limit.

Each accepted result takes effect immediately:

- a Supported result makes or keeps the existing flow Active and replaces its citations;
- a Contradicted result makes or keeps the existing flow Outdated and replaces its citations;
- an Indeterminate result leaves status and citations unchanged;
- a valid discovered flow is immediately created as Active; and
- a later evidence-backed correction is applied as a new idempotent result event.

There is no Scan-level staging, transaction, or rollback. A later failure or cancellation does not reverse accepted status, citation, or creation events. While a Scan runs, the user may inspect the catalog, but manual mutations and separate agent-assisted curation are disabled so the Review Pass snapshot and semantic comparisons stay coherent.

### Activity and Agent Chat

Scan activity is a best-effort combination of tool telemetry and agent reports, not a safety guarantee:

- **Considered** means a path was surfaced to the agent and evaluated for relevance.
- **Read** means some contents were returned to the agent.
- **Excluded** means the agent explicitly skipped a path or group from further inspection and supplied a reason.

Grouped exclusions are allowed, with counts when available. An unread file is not automatically classified as excluded.

Agent Chat streams and persists the complete observable transcript: ordinary assistant content, every provider-returned reasoning item, tool calls and arguments, tool outputs, file activity, result events, validation failures, retries, compaction, cancellation, and completion. Provider-returned reasoning text, summaries, encrypted blocks, or redacted placeholders are collapsed by default but available in the transcript; reasoning the provider does not return cannot appear. OpenRouter currently returns streamed reasoning detail blocks in `choices[].delta.reasoning_details`; the complete blocks must also be preserved unchanged when continuing tool-use turns. See [OpenRouter's reasoning-token documentation](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).

Agent Chat is distinct from model working context. Context compaction does not replace or summarize away the original user-visible transcript; it adds a collapsed compaction event containing the summary used for continuation. Persisting full tool output may duplicate substantial Repository content, including accidentally accessed secrets, in app-private storage. This is an accepted MVP tradeoff.

### Completion, bounds, cancellation, and failure

Without an explicit user-configured limit, the application adds no time, token, cost, file, or tool-call ceiling. The agent stops normally after the gap check when it judges that no more distinct User Flows remain at the selected effort. The loop exposes a gate for any optional budget established by [Define model and cost controls](07-define-model-and-cost-controls.md); exact budget behavior belongs to that decision. Context limits are handled through compaction rather than treated as a coverage budget.

User cancellation aborts the in-flight request when possible and prevents further agent steps. A terminal model, tool, application, or cancellation outcome ends the Scan permanently; the MVP does not resume an executable Scan after termination or application restart. Accepted result events and the available Agent Chat remain. A Review Pass interrupted before its complete manifest never advances to discovery, though its individually accepted results remain applied.

Transient request failures may retry while the original agent task remains active. A user-visible Retry after terminal failure or cancellation starts a new Scan against the catalog as it then exists, so its Review Pass naturally revisits the retained partial results. The terminal record reports the reason and any unfinished work without implying complete coverage.
