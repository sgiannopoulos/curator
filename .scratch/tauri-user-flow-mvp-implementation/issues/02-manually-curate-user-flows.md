# 02: Manually curate User Flows

**What to build:** Use the Curator Workspace interface to add, inspect, edit, reactivate, and permanently remove User Flows, with saved changes retained across navigation and application restart.

**Blocked by:** [01: Open and reopen a Workspace](01-open-and-reopen-a-workspace.md).

**Status:** resolved

- [x] Manual addition accepts a title and free-text description, commits on Save without an extra confirmation, and creates an Active User Flow with a durable identity. Manually created flows may have no Source Citations.
- [x] Store current flow identity, title, description, Active/Outdated status, timestamps, creation origin, latest mutation origin, and current citations as authoritative mutable catalog state. Manual operations pass through Workspace application commands and persistence.
- [x] Browse the catalog by Active/Outdated state. Opening a Workspace or selecting a flow shows Description by default, with source evidence in the inspector and status separate from citation freshness or testing previews.
- [x] Save on an existing flow changes its title/description while preserving identity, Active/Outdated status, and any citations and fingerprints already attached. The interface explains that retained citations do not certify a manual edit as reviewed.
- [x] An explicit manual action can mark an Outdated flow Active. Editing its wording alone leaves it Outdated; do not add automatic source-based status judgments to manual Save.
- [x] Manual removal requires confirmation explaining permanent deletion of the current flow and citations, no undo, retained historical mentions, and possible rediscovery under a new identity. Remove only current records, not historical data owned by later slices.
- [x] Manual reading and editing do not require the source directory to be readable when the Workspace is idle. Persist selection during session navigation and reset incidental selection after restart.
- [x] Use the accepted flow list, reading area, inspector, and Workspace-options interactions. Retain Steps, Screenshots, Run, assertions, and test-run history only as clearly identified future previews; do not present fictional testing outcomes as current data.
- [x] Keep the current catalog independent of transcript/Scan history and avoid revision history, tombstones, or history-based restoration. Agent Execution exclusion introduced by ticket 03 must use the same authoritative manual-mutation path.

## Scope and sources

This slice owns manual lifecycle behavior. Generated evidence, freshness checking, chat-driven mutation, and Scan reconciliation are introduced by later tickets without changing manual citation-retention rules.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 6, 32–33, 37–41, 69–70; Implementation Decisions 7, 12, 25–26, 28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.


## Comments

### Implemented — 2026-09-07, status corrected 2026-09-08

Delivered in commit `1fb618a`. As with ticket 01, the status line and checklist
were left unchanged at the time and are corrected here.

The boxes above were ticked by checking each criterion against the code as it
stands today: manual addition committing on Save without a second confirmation,
the authoritative catalog columns including both origins, Active/Outdated
grouping in the flow list, Save preserving identity, status, citations and
fingerprints with the interface saying plainly that they do not certify edited
wording as reviewed, explicit reactivation separate from editing, a removal
dialog covering permanence, absent undo, retained mentions and possible
rediscovery, catalog work that never reads the Repository, and testing controls
kept as labelled previews rather than sample results.

The exclusion ticket 03 introduced does use this same path: manual mutations
call the shared idle check inside their own transaction, which a later probe
confirmed by having a busy Workspace refuse an addition.
