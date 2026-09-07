# 10: Review existing User Flows before discovery

**What to build:** Run a Scan against a populated catalog, review every existing Active and Outdated User Flow before discovering more, and see conservative source-backed judgments take effect immediately without rewriting curated text.

**Blocked by:** [07: Curate existing User Flows through Agent Chat](07-curate-existing-user-flows-through-agent-chat.md); [09: Scan an empty catalog for User Flows](09-scan-an-empty-catalog-for-user-flows.md).

**Status:** ready-for-agent

- [ ] Capture the complete input catalog identity set after entering the authoritative busy state. Following orientation, evaluate every existing Active and Outdated identity exactly once in the Review Pass as Supported, Contradicted, or Indeterminate.
- [ ] Enforce the discovery barrier in persisted application phase/accounting state. Require a validated manifest accounting for every input identity before discovery can start; prompt adherence alone is insufficient.
- [ ] Supported makes or keeps a flow Active and replaces its citations with current supporting evidence. Contradicted makes or keeps it Outdated and replaces citations with positive evidence that its described behavior is no longer current or possible.
- [ ] Indeterminate requires a short explanation and leaves title, description, status, and citations unchanged. Mere omission from results or incomplete inspection cannot mark a flow Outdated.
- [ ] Apply each validated review judgment immediately through the shared idempotent, atomic result path. Review results and phase transitions serialize with cancellation, execution terminalization, and current catalog mutations.
- [ ] A Scan never rewrites an existing title or description. Represent materially changed behavior as an Outdated old flow and a new Active flow; ambiguous semantic matches create a new Active flow rather than overwrite an uncertain match.
- [ ] Discovery compares candidates with the catalog resulting from review. Later evidence may submit a new idempotent correction to an earlier judgment, including reactivating an existing flow instead of duplicating it.
- [ ] Keep semantic matching and deduplication with the agent. Distinguish one initial review per input identity from allowed later corrections, and retain both accepted events in Scan history.
- [ ] Retain input identity accounting, accepted judgments, phase, current catalog, and remaining review work across internal turns and compaction without changing Scan or Agent Execution identity.
- [ ] A Review Pass stopped or failed before complete accounting never advances to discovery. Its committed judgments remain, and the terminal record reports unfinished work. A new Scan reviews the catalog as it now exists.
- [ ] Enable Scans for populated catalogs and preserve the empty-catalog fast path. Deleted behaviors may be rediscovered under new identities without consulting history as a tombstone or restoration store.

## Scope and sources

This extends Scan behavior through existing curation/result operations while preserving the stricter Scan text-preservation contract. It does not introduce automatic semantic verification, a completeness guarantee, or an additional test gate.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 21–28, 31, 39, 41, 53–54, 63; Implementation Decisions 7–12, 16–19, 23, 25, 29. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

