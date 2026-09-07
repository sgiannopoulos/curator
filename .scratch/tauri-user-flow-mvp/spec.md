# Local macOS User Flow MVP

Status: ready-for-agent

Source: [Decision map](map.md) · Specification synthesized 2026-09-07

## Problem Statement

Developers and QA engineers approaching an unfamiliar source Repository need to understand what its intended human users can do and what outcomes they should expect. Reading individual files does not provide a curated account of those behaviors, and a generated account loses value if users cannot inspect its evidence, correct it, or reconcile it with subsequent source changes.

They need a locally runnable macOS application that uses a hosted agent to infer source-grounded User Flows, keeps the Repository as the subject of analysis, and retains an editable catalog and the conversation that produced it. Inference quality remains a human judgment; neither a larger catalog nor a higher Scanning Effort proves completeness.

## Solution

Open a local Repository in a persistent Workspace. Run an explicit Scan at Quick, Standard, or Maximum effort, observe its work in the Workspace's ongoing Agent Chat, and inspect accepted User Flows as they arrive. Each generated User Flow describes human actions and expected outcomes in a title and free-text description, supported by Source Citations.

Use the accepted Curator design to browse Active and Outdated User Flows, read descriptions and evidence, save manual changes, or ask the agent to curate the catalog directly. Subsequent Scans review every existing flow before discovering more. Stop, failure, and application exit retain committed changes and available history; continuing afterward starts new execution against the current catalog.

Run the application from its checkout on the user's current Apple Silicon Mac. Store Workspace data outside the analyzed Repository and load application-wide OpenRouter Configuration from the application's root environment file. Deliver the agreed application behavior with diagnostics and verification explicitly deferred.

## User Stories

