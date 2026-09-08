# 10: Review existing User Flows before discovery

**What to build:** Run a Scan against a populated catalog, review every existing Active and Outdated User Flow before discovering more, and see conservative source-backed judgments take effect immediately without rewriting curated text.

**Blocked by:** [07: Curate existing User Flows through Agent Chat](07-curate-existing-user-flows-through-agent-chat.md); [09: Scan an empty catalog for User Flows](09-scan-an-empty-catalog-for-user-flows.md).

**Status:** resolved

- [x] Capture the complete input catalog identity set after entering the authoritative busy state. Following orientation, evaluate every existing Active and Outdated identity exactly once in the Review Pass as Supported, Contradicted, or Indeterminate.
- [x] Enforce the discovery barrier in persisted application phase/accounting state. Require a validated manifest accounting for every input identity before discovery can start; prompt adherence alone is insufficient.
- [x] Supported makes or keeps a flow Active and replaces its citations with current supporting evidence. Contradicted makes or keeps it Outdated and replaces citations with positive evidence that its described behavior is no longer current or possible.
- [x] Indeterminate requires a short explanation and leaves title, description, status, and citations unchanged. Mere omission from results or incomplete inspection cannot mark a flow Outdated.
- [x] Apply each validated review judgment immediately through the shared idempotent, atomic result path. Review results and phase transitions serialize with cancellation, execution terminalization, and current catalog mutations.
- [x] A Scan never rewrites an existing title or description. Represent materially changed behavior as an Outdated old flow and a new Active flow; ambiguous semantic matches create a new Active flow rather than overwrite an uncertain match.
- [x] Discovery compares candidates with the catalog resulting from review. Later evidence may submit a new idempotent correction to an earlier judgment, including reactivating an existing flow instead of duplicating it.
- [x] Keep semantic matching and deduplication with the agent. Distinguish one initial review per input identity from allowed later corrections, and retain both accepted events in Scan history.
- [x] Retain input identity accounting, accepted judgments, phase, current catalog, and remaining review work across internal turns and compaction without changing Scan or Agent Execution identity.
- [x] A Review Pass stopped or failed before complete accounting never advances to discovery. Its committed judgments remain, and the terminal record reports unfinished work. A new Scan reviews the catalog as it now exists.
- [x] Enable Scans for populated catalogs and preserve the empty-catalog fast path. Deleted behaviors may be rediscovered under new identities without consulting history as a tombstone or restoration store.

## Scope and sources

This extends Scan behavior through existing curation/result operations while preserving the stricter Scan text-preservation contract. It does not introduce automatic semantic verification, a completeness guarantee, or an additional test gate.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 21–28, 31, 39, 41, 53–54, 63; Implementation Decisions 7–12, 16–19, 23, 25, 29. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.



## Comments

### Implemented — 2026-09-08

A Scan now runs against a populated catalog. `ChatApplication.start` captures the
Workspace's User Flow identities through the catalog's own reader inside the same
transaction that finds the Workspace idle and inserts the Running execution, so
nothing can add or remove a flow between claiming the Workspace and fixing the
Review Pass's input set. An empty set keeps the ticket 09 fast path: orientation
enters the Discovery Pass directly and reports the pass as skipped.

The Scan Record's phase is now orientation, review, or discovery, and it carries
the input identities beside the judgments accepted for them. Both live in the
durable execution payload, are rebuilt into mandatory working context on every
request, and therefore survive tool turns and compaction without changing the
Scan or Agent Execution identity. Orientation enters the Review Pass when there
are inputs. Every input identity must be reviewed exactly once: result
acceptance refuses a create-flow during the Review Pass, a review of an identity
outside the input set, and a second review of an identity already accounted for.

The discovery barrier is application state, not prompt adherence. Entering
discovery requires a `review-complete` report whose manifest of identities and
judgments is checked in both directions against the judgments the application
actually accepted; a disagreement names each identity and what the application
holds for it. The check runs before the acceptance transaction and again inside
it, alongside the existing execution and identity checks, so review results and
phase transitions serialize with cancellation, terminalization, and catalog
mutation. Supported and Contradicted set status and replace citations;
Indeterminate requires an explanation and leaves title, description, status, and
citations untouched. Omission cannot mark a flow Outdated.

A Scan may never submit edit-wording, edit-behavior, or delete-flow, in any
phase, so curated text is safe: materially changed behavior and ambiguous
matches become new Active flows, which stays the agent's semantic judgment.
During discovery the agent may submit a correction to an earlier judgment,
including reactivating a flow it marked Outdated; the initial judgment and the
correction are both retained as accepted results, while the pass's accounting
keeps recording what the Review Pass concluded. Any accepted result that changes
the catalog invalidates a recorded gap check, corrections included. Results
accepted by a Scan now record `scan` rather than `agent` as the mutation origin.

A Review Pass that stops or fails before complete accounting never advances: its
committed judgments remain, and the terminal record says discovery never
started. A new Scan reviews the catalog as it then exists; history is never
consulted as a tombstone or restoration store.

Bridge protocol is version 9 and storage schema version 8 for the changed Scan
payload. Earlier stores report as unsupported and are left untouched, following
the accepted no-migration contract. The README documents the Review Pass, the
barrier, and discovery.

Validation: shared, runtime, and frontend TypeScript compilation passed, followed
by a full `pnpm build` producing the native executable and the Curator.app
bundle, and again after the review corrections. `git diff --check` passed. The
repository still has no automated test suite or individual test file, and this
ticket adds none: diagnostics and verification remain deferred by the accepted
development contract. No paid-model request, native probe, or shared-store
mutation was performed. Compilation is not evidence of provider fidelity,
prompt adherence, or inference quality.

#### Standards review

Two findings, both addressed. Reading catalog identities with its own SQL made
`ChatApplication` reach into the catalog's table and duplicate its ordering; the
catalog now exposes `identities` and owns that order in one place. Scan progress
transitions and the conversation line describing a report had grown inside the
chat module; `accountForResult` and `describeReport` now sit beside the other
Scan transitions. Also applied: one `ResultOrigin` type instead of the inline
`Extract<MutationOrigin, ...>` repeated at three call sites, and one
`describeScanPhase` shared by the runtime and the interface instead of two
independent phase-to-label maps.

The review noted that `input identity`, `review accounting`, and `Scan phase`
are load-bearing in code and prose but absent from `CONTEXT.md`. Per
`docs/agents/domain.md`, that is noted here for `/domain-modeling` rather than
resolved by adding glossary entries in an implementation commit. No term on a
glossary `_Avoid_` list is used.

#### Spec review

No missing or partial requirements and no scope creep. Two minor findings, both
addressed: gap-check invalidation had been narrowed to discoveries, so a
correction accepted after a gap check could end a Scan with a check describing a
catalog that had since changed — any catalog-changing result now invalidates it,
and `scan.md` says so; and the Review Pass prompt said the catalog appeared
above the instructions when the runtime renders it after them.

Review summary: Standards 0 remaining findings; Spec 0 remaining findings. Two
independent review agents examined the staged implementation against starting
commit `bdc237e`.
