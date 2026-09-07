# 11: Inspect Scan history and retry an attempt

**What to build:** Browse retained Scan attempts and their results, evidence, activity, conversation, and terminal outcomes, then explicitly retry a finished attempt as a new Scan against the current catalog.

**Blocked by:** [10: Review existing User Flows before discovery](10-review-existing-user-flows-before-discovery.md).

**Status:** ready-for-agent

- [ ] Provide Workspace Scan history through the accepted Workspace-options interface, distinct from future test-run history. Read persisted Scan Records through application commands and display them after application restart.
- [ ] Show effort, timestamps, actual model, lifecycle outcome/reason, accepted results, review accounting, activity ledger, recorded unfinished work, and available usage/cost for each retained attempt.
- [ ] Expose the associated entries within the Workspace's ongoing Agent Chat, preserving complete logical content, collapsed reasoning/compaction events, and checkpointed unfinished entries. Do not create separate Scan conversations or silently trim large historical content.
- [ ] Historical evidence and mentions remain inspectable when a current flow has been deleted or its citations replaced. Make their retained historical role clear without offering restoration, tombstones, or catalog reconstruction.
- [ ] An explicit Retry on a terminal attempt creates a new Agent Execution and linked Scan Record against the current catalog, retaining the chosen effort through the normal Scan start contract and using the current application-wide model configuration. The old attempt remains terminal.
- [ ] Retry obeys current Repository/configuration availability and busy-state exclusion. It runs the full applicable Review/Discovery protocol and does not resume a checkpoint, replay an old outbox, or automatically retry a failed transport request.
- [ ] Cancelled, Failed, and Interrupted records retain committed results, available transcript, and recorded unfinished work. Explain a Review Pass that ended before discovery without implying complete analysis.
- [ ] Display returned usage/cost once and identify unavailable/incomplete totals accurately. Never reconcile missing usage through extra provider calls or substitute zero for absent data.
- [ ] Opening history or reloading the UI catches up from persisted state without losing accepted results or changing active execution. History remains inspectable while work runs.
- [ ] Retain Scan history and Agent Chat indefinitely until Workspace deletion, with no per-Scan deletion, automatic retention limit, or test-run behavior.

## Scope and sources

Scan persistence and basic current outcomes exist in tickets 09–10. This slice makes historical inspection and linked retry a complete user journey; it is not a verification or diagnostics dashboard.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 31, 40–42, 50, 53–54, 58–65; Implementation Decisions 18–22, 25–26, 28–29. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