1. As a developer, I want to select a local Repository from the start page, so that I can begin understanding its user-facing behavior.
2. As a developer, I want to reopen recent Workspaces, so that I can return to their catalog, Agent Chat, and Scan history.
3. As a developer, I want selecting an already recognized Repository Locator to reopen its Workspace, so that I do not accidentally create duplicate catalogs for that location.
4. As a developer, I want Workspace names derived from Repository directories, so that I can recognize the source tree each Workspace analyzes.
5. As a developer, I want stored User Flows and history to remain accessible when a Repository is unavailable, so that a moved or disconnected directory does not hide my work.
6. As a QA engineer, I want to make manual catalog changes while the Repository is unavailable and no Agent Execution is active, so that I can continue curating known behavior.
7. As a developer, I want to explicitly Relink a moved Repository after confirming it is the same Repository, so that its Workspace identity and history survive the move.
8. As a developer, I want a Relink target already associated with another Workspace to open that Workspace, so that existing catalogs are not silently merged or reassigned.
9. As a developer, I want agent work disabled while its Repository or required configuration is unavailable, so that I can correct the prerequisite before starting work.
10. As a developer, I want Workspace data stored outside the analyzed Repository, so that catalog management does not add application data to my source tree.
11. As a developer, I want to start a Scan explicitly, so that an ordinary conversation message does not unexpectedly trigger full catalog review and discovery.
12. As a QA engineer, I want Standard Scanning Effort selected by default, so that the initial request covers meaningful alternatives as well as main paths.
13. As a QA engineer, I want Quick effort to focus on principal goals and happy paths while combining minor variants, so that I can request a concise first account.
14. As a QA engineer, I want Standard effort to include validation failures, permissions, alternatives, and state changes, so that I can inspect consequential variations.
15. As a QA engineer, I want Maximum effort to seek uncommon paths, edge cases, recovery, and materially distinct outcomes, so that I can request deeper analysis.
16. As a QA engineer, I want effort described as a request for detail without a coverage percentage, so that I do not mistake it for exhaustive discovery.
17. As a developer, I want a Scan to orient itself using the Repository's structure and relevant artifacts, so that analysis can work across unfamiliar languages and architectures.
18. As a QA engineer, I want generated User Flows to describe intended human-operated interfaces, including graphical and command-line surfaces, so that the catalog represents product behavior.
19. As a QA engineer, I want unsupported speculation omitted even at Maximum effort, so that every generated flow has an implementation basis I can inspect.
20. As a QA engineer, I want each generated User Flow to include source locations and explanations, so that I can judge the evidence supporting its actions and outcomes.
21. As a QA engineer, I want a Scan to review every existing Active and Outdated User Flow before discovering new ones, so that the retained catalog is considered systematically.
22. As a QA engineer, I want positively supported User Flows to become or remain Active with refreshed citations, so that the catalog reflects the latest accepted evidence.
23. As a QA engineer, I want positive contradiction to mark a flow Outdated without deleting its description, so that superseded behavior remains visible for review.
24. As a QA engineer, I want inconclusive review to explain its uncertainty and preserve current status and citations, so that incomplete inspection does not erase prior judgments.
25. As a QA engineer, I want Scans to preserve existing titles and descriptions, so that my editorial work is not silently rewritten.
26. As a QA engineer, I want materially changed behavior represented by an Outdated old flow and a new Active flow, so that the distinction remains visible.
27. As a QA engineer, I want deeper discovery evidence to correct an earlier review judgment, so that the agent can reactivate an existing flow instead of duplicating it.
28. As a QA engineer, I want ambiguous matches kept as separate new flows, so that uncertain matching cannot overwrite an existing flow.
29. As a developer, I want accepted results visible as they commit, so that I can inspect useful work before the Scan finishes.
30. As a developer, I want considered, read, and excluded files reported with exclusion reasons, so that I can understand the agent's observed inspection activity.
31. As a developer, I want the terminal reason and recorded unfinished work shown, so that I understand the limits of a completed or interrupted attempt.
32. As a QA engineer, I want to browse User Flows by their Active or Outdated state, so that I can distinguish retained superseded behavior from behavior currently treated as possible.
33. As a QA engineer, I want selecting a User Flow to open its Description with Source Citations alongside it, so that behavior and evidence are easy to review together.
34. As a QA engineer, I want citation paths, line ranges, explanations, and freshness displayed without a click action, so that I can read the evidence in the agreed MVP interface.
35. As a QA engineer, I want changed source files to make citations Stale and unreadable source locations to make them Unavailable, so that I can distinguish evidence freshness from flow status.
36. As a QA engineer, I want citation freshness changes to preserve the User Flow's status, so that a file change alone is not presented as proof that behavior disappeared.
37. As a QA engineer, I want to manually add a User Flow using a title and free-text description without supplying citations, so that I can record behavior I already know.
38. As a QA engineer, I want Save to commit manual edits while preserving identity, status, and citations, so that I can improve wording without implying a new source review.
39. As a QA engineer, I want to explicitly mark an Outdated User Flow Active, so that I can apply my own judgment about its current validity.
40. As a QA engineer, I want manual permanent removal to require confirmation explaining historical retention, so that I understand what is deleted and what remains.
41. As a QA engineer, I want to understand that a later Scan may rediscover deleted behavior under a new identity, so that deletion is not mistaken for a lasting exclusion rule.
42. As a developer, I want one ongoing Agent Chat per Workspace across Scans and restarts, so that questions, changes, and analysis share a continuous conversation.
43. As a developer, I want to ask questions without authorizing catalog changes, so that I can discuss behavior before requesting modifications.
44. As a QA engineer, I want explicit chat requests to authorize immediate additions, edits, deletions, and status changes, so that I can curate through conversation without per-change approval dialogs.
45. As a QA engineer, I want the agent to ask for clarification and yield when a requested change is ambiguous, so that I can identify the intended action before it proceeds.
46. As a QA engineer, I want wording-only agent edits to retain citations, so that editorial changes preserve the existing evidence record.
47. As a QA engineer, I want agent-created or materially changed behavior and agent status changes to carry fresh supporting citations, so that new judgments remain source-grounded.
48. As a QA engineer, I want inconclusive chat-driven reconsideration to leave the flow unchanged and explain why, so that uncertainty does not silently alter the catalog.
49. As a QA engineer, I want Generate a flow to compose a request into the existing Agent Chat for review and submission, so that I control when the request begins.
50. As a developer, I want to inspect results and history while an Agent Execution runs, so that ongoing work does not block reading.
51. As a developer, I want additional messages, manual mutations, and Scans disabled in a busy Workspace, so that concurrent requests cannot disrupt its current execution.
52. As a developer, I want Stop to cancel the current execution and settle its work before accepting another request, so that I can end an attempt deliberately.
53. As a developer, I want changes committed before cancellation or failure to remain, so that useful partial work is preserved.
54. As a developer, I want retries and later messages to start new Agent Executions against the current catalog, so that terminal work is never silently resumed or replayed.
55. As a developer, I want ordinary failure or Stop in one Workspace to leave another Workspace's work running, so that independent analysis stays independent.
56. As a developer, I want switching Workspaces to leave their work running while the app is open, so that navigation does not cancel analysis.
57. As a developer, I want shared runtime failure to identify its application-wide impact and require restart, so that I understand why multiple executions stopped.
58. As a developer, I want unfinished execution recorded as Interrupted after app exit, so that reopening shows committed results without continuing old work.
59. As a developer, I want ordered Agent Chat history including observable agent output, provider-returned reasoning, tools, result events, and failures, so that I can inspect how work proceeded.
60. As a developer, I want provider-returned reasoning and compaction details collapsed but inspectable, so that detailed records remain available without dominating the conversation.
61. As a developer, I want context compaction to retain the complete original conversation history, so that a long execution does not erase earlier evidence or activity.
62. As a developer, I want available partial streaming content retained after interruption and missed live events recoverable after UI reload, so that history reflects persisted progress.
63. As a developer, I want each Scan Record to retain its effort, actual model, accepted results, activity, outcome, and available usage, so that I can inspect previous attempts.
64. As a developer, I want missing provider usage or cost displayed as unavailable or incomplete, so that I do not mistake missing data for zero consumption.
65. As a developer, I want actionable provider errors without automatic retries or model substitutions, so that failed requests remain explicit and under my control.
66. As a developer, I want application-wide credentials and the exact model loaded at startup from the application's configuration, so that Repository selection does not change provider settings.
67. As a developer, I want missing provider configuration to leave stored data accessible, so that configuration issues do not block offline review and manual curation.
68. As a QA engineer, I want the flow list and Agent Chat independently collapsible and chat resizable, so that I can allocate reading space to the current activity.
69. As a QA engineer, I want selected flow, panel sizes, and unsent drafts retained during session navigation, so that switching views does not discard my immediate context.
70. As a QA engineer, I want testing and Git cloning controls clearly presented as future previews, so that I do not mistake design samples for executed tests or available functionality.
71. As a developer, I want Workspace deletion to purge its application-owned data after confirmation while preserving the Repository and application configuration, so that I can intentionally remove a catalog and its retained history.
72. As a developer, I want unsupported or unreadable storage reported without an automatic reset, so that a startup problem does not destroy stored work.
73. As a developer, I want development and compiled launch to share persisted Workspace data across rebuilds, so that local application development does not fragment my catalog.
74. As a developer, I want documented development, build, and compiled-start commands for my current Mac, so that I can run the MVP from its checkout.
75. As a QA engineer, I want to personally evaluate inference quality on unfamiliar Repositories, so that acceptance reflects useful and accurate behavior descriptions rather than a discovery-count target.

