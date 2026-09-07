# 05: Continue long conversations through compaction

**What to build:** Continue a long conversation or Agent Execution as model working context fills, while the original Agent Chat remains readable and the execution continues with the same identity and current Workspace state.

**Blocked by:** [04: Ask source-grounded Repository questions](04-ask-source-grounded-repository-questions.md).

**Status:** resolved

- [x] Own compaction in the application Agent runtime and use the same configured OpenRouter model. Compaction changes model working context only; original Agent Chat entries remain complete, ordered, and retained.
- [x] Keep execution identity and current catalog authoritative outside lossy summaries. The context contract carries phase, Review Pass accounting, and accepted-event identities when those features are introduced, so later Scan/result slices do not store them only in summaries.
- [x] Preserve active tool exchanges and required provider blocks intact. Compact completed segments in bounded pieces where necessary and replace working context only after summary generation succeeds.
- [x] Record the actual summary as a collapsed but inspectable compaction event. Do not replace prior conversation entries with the summary or with an error string.
- [x] Size the full assembled request with room for response and required state. Use bundled local context metadata where available, otherwise a conservative estimated-token trigger; make no model/price preflight request and expose no token budget UI.
- [x] Compaction requests use zero transport retries, execution-scoped cancellation, lossless provider capture, and once-per-request provider usage accounting. Include returned summary usage in available totals without double counting.
- [x] Compaction failure, actual context overflow, or inability to fit mandatory intact blocks ends execution clearly, preserving committed state and transcript. Do not automatically retry overflow or silently truncate content.
- [x] New requests after restart or terminal completion reconstruct valid working context from retained history and current state without resuming old graph work. Compaction during an active attempt keeps its Agent Execution identity and unlimited-loop policy.

## Scope and sources

This slice does not add a verification suite, mandatory model run, model preflight, or user resource ceiling. Later Scan and mutation features must supply their authoritative continuation state through this same context contract.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 42, 54, 59–62, 64–65; Implementation Decisions 21–24. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.


## Comments

### Implemented — 2026-09-08

Working context is now a structure rather than a flat list: a mandatory part
carrying the rules, the current catalog, and this Agent Execution's identity,
and an ordered list of segments, each an exchange that must be summarized whole
or not at all. An assistant turn and the tool results answering it share one
segment, so no summary can leave the provider a call it cannot answer. The
mandatory part is rebuilt from current state on every request, which is where
phase, Review Pass accounting, and accepted-event identities will go when Scans
introduce them.

When the next request would not fit, the oldest segments are summarized by the
same configured model and replaced by that summary, which leads the context
because what it replaced came first. Sizing covers the whole request, tool
definitions included. There is no bundled context metadata for an
OpenRouter-routed model and the accepted contract allows no preflight, so the
trigger is a deliberately cautious estimate: it compacts earlier than strictly
necessary and never ends an attempt for being long.

Each summary is its own Agent Chat event, collapsed but readable. No earlier
entry is rewritten, replaced, or removed, and a summary that stands for other
summaries reports the last conversation entry it actually covers rather than its
own position, so a later summary can never claim an exchange nobody summarized.
Summary requests are ordinary requests: zero transport retries, the execution's
own cancellation, complete payload capture, and one usage snapshot each, added
into the attempt's totals without double counting. A failed summary, a
conversation that cannot be made smaller, and a single exchange too large to
summarize each end the attempt with the reason and keep everything committed;
a batch that could not free what the request is over by is refused before it
costs a request. New attempts rebuild valid context from stored history and
current state instead of resuming.

The store keeps schema version 4. Nothing here changes a table, and an entry
written before compaction existed reads back as carrying none, so existing
Workspaces stay readable.

Validation: shared/runtime/frontend TypeScript compilation and `pnpm build`,
including the native macOS bundle. The required separate Standards and Spec
reviews ran. Standards found the README now contradicted the code and several
cleanups; all were taken, and "Working Context" and "Compaction" were added to
the glossary. Spec found a real defect — a summary segment reporting its own
entry sequence could cover exchanges it never summarized — which is fixed and
demonstrated by a throwaway probe where chained summaries account for every
round. Probes against a stubbed provider also covered compaction under large
tool output, usage aggregation across turns and summaries, cross-execution
reconstruction, and each failure path. No paid request was made, and no
verification suite or diagnostic command was introduced.

Two Spec observations were kept as they are. A summary request that fails after
the provider billed it leaves its usage out of the attempt's totals: the
attempt is Failed, which already reports totals as incomplete, and the request's
own payloads are retained, so nothing claims a completeness it does not have.
Provider reasoning is also left out of what a summary is written from; it is the
model's own working-out rather than a record of what happened, and it remains
intact in the transcript and in continuation.
