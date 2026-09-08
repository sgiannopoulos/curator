# 11: Inspect Scan history and retry an attempt

**What to build:** Browse retained Scan attempts and their results, evidence, activity, conversation, and terminal outcomes, then explicitly retry a finished attempt as a new Scan against the current catalog.

**Blocked by:** [10: Review existing User Flows before discovery](10-review-existing-user-flows-before-discovery.md).

**Status:** resolved

- [x] Provide Workspace Scan history through the accepted Workspace-options interface, distinct from future test-run history. Read persisted Scan Records through application commands and display them after application restart.
- [x] Show effort, timestamps, actual model, lifecycle outcome/reason, accepted results, review accounting, activity ledger, recorded unfinished work, and available usage/cost for each retained attempt.
- [x] Expose the associated entries within the Workspace's ongoing Agent Chat, preserving complete logical content, collapsed reasoning/compaction events, and checkpointed unfinished entries. Do not create separate Scan conversations or silently trim large historical content.
- [x] Historical evidence and mentions remain inspectable when a current flow has been deleted or its citations replaced. Make their retained historical role clear without offering restoration, tombstones, or catalog reconstruction.
- [x] An explicit Retry on a terminal attempt creates a new Agent Execution and linked Scan Record against the current catalog, retaining the chosen effort through the normal Scan start contract and using the current application-wide model configuration. The old attempt remains terminal.
- [x] Retry obeys current Repository/configuration availability and busy-state exclusion. It runs the full applicable Review/Discovery protocol and does not resume a checkpoint, replay an old outbox, or automatically retry a failed transport request.
- [x] Cancelled, Failed, and Interrupted records retain committed results, available transcript, and recorded unfinished work. Explain a Review Pass that ended before discovery without implying complete analysis.
- [x] Display returned usage/cost once and identify unavailable/incomplete totals accurately. Never reconcile missing usage through extra provider calls or substitute zero for absent data.
- [x] Opening history or reloading the UI catches up from persisted state without losing accepted results or changing active execution. History remains inspectable while work runs.
- [x] Retain Scan history and Agent Chat indefinitely until Workspace deletion, with no per-Scan deletion, automatic retention limit, or test-run behavior.

## Scope and sources

Scan persistence and basic current outcomes exist in tickets 09–10. This slice makes historical inspection and linked retry a complete user journey; it is not a verification or diagnostics dashboard.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 31, 40–42, 50, 53–54, 58–65; Implementation Decisions 18–22, 25–26, 28–29. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.



## Comments

### Implemented — 2026-09-08

Workspace options now opens **Scan history** in the reading area, following the
accepted Curator design. It reads a new `scan.history` command, which assembles
each Scan Record from the records that already persist its parts: the durable
Agent Execution with its Scan progress, the results that execution accepted, the
file activity it reported, and how many entries it wrote into the Workspace's one
Agent Chat. Nothing about a Scan Record is stored twice, and reading it changes
nothing, so history opens during a running Scan and after a restart alike.

Each attempt shows its effort, timestamps, configured model, outcome and reason,
accepted results, review accounting, path ledger, recorded unfinished work, and
whatever usage the provider returned, with unavailable and incomplete totals
named as such. The Scan summary and the path ledger are the same components the
conversation uses, so the two surfaces cannot drift apart. Accepted results are
shown as they committed, and a result whose flow has since left the catalog says
so plainly, without offering restoration.

**Open in Agent Chat** brings that attempt's entries into view in the ongoing
conversation rather than repeating them: there is no second Scan transcript, no
trimming, and reasoning and compaction stay collapsed but readable. The jump
happens once per request, so entries arriving from a running attempt no longer
drag the reader back to it.

**Retry this Scan** starts a new Agent Execution and Scan Record at the same
effort, linked to the attempt it came from, which stays terminal. It goes through
the ordinary Scan start contract, so it captures the catalog as it is now, runs
the applicable Review and Discovery passes over it, uses the current
application-wide configuration, and waits for an available Repository, present
configuration, and an idle Workspace. Nothing resumes a checkpoint, replays an
outbox, or retries a failed provider request. The same Retry is offered on a
terminal Scan where it is read in the conversation.

Bridge protocol is version 10 for the new command. Storage schema stays at
version 8: the new `retryOf` link reads back as none on Scans recorded before
Retry existed, which is what they were, so existing Workspaces keep their
catalogs, Scan history, and Agent Chat rather than being reported unsupported.

Validation: shared, runtime, and frontend TypeScript compilation passed, followed
by a full `pnpm build` producing the native executable and the Curator.app
bundle, and again after the review corrections. `git diff --check` passed. The
repository has no automated test suite and this ticket adds none; diagnostics and
verification remain deferred. No paid-model request, native probe, or shared-store
mutation was performed.

#### Standards review

Findings addressed: this ticket file was left unresolved (now resolved with this
record); `ResultApplication.records` collided with the Scan Record vocabulary and
is now `acceptedResults`; `ScanRecord.entries` was a count sitting beside a
snapshot whose entries are entries, and is now `entryCount`; the label for an
accepted result's kind moved to `@curator/shared` beside the type it reads, with
the other shared label functions; a local variable named `conversation` now uses
the glossary's Agent Chat; and the three spellings of "can the agent be asked to
do anything right now" became one `session.agentBlocked`. The duplicated Scan
summary and path ledger were resolved by reusing `ScanOutcome` and the extracted
`PathActivity` in both surfaces.

The review noted that **Retry**, now first-class in the schema, the interface,
and the README, has no `CONTEXT.md` entry, unlike Relink. Per `docs/agents/domain.md`
that is noted here for `/domain-modeling` rather than resolved by adding a
glossary entry in an implementation commit.

#### Spec review

No missing requirements after correction and no scope creep. Three findings, all
addressed: the history's path ledger restated the summary without the caveat that
exclusions are capped, and now uses the same component as the conversation, which
reports "the first N of M" and can read every recorded path; the review
accounting showed counts without the Supported/Contradicted/Indeterminate
breakdown, and now reuses the Scan summary that has it; and the schema had been
bumped for an addition that old payloads can read, which would have reported
every existing store as unsupported against this ticket's own retention
requirement. Two smaller corrections: the Agent Chat focus effect re-ran on every
snapshot, and the Retry button's busy check treated a still-loading conversation
as idle.

Review summary: Standards 0 remaining findings; Spec 0 remaining findings. Two
independent review agents examined the staged implementation against starting
commit `80f510e`.