## Implementation Decisions

1. **Decision precedence.** Use the accepted answers linked in Further Notes and the domain glossary. Later configuration, chat, design, architecture, and development decisions supersede earlier research recommendations. Diagnostics and verification are deferred; earlier probe requirements are not implementation gates. The withdrawn handoff proposals do not establish a ticket breakdown.

2. **Desktop and runtime ownership.** Implement the Curator design in React, TypeScript, and Vite within Tauri. Rust owns native directory selection, desktop integration, process supervision, and frontend communication. One supervised local Node process owns TypeScript application logic and LangChain execution. This separation is module ownership, not filesystem confinement.

3. **Application interfaces.** Keep four modules behind typed application commands and ordered events:

   | Module | Owned behavior |
   | --- | --- |
   | Workspace application | Open, query, Relink, and delete Workspaces; read and manually mutate the catalog; read and checkpoint Agent Chat; validate and atomically apply result events; own persistence internally. |
   | Execution coordinator | Start and Stop Scan or ordinary chat execution; own identities, per-Workspace exclusion, Review Pass accounting, discovery gating, terminal transitions, and startup interruption recovery. |
   | Agent runtime | Run LangChain with supplied context and protocol; stream provider and tool activity; own OpenRouter adaptation and working-context compaction; accept injectable provider and tool dependencies. |
   | Repository access | Provide generic file and shell tools, citation-location and fingerprint checks, activity reporting, and cancellable operations. |

