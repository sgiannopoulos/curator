# 12: Handle unavailable Repositories and Relink

**What to build:** Open a Workspace whose Repository has moved or become unavailable, continue using its retained data, and explicitly Relink it to a user-confirmed location without losing identity or merging Workspaces.

**Blocked by:** [02: Manually curate User Flows](02-manually-curate-user-flows.md).

**Status:** ready-for-agent

- [ ] Opening a persisted Workspace does not require its Repository to be readable. Show an unavailable-Repository state while keeping stored User Flows and any existing Agent Chat/Scan Records accessible.
- [ ] Allow idle manual catalog changes against stored data. Source unavailability does not erase flows, current evidence, or history and does not change Active/Outdated status.
- [ ] Use the current Repository availability state to disable hosted Agent Executions, including ordinary chat and Scans when those features are present. Keep stored data usable independently of OpenRouter Configuration.
- [ ] Relink offers native directory selection and explicit confirmation that the replacement is the same Repository. On confirmation, update only the locator association and appropriate Workspace timestamp while retaining its durable identity, catalog, history, and execution associations.
- [ ] Normalize the selected absolute locator using the existing recognition contract. Do not infer identity from Git remotes, commits, names, directory contents, or filesystem IDs.
- [ ] If the new locator already belongs to another Workspace, open that Workspace instead of relinking or merging, leaving the original Workspace unchanged.
- [ ] Gate Relink on the same authoritative per-Workspace busy state used by Agent Execution when present, and reflect that state in Workspace options. A locator replacement cannot race an active execution's selected source.
- [ ] Retained citations remain attached. Where citation freshness support is present, unavailable source displays Unavailable and subsequent checks use the current locator; relinking does not silently refresh evidence fingerprints or change flow status.
- [ ] Persist the new locator for future reopening and recent-Workspace recognition. A different checkout or changed source at an unchanged locator still does not create a new Workspace automatically.

## Scope and sources

Approved as ticket 12 for later priority, with only ticket 02 as a true blocker. Preserve any conversation, Scan, and citation features already present; their absence does not justify adding blockers or scaffolding them here. No automatic Repository identity detection or Workspace merge is introduced.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 5–9, 35–36, 50; Implementation Decisions 5–6, 12, 18, 25, 28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

