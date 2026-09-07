# 05: Continue long conversations through compaction

**What to build:** Continue a long conversation or Agent Execution as model working context fills, while the original Agent Chat remains readable and the execution continues with the same identity and current Workspace state.

**Blocked by:** [04: Ask source-grounded Repository questions](04-ask-source-grounded-repository-questions.md).

**Status:** ready-for-agent

- [ ] Own compaction in the application Agent runtime and use the same configured OpenRouter model. Compaction changes model working context only; original Agent Chat entries remain complete, ordered, and retained.
- [ ] Keep execution identity and current catalog authoritative outside lossy summaries. The context contract carries phase, Review Pass accounting, and accepted-event identities when those features are introduced, so later Scan/result slices do not store them only in summaries.
- [ ] Preserve active tool exchanges and required provider blocks intact. Compact completed segments in bounded pieces where necessary and replace working context only after summary generation succeeds.
- [ ] Record the actual summary as a collapsed but inspectable compaction event. Do not replace prior conversation entries with the summary or with an error string.
- [ ] Size the full assembled request with room for response and required state. Use bundled local context metadata where available, otherwise a conservative estimated-token trigger; make no model/price preflight request and expose no token budget UI.
- [ ] Compaction requests use zero transport retries, execution-scoped cancellation, lossless provider capture, and once-per-request provider usage accounting. Include returned summary usage in available totals without double counting.
- [ ] Compaction failure, actual context overflow, or inability to fit mandatory intact blocks ends execution clearly, preserving committed state and transcript. Do not automatically retry overflow or silently truncate content.
- [ ] New requests after restart or terminal completion reconstruct valid working context from retained history and current state without resuming old graph work. Compaction during an active attempt keeps its Agent Execution identity and unlimited-loop policy.

## Scope and sources

This slice does not add a verification suite, mandatory model run, model preflight, or user resource ceiling. Later Scan and mutation features must supply their authoritative continuation state through this same context contract.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 42, 54, 59–62, 64–65; Implementation Decisions 21–24. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

