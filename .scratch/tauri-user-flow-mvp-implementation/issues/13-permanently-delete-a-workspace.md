# 13: Permanently delete a Workspace

**What to build:** Confirm permanent Workspace deletion and remove all of its application-owned catalog and history while leaving the analyzed Repository and application-wide configuration untouched.

**Blocked by:** [11: Inspect Scan history and retry an attempt](11-inspect-scan-history-and-retry-an-attempt.md).

**Status:** ready-for-agent

- [ ] Expose permanent Workspace deletion from the Curator Workspace-options cog. Confirmation clearly describes the loss of current catalog, Agent Chat, Scan history, and associated execution data, with no trash, undo, or automatic restoration.
- [ ] Disable deletion while the Workspace has an active Agent Execution and enforce that rule in the authoritative application path. An idle check only in frontend state is insufficient.
- [ ] Purge current User Flows and citations/fingerprints, Agent Chat entries including partial/provider content, Scan Records and historical results, Agent Executions, accepted-result idempotency records, and associated application-owned working/outbox data.
- [ ] Remove the Workspace association and recent-Workspace entry and return the UI to a valid remaining Workspace or the start page. Clear its incidental selection/drafts and ensure UI reload cannot resurrect deleted persisted state.
- [ ] Preserve other Workspaces, their active executions, histories, and shared-store integrity. Shared runtime supervision and normal operation of other Workspaces continue.
- [ ] Never delete or mutate the Repository, follow the Repository Locator as a deletion target, remove application-wide environment configuration, or reset the shared store to implement one-Workspace deletion.
- [ ] Report an actual persistence or working-data cleanup failure without claiming a successful complete purge. Preserve the existing non-destructive error contract without adding a storage-recovery UI, backup system, or diagnostic tooling.
- [ ] After successful deletion, reopening the Repository can create a new Workspace but cannot restore the old catalog/chat/history. User Flow-only deletion continues to retain history; Workspace deletion is the boundary that purges it.

## Scope and sources

The blocker supplies the full Workspace-owned history surface that must be removed. Relink and citation-freshness UI do not gate deletion; delete the current application's owned data without treating historical references or source locators as filesystem ownership.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 10, 40–42, 71–73; Implementation Decisions 18, 25–28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

