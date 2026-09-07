# 06: Create cited User Flows through Agent Chat

**What to build:** Request a User Flow in Agent Chat and see a source-cited Active flow appear in the catalog as soon as its result is accepted, with committed changes retained if the execution later stops or fails.

**Blocked by:** [04: Ask source-grounded Repository questions](04-ask-source-grounded-repository-questions.md).

**Status:** ready-for-agent

- [ ] An explicitly submitted creation request authorizes source-grounded creation through the ongoing Workspace Agent Chat. Generate a flow composes a request, restores the composer when minimized, and lets the user review and send it; the modal does not directly mutate or create a separate conversation.
- [ ] Require every agent-created flow to describe reachable behavior for intended human users, with a title, free-text actions/outcomes, and at least one Repository-relative Source Citation containing one-based line or tight range and a supporting explanation.
- [ ] Prompt for precision over speculative quantity. Implementation artifacts must support behavior; tests and documentation can guide or corroborate but cannot alone establish an unimplemented flow. Do not require confidence scores or copied source excerpts.
- [ ] The agent writes one schema-conforming JSON result event at a time to a per-execution application-owned outbox rather than editing authoritative catalog storage. Validate schema, identity references, allowed result kind/transition, execution state, citation paths, source existence, and line bounds.
- [ ] Return precise rejected-event errors into the same active conversation for repair. Invalid events do not reserve result-event identities; repairs may reuse rejected identities. This is not an automatic retry of a failed model request.
- [ ] Key accepted events by Agent Execution ID and result-event ID. In one short transaction commit the accepted identity, historical result, current flow/citations, and transcript result event; publish the flow as applied only after commit.
- [ ] Assign a durable flow identity when accepting creation, set Active status and agent-assisted origin, and retain timestamps and citation content fingerprints. Display the new description and display-only citation locations/explanations in the existing catalog UI.
- [ ] An accepted replay while execution is active returns its original outcome without a duplicate mutation. Perform source reads before the short transaction and repeat transaction-sensitive identity/state checks inside it; serialize result acceptance with terminalization and manual-mutation exclusion.
- [ ] Cancellation or failure preserves committed creations and history. Terminal executions reject further events; startup discards unapplied outbox data and never reapplies leftover files belonging to already committed results.
- [ ] Current catalog state remains authoritative independently of historical results. A manually deleted flow may later be generated as a new identity; deletion does not create a suppression record.
- [ ] Expose current catalog and accepted-result identity state to working-context assembly. If compaction support is already present, it retains that state outside summaries; if it lands later, it consumes this same state contract.

## Scope and sources

This introduces the shared atomic result path that ordinary curation and Scans extend. Existing-flow mutation is ticket 07; live citation freshness is ticket 08. Partial committed results are never an execution-wide transaction or rollback.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 19–20, 29, 33–34, 44–45, 47, 49, 53–54, 59; Implementation Decisions 7, 11–17, 19–21, 25, 28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

