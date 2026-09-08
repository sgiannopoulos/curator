# 09: Scan an empty catalog for User Flows

**What to build:** Explicitly Scan an empty Workspace catalog at the selected Scanning Effort, observe source inspection, and read cited User Flows as they commit, with an honest retained record of the attempt and any unfinished work.

**Blocked by:** [05: Continue long conversations through compaction](05-continue-long-conversations-through-compaction.md); [06: Create cited User Flows through Agent Chat](06-create-cited-user-flows-through-agent-chat.md).

**Status:** resolved

- [x] Expose an explicit Scan action with Standard selected by default and Quick/Standard/Maximum choices. Ordinary chat remains separate; a Scan appears in the existing Agent Chat and does not create another conversation.
- [x] Create one Agent Execution of Scan kind and an associated durable Scan Record. Record Workspace, timestamps, effort, actual configured model, and lifecycle identity; internal model/tool turns and compaction keep that identity.
- [x] Use the same tool/runtime machinery at every effort. Quick requests principal goals/happy paths with minor variants combined; Standard adds alternatives, validation, permission differences, and state changes; Maximum adds uncommon paths, edges, recovery, and materially distinct outcomes.
- [x] Orient through relevant Repository artifacts and a broad path inventory, recording a short application description. An empty input catalog skips the Review Pass, enters Discovery Pass, and prompts for a gap check across identified actors/interfaces before normal completion.
- [x] Require precision-first implementation-grounded behavior and supporting Source Citations for every discovered flow. The agent consolidates and semantically compares discoveries; do not add embeddings, fuzzy matching, unsupported speculation, confidence scores, or exhaustive-discovery claims.
- [x] Apply new flows immediately through the shared validated outbox and atomic result contract, with Active status and Scan origin. Invalid events return repair feedback to the same active agent; duplicates do not create duplicate flows.
- [x] Stream considered/read/excluded activity with explicit exclusion reasons and available grouped counts. Retain the activity ledger, accepted results, relevant Agent Chat associations, available usage/cost, terminal reason, and recorded unfinished work in the Scan Record.
- [x] Scanning Effort changes prompts only, with no application time/token/cost/file/tool ceiling, budget UI, coverage percentage, model switch, automatic transport retry, or fallback.
- [x] Keep manual mutations and new agent work disabled in the busy Workspace. Inspecting results and Stop remain available; other Workspaces run independently through the shared coordinator.
- [x] Propagate Stop and failures through the existing execution/tool contract. Preserve already committed discoveries and checkpointed history; startup finalizes unfinished Scans as Interrupted and discards unapplied outboxes without resumption.
- [x] Extend compaction's authoritative context with Scan phase, current catalog, and accepted-event accounting, preserving them outside summaries and retaining full original chat. Compaction failure remains terminal with retained results.
- [x] Represent partial or unavailable provider usage honestly, including compaction. Completion and result counts do not assert complete Repository coverage; inference quality remains the user's judgment.

## Scope and sources

This slice is deliberately limited to an empty catalog at Scan start. Until ticket 10 adds the complete Review Pass, do not allow populated-catalog Scans to bypass that barrier, including a later attempt after partial discoveries. Basic current Scan outcome is visible here; the historical browser and linked Retry action are ticket 11.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 11–20, 29–31, 50–54, 58–65, 75; Implementation Decisions 8–11, 15–25, 27, 29. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.



## Comments

### Implemented — 2026-09-08

The Workspace now exposes an explicit Scan action with Standard selected by
default and Quick/Standard/Maximum guidance. It restores the existing Agent Chat
without consuming an unsent draft. `scan.start` enters the shared coordinator,
and the empty-catalog check and execution insertion happen in one transaction.
Populated catalogs, including catalogs retaining partial discoveries, cannot
start another Scan until ticket 10 implements the complete Review Pass. Ordinary
chat never becomes a Scan, and its Retry command rejects Scan identities; linked
Scan Retry remains ticket 11.

The Scan Record uses the durable execution's `scan` payload for effort,
orientation/discovery phase, initial empty-catalog accounting, application
description, identified actors/interfaces, gap check, and recorded unfinished
work. Lifecycle identity, Workspace, configured model, timestamps, usage,
activity, chat entries, and accepted results remain associated through the same
execution id and their existing persistence authorities. Nothing copies history
into current catalog state. The UI shows basic progress and terminal outcome in
the shared conversation, alongside streamed file activity and accepted results.
Expanded path details refresh as activity changes and include grouped counts.

The agent must record orientation before submitting discoveries. Discovery
acceptance permits only cited create-flow events, sets Active status and Scan
origin, and retains the existing structural validation, same-agent repair,
execution-scoped idempotency, and atomic catalog/result/chat transaction. Each
new accepted discovery invalidates any preceding gap check in that same
transaction; replay does not. A normal response without the required orientation
and final gap check ends as Failed with an actionable retained reason. Semantic
matching, evidence sufficiency, and precision remain agent judgments.

Effort affects prompt detail only. The coordinator, configured model, tools,
compaction, busy-state exclusion, Stop, and startup interruption are shared with
ordinary chat. Scan state, current catalog, and accepted result identities are
rebuilt as mandatory working context outside summaries. Compaction now begins a
checkpointed chat entry before requesting a summary, preserving available usage
and partial responses even when summary generation fails. Successful compaction
completes that same entry, so usage is counted once; failed/interrupted attempts
keep incomplete totals. Previously committed discoveries survive every terminal
outcome, and startup still discards unapplied working outboxes without resumption.

Bridge protocol is version 8 and storage schema is version 7 for the new command
and persisted Scan payload. Existing schema 1–6 stores are reported as unsupported
and left untouched, following the accepted no-migration contract. The application
README documents this boundary and the feature.

Validation: shared, runtime, and frontend TypeScript compilation passed, followed
by a full `pnpm build` producing the native executable and Curator.app bundle.
Runtime compilation passed again after the tool-schema review correction.
`git diff --check` passed. There is no configured automated test suite or individual
test file to run; none was introduced. No native behavior probe, paid-model
request, or shared-store mutation was performed. Compilation does not establish
provider fidelity or inference quality; diagnostics and verification remain deferred.

#### Standards review

No findings. The staged changes follow documented issue and domain conventions,
and no substantive baseline code smells were identified.

#### Spec review

The initial review identified a tool-schema compatibility risk: the Scan progress
report used a top-level discriminated union. The tool now accepts a strict root
object containing a typed `report`, matching the root-object shape of existing
tools, and its prompt/description name that argument. No other substantive gaps
were identified. The correction was re-reviewed before commit.

Review summary: Standards 0 remaining findings; Spec 0 remaining findings. The
two independent review agents examined the staged implementation against starting
commit `de7509d`.