4. **Process contracts.** Bridge frontend commands and ordered events through Tauri to Node stdin/stdout. Share TypeScript schemas and validate messages at runtime. Correlate requests and replies; scope activity by Workspace and Agent Execution identity. Send process logs to stderr. On UI reload, recover from persisted state and ordered history rather than assuming every live notification arrived. The frontend never accesses SQLite directly or becomes a second catalog authority.

5. **Workspace recognition.** Give each Workspace a stable ID, normalized absolute Repository Locator, and timestamps; derive its display name from the directory. Recognize an existing association by exact normalized locator equality. Do not infer Repository identity from Git metadata, names, or filesystem IDs. Different contents at the same locator do not automatically create another Workspace. Relink requires directory selection and confirmation of identity. An already-associated target opens its existing Workspace and leaves the original unchanged.

6. **Unavailable Repository.** Keep stored catalog, Agent Chat, and Scan Records readable and permit manual catalog changes when idle. Disable hosted agent work until the Repository is available. Retain citations as Unavailable where appropriate. Relink preserves Workspace identity and data.

7. **Current catalog and lifecycle.** Store a User Flow's stable ID, title, free-text description, Active/Outdated status, current citations, timestamps, creation origin, and latest mutation origin. Origins distinguish manual, Scan, and agent-assisted changes without creating revision history. New flows are Active. Manual Save preserves existing identity, status, and citations; manual reactivation is explicit. Permanent removal deletes the current flow and citations, with no tombstone, trash, undo, or restoration. Rediscovery creates a new identity.

8. **Scanning Effort.** Standard is the default. Quick requests principal goals and happy paths with minor variants combined. Standard adds meaningful alternatives, validation failures, permission-dependent behavior, and state changes. Maximum adds uncommon paths, edge cases, recovery, and separation of materially different actions or outcomes. All use the same model and machinery with broad path inventory and agent-selected content reading. There is no completeness claim, coverage percentage, or application time, token, cost, file, or tool-call ceiling.

9. **Scan protocol.** A Scan is one Agent Execution across model turns and compaction. Orient to the Repository and record a short application description. If flows exist, review every input Active and Outdated identity as Supported, Contradicted, or Indeterminate. Validate complete accounting before permitting discovery; enforce this barrier in application state. An empty catalog skips the Review Pass. Discover against the resulting catalog, then prompt for a gap check across identified actors and interfaces before normal completion.

10. **Reconciliation.** Supported makes or keeps a flow Active and replaces its citations; Contradicted makes or keeps it Outdated and replaces citations. Both require supporting source evidence. Indeterminate requires an explanation and changes neither status nor citations. Each accepted judgment takes effect immediately. A Scan never rewrites existing titles or descriptions. Materially changed behavior retains an Outdated old flow and creates a new Active flow. Ambiguous matches create new flows. Discovery may submit evidence-backed corrections to earlier judgments. Semantic matching and deduplication belong to the agent, without application fuzzy matching or embeddings.

11. **Evidence contract.** Generated flows describe intended human use of a product interface, including web, graphical, command-line, administrator, operator, or developer surfaces where those people are product users. Internal service interactions and implementation-only paths are excluded. Require reachable behavior supported by implementation artifacts such as source, routes, templates, manifests, or authoritative runtime configuration. Tests and documentation may corroborate but cannot alone establish unimplemented behavior. Omit unresolved speculation. Every generated flow and determinate review includes at least one Repository-relative Source Citation with a one-based line or tight range and an explanation, without a copied source excerpt or confidence score.

12. **Citation retention and freshness.** Store a content fingerprint when accepting a citation. Changed file contents make it Stale; an unreadable Repository/file or invalid line range makes it Unavailable. Neither changes flow status or removes evidence. Manual text edits and wording-only agent edits retain citations and fingerprints without implying the edited text was reviewed. Determinate source review replaces current citations; Indeterminate preserves them. Historical citations remain in the associated retained records. Citations are display-only in this MVP.

