# 06: Create cited User Flows through Agent Chat

**What to build:** Request a User Flow in Agent Chat and see a source-cited Active flow appear in the catalog as soon as its result is accepted, with committed changes retained if the execution later stops or fails.

**Blocked by:** [04: Ask source-grounded Repository questions](04-ask-source-grounded-repository-questions.md).

**Status:** resolved

- [x] An explicitly submitted creation request authorizes source-grounded creation through the ongoing Workspace Agent Chat. Generate a flow composes a request, restores the composer when minimized, and lets the user review and send it; the modal does not directly mutate or create a separate conversation.
- [x] Require every agent-created flow to describe reachable behavior for intended human users, with a title, free-text actions/outcomes, and at least one Repository-relative Source Citation containing one-based line or tight range and a supporting explanation.
- [x] Prompt for precision over speculative quantity. Implementation artifacts must support behavior; tests and documentation can guide or corroborate but cannot alone establish an unimplemented flow. Do not require confidence scores or copied source excerpts.
- [x] The agent writes one schema-conforming JSON result event at a time to a per-execution application-owned outbox rather than editing authoritative catalog storage. Validate schema, identity references, allowed result kind/transition, execution state, citation paths, source existence, and line bounds.
- [x] Return precise rejected-event errors into the same active conversation for repair. Invalid events do not reserve result-event identities; repairs may reuse rejected identities. This is not an automatic retry of a failed model request.
- [x] Key accepted events by Agent Execution ID and result-event ID. In one short transaction commit the accepted identity, historical result, current flow/citations, and transcript result event; publish the flow as applied only after commit.
- [x] Assign a durable flow identity when accepting creation, set Active status and agent-assisted origin, and retain timestamps and citation content fingerprints. Display the new description and display-only citation locations/explanations in the existing catalog UI.
- [x] An accepted replay while execution is active returns its original outcome without a duplicate mutation. Perform source reads before the short transaction and repeat transaction-sensitive identity/state checks inside it; serialize result acceptance with terminalization and manual-mutation exclusion.
- [x] Cancellation or failure preserves committed creations and history. Terminal executions reject further events; startup discards unapplied outbox data and never reapplies leftover files belonging to already committed results.
- [x] Current catalog state remains authoritative independently of historical results. A manually deleted flow may later be generated as a new identity; deletion does not create a suppression record.
- [x] Expose current catalog and accepted-result identity state to working-context assembly. If compaction support is already present, it retains that state outside summaries; if it lands later, it consumes this same state contract.

## Scope and sources

This introduces the shared atomic result path that ordinary curation and Scans extend. Existing-flow mutation is ticket 07; live citation freshness is ticket 08. Partial committed results are never an execution-wide transaction or rollback.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 19–20, 29, 33–34, 44–45, 47, 49, 53–54, 59; Implementation Decisions 7, 11–17, 19–21, 25, 28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

## Comments

### Implemented — 2026-09-08

Explicit Agent Chat creation requests now use a per-execution
`outbox/result.json` and `submit_result` handoff. Invalid schema, identities,
result kinds, citation paths, unreadable sources, or line ranges return precise
repair errors to the same conversation without reserving an event identity.
Source inspection and whole-file SHA-256 fingerprints precede the short
transaction. Acceptance repeats lifecycle and replay checks, then commits the
accepted identity, historical result, Active agent-assisted flow, citations, and
chat result together before publishing catalog changes.

Accepted replays return their original outcome. Cancellation and terminal
executions cannot apply further results; existing startup cleanup discards
outbox files without replaying them. Current catalog and accepted-result
identities are rebuilt into mandatory Working Context outside summaries.
Historical results retain their original flow snapshots independently of manual
deletion; a later creation receives a new identity.

Generate a flow composes into the ongoing Agent Chat, preserving an existing
unsent draft, restoring the minimized composer, and focusing it for review and
Send. The dialog does not start execution or attach the selected flow. Accepted
results and validation failures are visible in chat, while current descriptions
and display-only citations use the existing catalog UI.

Storage schema and bridge protocol are version 5. The new accepted-results
table requires a schema bump under the agreed no-migration contract. Existing
version 1–4 stores remain untouched and report unsupported; README documents it.

Validation: repeated shared/runtime/frontend TypeScript compilation and a full
`pnpm build`, including the native macOS application bundle, passed. A throwaway
local provider stub exercised the compiled runtime through its command and
ordered-event boundary with temporary storage: rejected citation bounds,
same-identity repair, single catalog publication, accepted replay, current
accepted identities in context, failure retention, restart cleanup, manual
deletion and new-identity rediscovery, busy exclusion, and Stop retention all
passed. No paid provider request or shared application data was used. There is
no configured automated test suite; no verification suite or diagnostic command
was added. Native/provider integration and semantic inference quality remain
subject to the specification's deferred verification limits.

#### Standards review

No documented standards violations or concrete baseline maintainability findings.

#### Spec review

No actionable findings or scope creep. Acceptance, replay, repair, cancellation,
startup recovery, context, and composition match ticket 06. Later curation and
citation-freshness work remains in tickets 07 and 08.

Review summary: Standards 0 findings; Spec 0 findings. Reviews used the staged
implementation against starting commit `f2f4aed` before the final commit.
