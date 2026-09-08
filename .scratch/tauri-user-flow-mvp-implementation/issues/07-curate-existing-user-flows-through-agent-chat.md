# 07: Curate existing User Flows through Agent Chat

**What to build:** Ask the agent to edit, reconsider, remove, mark Outdated, or reactivate existing User Flows and see the authorized changes committed directly with the appropriate evidence and retained conversation.

**Blocked by:** [06: Create cited User Flows through Agent Chat](06-create-cited-user-flows-through-agent-chat.md).

**Status:** resolved

- [x] Ordinary chat can authorize wording edits, material behavior changes, deletion, reconsideration, and Active/Outdated transitions on existing flow identities. Current catalog state is supplied with conversation context; stale chat descriptions are not a substitute for current state.
- [x] Prompt-governed authority distinguishes questions from change requests and limits changes to the explicitly requested scope. Ambiguity prompts clarification and yields before mutation; do not add an intent classifier, selected-flow attachment, allowlist, preview, or per-change approval.
- [x] Wording-only edits preserve current citations and fingerprints. Creation, material behavior changes, marking Outdated, and reactivation require source inspection and fresh supporting citations replacing the current evidence.
- [x] An inconclusive reconsideration leaves title, description, status, and citations unchanged and explains why. Evidence sufficiency and the wording/behavior distinction remain semantic prompt judgments, with structural result/location checks enforced by the application.
- [x] Use the same execution-scoped outbox, validation feedback, idempotency, atomic result/history/catalog/transcript commit, and terminal-state checks introduced for creation. Reject invalid referenced identities and transitions without reserving rejected event keys.
- [x] Edits keep the flow's durable identity, update timestamps/latest mutation origin, and appear immediately after commit. Unlike a Scan, an ordinary requested edit can rewrite an existing title or description.
- [x] Explicitly requested agent deletion permanently removes the current flow and citations without another confirmation and needs no new citation. Retain historical mentions/results in Agent Chat and associated records; they cannot restore the flow or suppress later rediscovery.
- [x] Manual edit and reactivation behavior remains distinct: manual Save preserves citations/status, and manual deletion still requires its confirmation. Busy-state exclusion prevents concurrent manual and agent changes.
- [x] Stopping or terminal failure retains all earlier committed edits and deletions without rollback. A subsequent request operates on the current catalog with a new Agent Execution identity.
- [x] Pass current catalog and accepted-event state through the shared continuation contract so compaction, when present, cannot erase authoritative mutation state.

## Scope and sources

This completes ordinary chat curation. Scan review later reuses validated status/evidence operations but must forbid Scan rewriting of existing text.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 22–24, 39–48, 53–54, 59; Implementation Decisions 7, 12–14, 16–17, 25–26. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

## Comments

### Implemented — 2026-09-08

Ordinary Agent Chat now accepts `edit-wording`, `edit-behavior`, `review-flow`,
and `delete-flow` events through the existing execution-owned outbox. Standing
instructions distinguish questions from authorized changes, require clarification
before ambiguous mutations, and keep current catalog and accepted-result state
outside summaries on every request.

Wording edits keep status, citations, and fingerprints. Behavior edits replace
evidence after source/location checks while preserving durable identity and
status. Supported/Contradicted review makes or keeps the flow Active/Outdated
with fresh evidence and unchanged text. Indeterminate review records its
explanation without changing any catalog fields or publishing a catalog change.
Invalid identities, unsupported judgments, missing evidence, and unexpected
mutation fields return repair feedback without reserving event identities.

Deletion removes the current flow and citations, retains its last snapshot in
the accepted result and Agent Chat, and needs no additional agent confirmation.
Replay returns the original outcome even after deletion. All changes use the
same short transaction for lifecycle checks, result identity/history, catalog,
citations, and transcript; publication follows commit. Manual Save, reactivation,
and confirmed deletion keep their separate behavior and busy exclusion.
Expanded chat results now describe recorded state and deletion snapshots rather
than incorrectly labeling every event as an Active creation.

Storage schema and bridge protocol are version 6 because the stored result
payloads now include additional event kinds. Under the no-migration contract,
version 1–5 stores are untouched and reported as unsupported.

Validation: repeated shared/runtime/frontend TypeScript compilation and full
`pnpm build`, including the native macOS executable and application bundle, passed.
Disposable local provider stubs exercised the compiled runtime's typed command
and ordered-event boundary with temporary storage: wording edits with unavailable
source, identity/origin retention, citation replacement, all review judgments,
rejected transitions and cross-Workspace identities, same-key repair and replay,
unchanged indeterminate results, current context after mutations, distinct manual
behavior, deletion history after restart, committed changes after failure and
Stop, new-identity rediscovery, and busy exclusion passed. The previous creation
checks also passed after the citation insertion refactor. No paid model request
or shared application store was used. No automated test suite is configured;
no verification suite or diagnostic command was added. Semantic prompt adherence
and native/provider integration remain within the specification's deferred
verification limits.

#### Standards review

The initial review found an optional duplication in citation construction.
Shared evidence insertion now constructs and persists accepted citations once.
The follow-up review found no remaining documented violations or baseline smells.

#### Spec review

The initial review found expanded chat results incorrectly described all accepted
events as Active creations. The result details now distinguish deletion snapshots
and use accurate acceptance-time status and citation wording. The follow-up review
found no remaining spec gaps or scope creep.

Review summary: Standards 0 remaining findings; Spec 0 remaining findings.
Both reviews used the staged implementation against starting commit `9a02d9e`.
