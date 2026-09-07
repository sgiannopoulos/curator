# 07: Curate existing User Flows through Agent Chat

**What to build:** Ask the agent to edit, reconsider, remove, mark Outdated, or reactivate existing User Flows and see the authorized changes committed directly with the appropriate evidence and retained conversation.

**Blocked by:** [06: Create cited User Flows through Agent Chat](06-create-cited-user-flows-through-agent-chat.md).

**Status:** ready-for-agent

- [ ] Ordinary chat can authorize wording edits, material behavior changes, deletion, reconsideration, and Active/Outdated transitions on existing flow identities. Current catalog state is supplied with conversation context; stale chat descriptions are not a substitute for current state.
- [ ] Prompt-governed authority distinguishes questions from change requests and limits changes to the explicitly requested scope. Ambiguity prompts clarification and yields before mutation; do not add an intent classifier, selected-flow attachment, allowlist, preview, or per-change approval.
- [ ] Wording-only edits preserve current citations and fingerprints. Creation, material behavior changes, marking Outdated, and reactivation require source inspection and fresh supporting citations replacing the current evidence.
- [ ] An inconclusive reconsideration leaves title, description, status, and citations unchanged and explains why. Evidence sufficiency and the wording/behavior distinction remain semantic prompt judgments, with structural result/location checks enforced by the application.
- [ ] Use the same execution-scoped outbox, validation feedback, idempotency, atomic result/history/catalog/transcript commit, and terminal-state checks introduced for creation. Reject invalid referenced identities and transitions without reserving rejected event keys.
- [ ] Edits keep the flow's durable identity, update timestamps/latest mutation origin, and appear immediately after commit. Unlike a Scan, an ordinary requested edit can rewrite an existing title or description.
- [ ] Explicitly requested agent deletion permanently removes the current flow and citations without another confirmation and needs no new citation. Retain historical mentions/results in Agent Chat and associated records; they cannot restore the flow or suppress later rediscovery.
- [ ] Manual edit and reactivation behavior remains distinct: manual Save preserves citations/status, and manual deletion still requires its confirmation. Busy-state exclusion prevents concurrent manual and agent changes.
- [ ] Stopping or terminal failure retains all earlier committed edits and deletions without rollback. A subsequent request operates on the current catalog with a new Agent Execution identity.
- [ ] Pass current catalog and accepted-event state through the shared continuation contract so compaction, when present, cannot erase authoritative mutation state.

## Scope and sources

This completes ordinary chat curation. Scan review later reuses validated status/evidence operations but must forbid Scan rewriting of existing text.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 22–24, 39–48, 53–54, 59; Implementation Decisions 7, 12–14, 16–17, 25–26. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

