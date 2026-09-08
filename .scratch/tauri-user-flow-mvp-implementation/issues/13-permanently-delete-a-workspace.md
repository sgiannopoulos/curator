# 13: Permanently delete a Workspace

**What to build:** Confirm permanent Workspace deletion and remove all of its application-owned catalog and history while leaving the analyzed Repository and application-wide configuration untouched.

**Blocked by:** [11: Inspect Scan history and retry an attempt](11-inspect-scan-history-and-retry-an-attempt.md).

**Status:** resolved

- [x] Expose permanent Workspace deletion from the Curator Workspace-options cog. Confirmation clearly describes the loss of current catalog, Agent Chat, Scan history, and associated execution data, with no trash, undo, or automatic restoration.
- [x] Disable deletion while the Workspace has an active Agent Execution and enforce that rule in the authoritative application path. An idle check only in frontend state is insufficient.
- [x] Purge current User Flows and citations/fingerprints, Agent Chat entries including partial/provider content, Scan Records and historical results, Agent Executions, accepted-result idempotency records, and associated application-owned working/outbox data.
- [x] Remove the Workspace association and recent-Workspace entry and return the UI to a valid remaining Workspace or the start page. Clear its incidental selection/drafts and ensure UI reload cannot resurrect deleted persisted state.
- [x] Preserve other Workspaces, their active executions, histories, and shared-store integrity. Shared runtime supervision and normal operation of other Workspaces continue.
- [x] Never delete or mutate the Repository, follow the Repository Locator as a deletion target, remove application-wide environment configuration, or reset the shared store to implement one-Workspace deletion.
- [x] Report an actual persistence or working-data cleanup failure without claiming a successful complete purge. Preserve the existing non-destructive error contract without adding a storage-recovery UI, backup system, or diagnostic tooling.
- [x] After successful deletion, reopening the Repository can create a new Workspace but cannot restore the old catalog/chat/history. User Flow-only deletion continues to retain history; Workspace deletion is the boundary that purges it.

## Scope and sources

The blocker supplies the full Workspace-owned history surface that must be removed. Relink and citation-freshness UI do not gate deletion; delete the current application's owned data without treating historical references or source locators as filesystem ownership.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 10, 40–42, 71–73; Implementation Decisions 18, 25–28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

## Comments

### Implemented — 2026-09-09

Workspace options now opens a permanent-deletion confirmation identifying the
catalog, evidence, entire Agent Chat, Scan history, executions/results, and
working files being removed. The Repository, application-wide configuration,
and other Workspaces are explicitly retained. Confirmation submits the typed
`workspace.remove` command; ordered Workspace-list publication follows commit.

The Workspace application checks persisted execution state and reserves the idle
Workspace against new executions, manual mutations, Relink, and another deletion.
Filesystem cleanup is asynchronous and targets only recorded execution identities
under the application working-data root, leaving other Workspaces able to run.
A short final transaction deletes the Workspace with existing foreign-key cascades
covering all retained data, including provider frames and accepted-result history
and idempotency. No schema change or shared-store reset is involved; the protocol
advances to 12 and storage remains at schema 8.

Cleanup precedes the database purge. Failure reports an incomplete deletion and
retains catalog/history and execution identities for another attempt. Working
files already removed cannot be rolled back. The reservation is released on both
success and failure. Successful deletion removes the Recent entry and returns to
the start page; list catch-up also clears deleted Workspace selections, drafts,
and panel state. The normal open path can create a new empty Workspace for that
Repository, with no old history available to restore it.

#### Standards review

No actionable findings. The changes follow the documented domain vocabulary and
existing command, transaction, error-handling, and dialog conventions. The final
asynchronous cleanup and per-Workspace reservation introduced no additional
documented-standard violations or material code smells.

#### Spec review

One P2 finding was corrected: initial synchronous recursive cleanup could stall
unrelated Workspaces. Cleanup now yields outside SQLite transactions while the
shared idle guard excludes writes and new execution only for the deleting
Workspace. Re-review confirmed the finding resolved with no new material findings.

Review totals: Standards 0; Spec 1 corrected, 0 remaining.

Validation: shared, runtime, and frontend TypeScript compilation passed during
implementation and after the concurrency correction. The final `pnpm build`
produced the native executable and Curator.app bundle; `git diff --check` passed.
No automated test suite is configured. The accepted diagnostics/verification
deferral remains in place, with no new suite, native behavioral probes, or paid
model requests. Compilation and static review do not establish behavioral proof.