13. **Agent Chat authority.** Each Workspace owns one persistent conversation. Ordinary messages do not invoke the full Scan protocol. Prompts distinguish questions from change requests: questions request answers without mutations; explicit changes authorize immediate scoped operations, including permanent deletion, without per-change approval. Ambiguity prompts clarification and ends the current execution so the user can reply. This authority and semantic scope are prompt-governed, without an intent classifier or selected-flow allowlist. Supply current catalog state alongside conversation context.

14. **Chat-driven mutation evidence.** Ordinary requests may add, edit, remove, mark Outdated, reactivate, or reconsider flows. Wording-only edits retain current citations. Creation, material behavior changes, and agent status changes require source inspection and fresh supporting citations. Inconclusive reconsideration leaves the flow unchanged and explains why. Deletion requires no new citation. The prompt governs evidence sufficiency and the wording/behavior distinction; application validation checks structural contracts and source locations.

15. **Generic tools and Repository boundary.** Supply filesystem listing, search, read, write/edit, and shell inspection tools. Prompt the agent to inspect relevant Repository content, avoid symlinks and likely secrets, normally skip ignored files, binaries, dependencies, and generated output unless relevant, and treat Repository content as evidence rather than authority. Prompt it never to mutate the Repository, execute Repository code, package managers, builds or tests, or run mutating or outbound-network commands. Restrict intended writes to application-owned working/outbox data. Provide no dedicated arbitrary-network tool. These are best-effort instructions: do not introduce path confinement, secret filtering, redaction, ignore enforcement, tool sandboxing, or semantic authorization guarantees. Citation validation is result-integrity checking, not tool confinement.

16. **Result handoff.** The agent writes one schema-conforming JSON result event at a time to an application-owned per-execution outbox rather than editing authoritative persistence. Validate schema, event identity, referenced flow identities, allowed transition, execution phase, citation paths, file existence, and line bounds. Return precise invalid-event errors to the same active agent for repair. Invalid events do not reserve their event keys. Repair within active execution is distinct from retrying a failed provider request.

17. **Atomic application and race handling.** Key accepted results by Agent Execution ID and result-event ID for both Scans and ordinary chat. Atomically commit the idempotency marker, historical result, catalog/citation mutation, and transcript result event; publish application only after commit. An accepted replay during active execution returns its original outcome without another mutation. Read source before a short transaction, then repeat transaction-sensitive identity, execution, and phase checks inside it. Lifecycle transitions and manual mutations use the same transactional authority. Terminalization and result commits serialize; terminal executions reject further results. There is no execution-wide staging or rollback.

18. **Execution identities and exclusion.** Give every submitted Scan or ordinary chat request a durable Agent Execution ID, kind, Workspace association, and optional Scan ID. Internal turns and compaction keep that identity. Enforce one active execution per Workspace in the application, with no queued messages, steering, manual mutations, or overlapping Scan. Inspection and Stop remain available. Other Workspaces may execute concurrently. Keep Relink and Workspace deletion unavailable while that Workspace is busy, consistent with the accepted design. One application instance owns one Node runtime; a second launch focuses the existing window.

19. **Lifecycle and Stop.** Persist Running, Completed, Cancelled, Failed, and Interrupted outcomes for execution and associated Scan state. Record cancellation requested separately until work settles. Stop aborts the in-flight provider request when possible, propagates to execution-owned tools and child processes, prevents further scheduling, and then records Cancelled. It does not promise provider-side billing cancellation. Ordinary model/tool failure ends that execution only, retaining committed changes and the actionable error. A user Retry creates a new execution; Scan Retry also creates a new Scan Record linked to the prior attempt and reviews the current catalog anew.

20. **Exit and runtime failure.** App shutdown stops new scheduling and supervises owned processes, checkpointing available content when possible. Parent-connection loss likewise stops Node and its tools. Runtime loss is an application-wide failure requiring restart; a hung runtime may require terminating the entire owned process tree, with the scope communicated. At startup, finalize remaining Running executions and Scans as Interrupted. Retain committed changes and checkpointed history; discard unapplied outboxes and never replay them. Committed events with leftover outbox files must not apply twice. Restart and UI navigation never resume terminal execution. No specific shutdown grace period or new window-close policy was accepted.

