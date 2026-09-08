# User Flow MVP implementation tickets

Published 2026-09-07 after approval of the revised breakdown.

Canonical sources: [MVP specification](../tauri-user-flow-mvp/spec.md), [decision map](../tauri-user-flow-mvp/map.md), and [domain glossary](../../CONTEXT.md). These remain the product and architecture authority; this index does not duplicate or replace them.

Each ticket is a separate local issue marked `ready-for-agent`, with its own end-to-end behavior, acceptance criteria, and blocking edges. Ticket numbers in this effort refer to implementation tickets, independently of the earlier wayfinding decision numbers.

| Implementation ticket | Blocked by |
| --- | --- |
| [01: Open and reopen a Workspace](issues/01-open-and-reopen-a-workspace.md) | None |
| [02: Manually curate User Flows](issues/02-manually-curate-user-flows.md) | 01 |
| [03: Hold a persistent Agent Chat](issues/03-hold-a-persistent-agent-chat.md) | 02 |
| [04: Ask source-grounded Repository questions](issues/04-ask-source-grounded-repository-questions.md) | 03 |
| [05: Continue long conversations through compaction](issues/05-continue-long-conversations-through-compaction.md) | 04 |
| [06: Create cited User Flows through Agent Chat](issues/06-create-cited-user-flows-through-agent-chat.md) | 04 |
| [07: Curate existing User Flows through Agent Chat](issues/07-curate-existing-user-flows-through-agent-chat.md) | 06 |
| [08: Show Source Citation freshness](issues/08-show-source-citation-freshness.md) | 06 |
| [09: Scan an empty catalog for User Flows](issues/09-scan-an-empty-catalog-for-user-flows.md) | 05, 06 |
| [10: Review existing User Flows before discovery](issues/10-review-existing-user-flows-before-discovery.md) | 07, 09 |
| [11: Inspect Scan history and retry an attempt](issues/11-inspect-scan-history-and-retry-an-attempt.md) | 10 |
| [12: Handle unavailable Repositories and Relink](issues/12-handle-unavailable-repositories-and-relink.md) | 02 |
| [13: Permanently delete a Workspace](issues/13-permanently-delete-a-workspace.md) | 11 |

## Execution order

Implementation progress: tickets 01 through 09 are implemented and resolved.
Tickets 01 through 05 landed in commits `a17d36d`, `1fb618a`, `e892238`, `a78231c` and `60a9a4a`. Tickets 01 and
02 were resolved after the fact, by checking their criteria against the shipped
code; each records that in its comments. Ticket 06 adds cited creation through Agent Chat,
atomic result acceptance, and the Generate a flow composer. Ticket 07 extends that
path to wording and behavior edits, source review and status changes, and permanent
deletion through Agent Chat. Ticket 08 reads each accepted citation against the
current Repository and reports it Unchanged, Stale, or Unavailable without touching
the flow's status. Ticket 09 adds explicit empty-catalog Scans at Quick, Standard,
and Maximum effort, with durable orientation/discovery progress, immediate cited
results, and a recorded gap check. Tickets 10 (Review Pass before discovery) and
12 (unavailable Repositories and Relink) are the next available slices.

Work an uncompleted ticket only when all its blockers are complete; among available tickets, prefer the lowest number. Initially, [01: Open and reopen a Workspace](issues/01-open-and-reopen-a-workspace.md) is the only unblocked ticket.

The approved revision moves Agent Chat into position 03 and unavailable-Repository/Relink handling into position 12. Relink depends only on ticket 02: its later number expresses lower priority, not a new dependency on agent or Scan work. Workspace deletion remains ticket 13 and depends on the completed Scan-history path.

Branches can proceed independently when their blockers are complete: compaction and cited creation after Repository questions; existing-flow curation and citation freshness after cited creation. A `ready-for-agent` status does not override unmet blockers.

## Scope carried into every ticket

- Implement each feature through the existing typed application commands and ordered events, extending the accepted Workspace application, Execution coordinator, Agent runtime, and Repository access ownership. There is no existing production application to prefactor; begin with a narrow working Workspace path.
- Use the accepted Curator design as each feature arrives. Future testing and cloning previews must remain clearly identified, and prototype mocks/scenario controls are not production behavior.
- Preserve application-owned current catalog state, complete persistent Agent Chat, execution-scoped idempotency, per-result atomicity, per-Workspace exclusion, and terminal interruption as each relevant slice introduces them. Extend shared contracts rather than creating alternate catalog or lifecycle authorities.
- Diagnostics and verification are deferred. Acceptance criteria describe intended behavior, not an added verification suite or mandatory native/provider probe gate. Normal compilation remains part of the local build contract, and compilation alone is not behavioral proof.
- Repository safety and semantic authorization retain the agreed prompt-governed limits. Do not revive superseded preflight, retry, fallback, confinement, spending-control, or source-navigation requirements from older research.
- This publication creates implementation tickets only. It does not start application implementation, run paid model requests, change installed tools, or close or modify the source spec, map, or decision tickets.
