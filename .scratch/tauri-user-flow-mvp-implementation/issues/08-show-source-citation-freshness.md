# 08: Show Source Citation freshness

**What to build:** Read a User Flow's citations and see when their referenced source has changed or become unreadable, without changing the flow's Active/Outdated judgment.

**Blocked by:** [06: Create cited User Flows through Agent Chat](06-create-cited-user-flows-through-agent-chat.md).

**Status:** resolved

- [x] Use each accepted citation's Repository-relative location and retained content fingerprint to evaluate freshness against the Workspace's current Repository Locator through Repository access and Workspace application queries.
- [x] Display paths, one-based lines/ranges, explanations, and freshness in the source inspector. Do not copy source excerpts or add a click action, source dialog/viewer, or external-editor navigation.
- [x] A changed file fingerprint makes its citation Stale. An unavailable Repository or file, an unreadable location, or a line range that no longer exists makes it Unavailable; unavailability is not treated as proof that behavior is contradicted.
- [x] Preserve the citation record, original accepted fingerprint, and flow status when reporting freshness. A transient unreadable source does not delete evidence or prevent inspecting the stored description.
- [x] Manual title/description edits and wording-only agent edits do not clear citations, replace their fingerprints, or independently mark them stale. Freshness reflects the source location rather than edited prose.
- [x] Fresh supporting evidence from a determinate agent judgment replaces current citations and their fingerprints through the existing atomic result path. Inconclusive reconsideration preserves existing evidence.
- [x] Freshness is recalculated from the current locator/source when evidence is inspected or refreshed, including after a source location becomes available again; do not freeze a transient Stale/Unavailable display as a flow lifecycle state.
- [x] Catalog inspection remains available during execution. Freshness observations cannot bypass result validation, mutate execution phase, or overwrite authoritative evidence accepted concurrently.

## Scope and sources

This slice adds citation freshness behavior, not source navigation, continuous filesystem monitoring requirements, semantic support scoring, or programmatic confinement. Relink remains a separate lower-priority slice.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 20, 33–36, 38, 46; Implementation Decisions 11–12, 28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.


## Comments

### Implemented — 2026-09-08

Selecting a User Flow now reads its Source Citations against the Workspace's
current Repository Locator. `catalog.freshness` is a new typed application
command: the Workspace application looks up the locator, the catalog hands over
each accepted citation with the content fingerprint the display contract omits,
and Repository access reads the location again. The reading is never stored, so
it is taken from current source every time evidence is inspected and whenever
**Check again** asks for another one — including after a location becomes
readable again. Nothing watches the filesystem.

A byte-for-byte match with the accepted fingerprint reads Unchanged. Changed
contents read Stale. An unreadable Repository, a missing file, a path that now
leads outside the Repository or is no longer a regular file, content with no
text lines, and a line range that no longer exists all read Unavailable, each
worded for the person reading the evidence rather than reusing the correction
`inspectCitations` hands the agent. Neither state touches the citation record,
its accepted fingerprint, or the flow's Active/Outdated status, and the stored
description stays readable throughout. Manual Save and wording-only agent edits
keep citations and fingerprints; only a determinate agent judgment replaces them,
through the existing atomic result path. The reading is a pure query with no
`requireIdle`, so catalog inspection stays available while an Agent Execution
runs, and it cannot reach result validation, execution phase, or persistence.

The transport now allows an asynchronous command handler, because reading the
Repository is not a store operation and must not hold the event loop against
streaming work; replies stay correlated by id. Bridge protocol is version 7 for
the added command. The storage schema is unchanged at version 6 — the citation
fingerprint was already persisted — so existing stores keep working.

`CONTEXT.md` gains a **Source Citation freshness** entry. The specification names
only Stale and Unavailable, so the third state needed a name; Unchanged was
chosen over "current" because Active and Outdated are the words for a User Flow's
own state, and the glossary's *Active User Flow* entry avoids "Current flow".

Validation: shared, runtime and frontend TypeScript compilation and a full
`pnpm build`, including the native macOS executable and application bundle,
passed. A disposable local provider stub drove the compiled runtime's typed
command and ordered-event boundary against temporary storage, with 43 checks
passing: cited creation, unchanged evidence, manual Save leaving evidence
unchanged, a changed file staling only its own citation, a vanished line range,
a missing file, binary content, a path that became a directory, restoration
reading unchanged again, an unavailable Repository with the catalog still
readable, an uncited flow, a reading taken while an execution was running with
manual mutation still blocked, wording-only agent edits retaining citation
identities and fingerprints, a determinate review replacing them, and freshness
recomputed after a restart. No paid model request and no shared application store
were used. No automated test suite is configured and none was added; diagnostics
and verification remain deferred.

#### Standards review

The first review found the label "current" colliding with the glossary's
*Active User Flow* `_Avoid_: Current flow`, a missing glossary entry, a range
predicate duplicated across acceptance and inspection, agent-facing validation
prose reaching the reader, three props travelling together through four
components, cache keys named "evidence", two components in one file, and small
style drift. All were addressed. The follow-up review found one surviving
"current" in a doc comment, a sentence assembled two different ways, a couple of
weak parameter names, and the shared state type living in the wrong file; those
are fixed. Remaining: none.

#### Spec review

The first review found no missing criteria, and two scope problems: a window
focus listener re-reading evidence automatically, and a duplicated **Check
again** control on the Sources tab. The listener was removed and the reading
control now lives only in the source inspector the ticket names. The reviewer's
third finding — that binary content should read Stale rather than Unavailable —
was withdrawn on re-review: the ticket lists an unreadable location as its own
Unavailable trigger, and a file with no citable text lines is exactly that. A
freshness read racing a concurrent deletion no longer raises a failure notice.
The follow-up review found no remaining gaps. Remaining: none.

Review summary: Standards 0 remaining findings; Spec 0 remaining findings. Both
reviews used the staged implementation against starting commit `0386cf5`.