21. **Agent Chat fidelity.** Persist a typed, monotonically ordered sequence of complete logical entries, allowing transport chunk coalescing without silent content truncation. Include user messages, ordinary assistant content, every provider-returned reasoning item, ordered provider blocks, tool calls/arguments/outputs, file activity, accepted results, validation failures, compaction, and terminal events. Preserve opaque, encrypted, redacted, and unknown provider fields where returned and required for faithful continuation. Only returned reasoning is available. Checkpoint unfinished streaming content and retain it as unfinished after interruption. Reasoning details and compaction events are collapsed by default but inspectable. Scan Records associate entries with Scans within the shared conversation.

22. **Provider adaptation and usage.** Own OpenRouter adaptation inside LangChain, capturing complete logical provider payloads before display normalization and round-tripping required reasoning/tool blocks unchanged. Use or correct the stock adapter only insofar as it meets that contract; adapter compliance is not yet verified. Set zero transport retries, including summary requests, and no application model fallback. Record provider-returned usage and cost once per request, including compaction, aggregate available execution totals without double counting, and preserve unavailable/incomplete totals after failed or cancelled requests. Add no live cost meter, price estimation, or post-failure usage reconciliation.

23. **Working-context compaction.** Compact completed context using the same configured model while preserving the full original Agent Chat. Keep current catalog, execution identity, phase, Review Pass accounting, and accepted-event identities outside lossy summaries. Preserve active tool exchanges and required provider blocks intact. Replace working context only after successful summary generation and retain the actual summary as an event. Use bundled local context metadata where available, otherwise a conservative estimated-token trigger; size the full assembled request with response and required-state room. Exact constants remain implementation details. Compaction failure, actual context overflow, or inability to fit mandatory context ends execution clearly without automatic retry or silent truncation. New executions reconstruct valid context from persisted history and current state, without resuming old graph work.

24. **Agent loop policy.** Initially use LangChain's agent with an infinite recursion limit configured locally in Node. This is a source-supported candidate, not a proven unlimited configuration. If selected packages cannot meet the contract, use the already accepted alternative: an application-owned loop over LangChain model streaming and tool interfaces with the same execution identity and lifecycle. Choose that driver during implementation; do not add a runtime fallback after failure, a finite substitute ceiling, or fresh Scans to reset counters. Package probes remain deferred along with verification.

25. **Persistence and retention.** Use one app-private SQLite database owned through the Workspace application, accessed through the pinned Node runtime's built-in SQLite interface. Keep synchronous database operations short. Store authoritative mutable catalog state, citations, executions, Scan Records, complete Agent Chat, historical results, and idempotency records together. Scan Records retain timestamps, effort, actual model identifier, available usage/cost, review accounting, activity, accepted results, terminal reason, and recorded unfinished work. Neither Scan history nor Agent Chat reconstructs the catalog or restores deleted flows. Retain history indefinitely until Workspace deletion.

26. **Deletion and storage compatibility.** Manual User Flow deletion confirmation explains permanent current-record removal, retained historical mentions, and possible rediscovery. Workspace deletion confirmation covers purging its catalog, chat, Scan Records, executions, idempotency records, and application-owned working data while leaving the Repository and application configuration untouched. Use a versioned initial schema without a migration, backup, downgrade, or recovery framework. Unsupported or unreadable storage reports a non-destructive startup error identifying its location and never resets automatically. App-private storage has no application encryption; retain the design's explanatory storage note without introducing a Repository-safety consent flow or guarantee.

27. **Configuration and errors.** Load the required application-wide `OPENROUTER_API_KEY` and exact `OPENROUTER_MODEL` at process startup from the explicit application-root environment file, never the Repository or tool working directory. Provide a committed example configuration and ignore the real configuration. There is no implicit model default or per-Workspace/per-Scan override; changing values requires restart. Keep the credential out of frontend configuration and execution metadata. Missing values block hosted execution while stored data remains available. Discover authentication, model, credit, rate-limit, capability, and network failures on actual requests, with their actionable errors retained. Add no preflight, provider-policy/privacy controls, budgets, automatic retries, or fallbacks.

