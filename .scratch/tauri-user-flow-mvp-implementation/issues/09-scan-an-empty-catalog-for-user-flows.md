# 09: Scan an empty catalog for User Flows

**What to build:** Explicitly Scan an empty Workspace catalog at the selected Scanning Effort, observe source inspection, and read cited User Flows as they commit, with an honest retained record of the attempt and any unfinished work.

**Blocked by:** [05: Continue long conversations through compaction](05-continue-long-conversations-through-compaction.md); [06: Create cited User Flows through Agent Chat](06-create-cited-user-flows-through-agent-chat.md).

**Status:** ready-for-agent

- [ ] Expose an explicit Scan action with Standard selected by default and Quick/Standard/Maximum choices. Ordinary chat remains separate; a Scan appears in the existing Agent Chat and does not create another conversation.
- [ ] Create one Agent Execution of Scan kind and an associated durable Scan Record. Record Workspace, timestamps, effort, actual configured model, and lifecycle identity; internal model/tool turns and compaction keep that identity.
- [ ] Use the same tool/runtime machinery at every effort. Quick requests principal goals/happy paths with minor variants combined; Standard adds alternatives, validation, permission differences, and state changes; Maximum adds uncommon paths, edges, recovery, and materially distinct outcomes.
- [ ] Orient through relevant Repository artifacts and a broad path inventory, recording a short application description. An empty input catalog skips the Review Pass, enters Discovery Pass, and prompts for a gap check across identified actors/interfaces before normal completion.
- [ ] Require precision-first implementation-grounded behavior and supporting Source Citations for every discovered flow. The agent consolidates and semantically compares discoveries; do not add embeddings, fuzzy matching, unsupported speculation, confidence scores, or exhaustive-discovery claims.
- [ ] Apply new flows immediately through the shared validated outbox and atomic result contract, with Active status and Scan origin. Invalid events return repair feedback to the same active agent; duplicates do not create duplicate flows.
- [ ] Stream considered/read/excluded activity with explicit exclusion reasons and available grouped counts. Retain the activity ledger, accepted results, relevant Agent Chat associations, available usage/cost, terminal reason, and recorded unfinished work in the Scan Record.
- [ ] Scanning Effort changes prompts only, with no application time/token/cost/file/tool ceiling, budget UI, coverage percentage, model switch, automatic transport retry, or fallback.
- [ ] Keep manual mutations and new agent work disabled in the busy Workspace. Inspecting results and Stop remain available; other Workspaces run independently through the shared coordinator.
- [ ] Propagate Stop and failures through the existing execution/tool contract. Preserve already committed discoveries and checkpointed history; startup finalizes unfinished Scans as Interrupted and discards unapplied outboxes without resumption.
- [ ] Extend compaction's authoritative context with Scan phase, current catalog, and accepted-event accounting, preserving them outside summaries and retaining full original chat. Compaction failure remains terminal with retained results.
- [ ] Represent partial or unavailable provider usage honestly, including compaction. Completion and result counts do not assert complete Repository coverage; inference quality remains the user's judgment.

## Scope and sources

This slice is deliberately limited to an empty catalog at Scan start. Until ticket 10 adds the complete Review Pass, do not allow populated-catalog Scans to bypass that barrier, including a later attempt after partial discoveries. Basic current Scan outcome is visible here; the historical browser and linked Retry action are ticket 11.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 11–20, 29–31, 50–54, 58–65, 75; Implementation Decisions 8–11, 15–25, 27, 29. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

