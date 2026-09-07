# 08: Show Source Citation freshness

**What to build:** Read a User Flow's citations and see when their referenced source has changed or become unreadable, without changing the flow's Active/Outdated judgment.

**Blocked by:** [06: Create cited User Flows through Agent Chat](06-create-cited-user-flows-through-agent-chat.md).

**Status:** ready-for-agent

- [ ] Use each accepted citation's Repository-relative location and retained content fingerprint to evaluate freshness against the Workspace's current Repository Locator through Repository access and Workspace application queries.
- [ ] Display paths, one-based lines/ranges, explanations, and freshness in the source inspector. Do not copy source excerpts or add a click action, source dialog/viewer, or external-editor navigation.
- [ ] A changed file fingerprint makes its citation Stale. An unavailable Repository or file, an unreadable location, or a line range that no longer exists makes it Unavailable; unavailability is not treated as proof that behavior is contradicted.
- [ ] Preserve the citation record, original accepted fingerprint, and flow status when reporting freshness. A transient unreadable source does not delete evidence or prevent inspecting the stored description.
- [ ] Manual title/description edits and wording-only agent edits do not clear citations, replace their fingerprints, or independently mark them stale. Freshness reflects the source location rather than edited prose.
- [ ] Fresh supporting evidence from a determinate agent judgment replaces current citations and their fingerprints through the existing atomic result path. Inconclusive reconsideration preserves existing evidence.
- [ ] Freshness is recalculated from the current locator/source when evidence is inspected or refreshed, including after a source location becomes available again; do not freeze a transient Stale/Unavailable display as a flow lifecycle state.
- [ ] Catalog inspection remains available during execution. Freshness observations cannot bypass result validation, mutate execution phase, or overwrite authoritative evidence accepted concurrently.

## Scope and sources

This slice adds citation freshness behavior, not source navigation, continuous filesystem monitoring requirements, semantic support scoring, or programmatic confinement. Relink remains a separate lower-priority slice.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 20, 33–36, 38, 46; Implementation Decisions 11–12, 28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