28. **Curator interaction baseline.** Use the accepted start page, recent Workspaces, folder selection, shared left-column flow list and Agent Chat, main reading area, inspector, and Workspace-options cog. Preserve independent panel minimization, accessible restoration, resizing, and Description-first flow selection. Generate a flow composes into and restores Agent Chat for user review and submission; it neither mutates directly nor attaches a selected flow. Preserve selected flow, panel sizes, and unsent drafts during session navigation, resetting incidental state after restart. Clearly distinguish future testing and cloning previews from live catalog status and source evidence. Prototype mock responses, fixture data, and scenario controls are not production behavior.

29. **Progress semantics.** Considered means a path was surfaced and evaluated for relevance; Read means some contents reached the agent; Excluded means it was explicitly skipped with a reason. Allow grouped exclusions and available counts. Unread is not automatically excluded. Combine tool telemetry and agent reports without implying complete tracking or a safety guarantee. Report terminal reason, accepted changes, and recorded unfinished work, including a Review Pass that ended before discovery.

30. **Local development contract.** Target the user's current Apple Silicon Mac, macOS 26.4 and Command Line Tools/SDK 26.2. Pin Node 24.20.0, pnpm 10.33.2, and Rust 1.98.1; pin application dependencies when selected and retain JavaScript and Cargo lockfiles. Use installed Node and built-in SQLite without bundling Node or provisioning a database server. Following dependency installation and application environment setup, expose `pnpm dev` for Vite within Tauri and its supervised runtime, `pnpm build` to compile frontend/runtime/native executable, and `pnpm start` for compiled checkout-based launch without Vite. Use an explicit checkout root for resources and configuration. Development and compiled launch share a stable application identifier and app-private Application Support data; rebuilds preserve it. Do not add doctor/check commands, diagnostic tooling, verification suites, or mandatory smoke/paid-model runs. Compilation is not proof of the behavioral contracts.

## Testing Decisions

- **Current scope:** diagnostics and verification are explicitly deferred by the accepted development contract. This specification creates no test suite, required verification run, paid-model gate, or requirement to approve new test seams. Product failure reporting, structural validation, and citation freshness remain required application behavior.
- **Previously accepted seam:** if testing is introduced later, prefer the typed application command and ordered-event boundary already accepted in the architecture. Exercise Workspace application and Execution coordinator together, including Agent runtime orchestration and Repository access behavior, through user-observable state and persisted outcomes. Use controlled provider/tool dependencies and isolated temporary storage behind that boundary instead of inventing extra public test interfaces.
- **Good tests:** submit a real application operation and assert visible committed state, ordered history, lifecycle, or failure behavior. Avoid assertions about helper calls, SQL layout, component internals, prompt wording, or implementation structure. Relevant deferred scenarios include complete review before discovery, current-state citation rules, accepted replay and rejected-event repair, cancellation/commit races, restart interruption, UI catch-up, and independent execution across Workspaces.
- **Provider and native boundaries:** the recorded provider-adapter and process-supervision probes remain deferred context because application-level substitutes alone cannot establish unchanged provider continuation, actual retry behavior, graph limits, or native child-process cleanup. They are not completed checks or additional gates for this phase.
- **Prior art:** the repository currently contains planning documents and mocked HTML/CSS/JavaScript prototypes, with no production application or automated application test suite. The Curator prototype has documented syntax and focused browser interaction checks for layout, composition, manual Save, and simulated busy states. Those are interaction references only; they do not validate persistence, OpenRouter integration, cancellation, or native behavior.
- **Human evaluation:** the user will personally assess inference quality on unfamiliar Repositories. Preserve the precision-first, source-cited behavior contract without adding reference-repository requirements, discovery-count targets, confidence scoring, or claims of exhaustive coverage. Any future automated checks must use temporary data isolated from the shared development/compiled store.

## Out of Scope

