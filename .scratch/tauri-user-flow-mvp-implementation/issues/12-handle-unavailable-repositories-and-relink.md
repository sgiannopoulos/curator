# 12: Handle unavailable Repositories and Relink

**What to build:** Open a Workspace whose Repository has moved or become unavailable, continue using its retained data, and explicitly Relink it to a user-confirmed location without losing identity or merging Workspaces.

**Blocked by:** [02: Manually curate User Flows](02-manually-curate-user-flows.md).

**Status:** resolved

- [x] Opening a persisted Workspace does not require its Repository to be readable. Show an unavailable-Repository state while keeping stored User Flows and any existing Agent Chat/Scan Records accessible.
- [x] Allow idle manual catalog changes against stored data. Source unavailability does not erase flows, current evidence, or history and does not change Active/Outdated status.
- [x] Use the current Repository availability state to disable hosted Agent Executions, including ordinary chat and Scans when those features are present. Keep stored data usable independently of OpenRouter Configuration.
- [x] Relink offers native directory selection and explicit confirmation that the replacement is the same Repository. On confirmation, update only the locator association and appropriate Workspace timestamp while retaining its durable identity, catalog, history, and execution associations.
- [x] Normalize the selected absolute locator using the existing recognition contract. Do not infer identity from Git remotes, commits, names, directory contents, or filesystem IDs.
- [x] If the new locator already belongs to another Workspace, open that Workspace instead of relinking or merging, leaving the original Workspace unchanged.
- [x] Gate Relink on the same authoritative per-Workspace busy state used by Agent Execution when present, and reflect that state in Workspace options. A locator replacement cannot race an active execution's selected source.
- [x] Retained citations remain attached. Where citation freshness support is present, unavailable source displays Unavailable and subsequent checks use the current locator; relinking does not silently refresh evidence fingerprints or change flow status.
- [x] Persist the new locator for future reopening and recent-Workspace recognition. A different checkout or changed source at an unchanged locator still does not create a new Workspace automatically.

## Scope and sources

Approved as ticket 12 for later priority, with only ticket 02 as a true blocker. Preserve any conversation, Scan, and citation features already present; their absence does not justify adding blockers or scaffolding them here. No automatic Repository identity detection or Workspace merge is introduced.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 5–9, 35–36, 50; Implementation Decisions 5–6, 12, 18, 25, 28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.


## Comments

### Implemented — 2026-09-09

Unavailable Repositories now have a visible Workspace notice independent of
OpenRouter Configuration. The existing Agent Chat snapshot carries the current
source-access reading; reopening, focus, and Check again refresh it. Ordinary
chat, Scans, and Retry share the coordinator's fresh availability check at start.
Stored catalogs and history remain readable, and idle manual curation remains
available. Recognized locators also reopen stored data even when unreadable.

Workspace options and the unavailable notice offer Relink. Native directory
selection prepares a replacement; explicit same-Repository confirmation sends
`workspace.relink`. The application normalizes it through the existing locator
contract and checks the same persisted busy state as execution start inside the
locator-update transaction. An occupied locator opens its owning Workspace
without changing the original. Otherwise only the locator, derived display name,
and last-opened timestamp change; identity, catalog, citations, history, and
execution/result associations stay intact. Ordered events and command readback
update the open Workspace and Recent list.

Citation readings use the current locator and invalidate when it changes or
source availability changes. Unreadable Repository roots report Unavailable;
Relink never changes accepted evidence fingerprints or Active/Outdated status.
The bridge protocol advances to 11; storage remains at schema 8.

Validation: shared, runtime, and frontend TypeScript compilation passed, followed
by a full `pnpm build` producing the native executable and Curator.app bundle.
The final correction was followed by compilation and the full build again.
`git diff --check` passed. No automated test suite is configured; the accepted
diagnostics/verification deferral remains in place, with no new suite or
paid-model requests. Compilation does not establish behavioral correctness.

#### Standards review

No actionable findings. The staged changes follow the documented domain
vocabulary, local issue-tracker conventions, and runtime/shared/frontend
boundaries. Relink reuses the existing locator normalization and persisted
execution-state authority. Source availability is centralized without changing
retained evidence. No material baseline code smells identified.

#### Spec review

One finding addressed: directory validation originally preceded occupied-locator
recognition. A selected target that became unreadable before confirmation would
have been rejected rather than opening its existing Workspace. Source access is
now sampled before the transaction and required only after occupied-locator
recognition; the original Workspace's authoritative busy check still precedes
either outcome. Existing Workspaces open even when their source is unavailable.
No additional missing requirements or scope creep found.

Review summary: Standards 0 remaining findings; Spec 0 remaining findings.
Independent review agents examined the implementation against starting commit
`7a1b017`.