- Windows, Linux, broader macOS-version support, Intel/universal builds, independent Finder launch, bundled Node, signing, notarization, distribution, and automatic updates.
- Collaboration, accounts, authentication, cloud sync, hosted application backend, and a database service.
- Test generation or execution, flow export, implemented Git cloning, or functioning Steps, Screenshots, assertions, and test-run history beyond clearly identified future previews.
- Mutation of the analyzed Repository as an intended capability; programmatic filesystem confinement, secret filtering, redaction, prompt-injection enforcement, and guaranteed read-only tool behavior.
- Source viewers, citation dialogs, external-editor navigation, and any citation click action.
- Structured executable test cases, confidence scores, exhaustive-discovery promises, and coverage percentages.
- OpenRouter onboarding/configuration UI, model defaults or selection UI, capability or price preflight, spending controls, live cost meters, provider privacy policies, automatic transport retries, alternate-model fallbacks, and missing-usage reconciliation.
- Queued messages, steering, overlapping work within one Workspace, selected-flow attachments, separate curation conversations, and per-change agent approval or staging.
- Scan rewriting of existing flow text, catalog-wide rollback, User Flow revision history, trash, undo, tombstones, deletion suppression, and restoring deleted flows from history.
- Resuming terminal execution, background execution after app exit, automatic restart of failed work, or replaying unapplied outbox files on startup.
- Per-Scan deletion, automatic history trimming, application encryption, schema migration, automatic backups, downgrade support, storage-recovery UI, and automatic data reset.
- Custom Workspace names, manual Workspace ordering, automatic Repository identity inference or merging, and persistence of incidental layout/selection/drafts across restarts.
- Diagnostic tools, a verification suite, doctor/check commands, mandatory verification gates, and required smoke or paid-model runs for this phase.
- Application implementation, scaffolding, toolchain installation/upgrades, and implementation-ticket decomposition as part of this specification-writing task. Implementation slicing belongs to the separate to-tickets workflow.

## Further Notes

This specification synthesizes the resolved map and uses the [domain glossary](../../CONTEXT.md). It does not reopen the settled product decisions. The final handoff ticket's proposed compact replacement template and module-first ticket breakdown were withdrawn; this document follows the to-spec template, and no implementation tickets are created here.

The accepted behavior is ready to hand to an implementation agent, with the expressly deferred verification scope. Readiness does not assert that an application exists, that toolchain versions have been installed, or that provider/runtime contracts have been experimentally verified. Semantic inference quality, prompt adherence, unlimited-loop configuration, provider fidelity, and cancellation behavior retain the documented limits.

Canonical decisions and supporting assets:

| Subject | Source |
| --- | --- |
| Scanning Effort and coverage | [Decision 01](issues/01-define-scanning-effort-and-coverage.md) |
| User Flow lifecycle | [Decision 02](issues/02-define-user-flow-lifecycle.md) |
| Prompt-governed Repository boundary | [Decision 05](issues/05-define-repository-data-boundary.md) |
| Scan protocol, evidence, outbox, and activity | [Decision 06](issues/06-define-analysis-agent-architecture.md) |
| Application-wide OpenRouter Configuration | [Decision 07](issues/07-define-model-and-cost-controls.md) |
| Workspace, citations, persistence, and deletion | [Decision 08](issues/08-define-workspace-persistence.md) |
| Shared Agent Chat and ordinary curation | [Decision 09](issues/09-define-agent-assisted-curation.md) |
| Accepted Curator interactions | [Decision 10](issues/10-prototype-mvp-information-architecture.md), [prototype](prototype/curator/index.html), [design notes](prototype/curator/README.md) |
| Modules, Agent Execution, provider, and runtime contracts | [Decision 11](issues/11-choose-application-architecture.md) |
| Current Mac, pinned tools, SQLite, commands, and verification deferral | [Decision 12](issues/12-define-macos-development-contract.md) |
| Handoff workflow correction | [Decision ticket 13](issues/13-define-mvp-acceptance-specification.md#workflow-correction--2026-09-07) |
| LangChain/OpenRouter evidence and deferred probes | [Decision 14](issues/14-research-openrouter-agent-runtime.md), [runtime research](research/openrouter-agent-runtime.md) |

Earlier [OpenRouter research](research/openrouter-and-model-capabilities.md) and [Tauri research](research/tauri-macos-capabilities.md) remain background evidence. Their superseded model-default, preflight, Keychain, confinement, reconciliation, and in-process-runtime recommendations are not current implementation requirements.
