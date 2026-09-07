Type: grilling
Status: resolved
Blocked by: 02, 04, 06

## Question

What Workspace, Repository identity, current User Flow and Source Citation state, complete Agent Chat and Scan history, result-outbox idempotency, partial and terminal Scan records, app-private persistence, migration, permanent deletion, and missing or changed Repository path semantics should the MVP implement, given that the MVP keeps no User Flow revision history, trash, or undo and treats OpenRouter Configuration as process-startup environment rather than Workspace state?

## Answer

Subsequent refinement: [Define agent-assisted curation](09-define-agent-assisted-curation.md) expands Agent Chat to a persistent Workspace conversation and extends the existing result and history contracts to ordinary chat-driven changes. Use that decision for chat ownership, Scan associations, and conversation continuity.

Subsequent architecture refinement: [Choose application architecture](11-choose-application-architecture.md) generalizes the Scan-only result key below to Agent Execution identity for both Scans and ordinary chat, and selects the persistence implementation and runtime ownership. Use that decision for these refinements; the atomicity and retention contracts here remain in effect.

### Workspace identity and Repository recognition

A Workspace has a durable identity independent of its Repository's location. The application recognizes an existing Repository association by an exact match of its normalized absolute **Repository Locator**, reopening the associated Workspace rather than creating a duplicate. There is one Workspace per recognized Repository, not multiple independent catalogs for the same recognized locator.

The locator is not a durable Repository identity. The MVP does not infer identity from Git remotes, commits, directory names, or filesystem identifiers. A moved or replaced directory requires explicit user judgment; a different checkout or changed contents at the same locator do not automatically produce a new Workspace.

Persist a stable Workspace ID, its Repository Locator, and created/updated timestamps. Derive its display name from the Repository directory. Custom Workspace naming and manual ordering are not MVP requirements.

### Missing Repository and Relink

An unavailable Repository does not prevent opening its Workspace. Persisted User Flows, Scan Records, and Agent Chat remain accessible, and manual catalog changes remain possible. Scans, agent-assisted curation, and source navigation are disabled until the Repository is available. The existing exclusion of manual mutations while a Scan runs still applies.

A **Relink** requires the user to select a new directory and explicitly confirm that it is the same Repository. It changes only the locator association and preserves the Workspace identity, catalog, and history. If the new locator already belongs to another Workspace, open that Workspace instead of relinking or merging; the original Workspace remains unchanged.

### Authoritative current catalog

Persist the current User Flow catalog and its current Source Citations directly as authoritative mutable state. Store append-only Scan history alongside it; do not event-source or reconstruct the catalog from that history.

Each current User Flow retains its stable ID, title, description, Active/Outdated status, current citations, created/updated timestamps, creation origin, and most recent mutation origin. Origin distinguishes `manual`, `scan`, and `agent-assisted`; it is current diagnostic metadata, not revision history. The existing lifecycle rules remain unchanged.

Manual title or description edits leave all current Source Citations unchanged. They do not clear or replace citations, alter their fingerprints, or mark them stale merely because the User Flow text changed. Identity and Active/Outdated status also remain unchanged. Retained citations consequently record previous Scan evidence; they do not certify that newly edited text has been reviewed. Manually created User Flows may have no citations; generated flows still require supporting citations.

### Source Citation freshness

Current Source Citations retain the agreed Repository-relative path, one-based line or tight range, and supporting explanation, without copying a source excerpt into the citation record. Store a content fingerprint as internal verification metadata when accepting the citation.

If the referenced file's contents change, display the citation as **Stale**. If the Repository or file cannot be accessed, or the cited line range no longer exists, display it as **Unavailable**. These checks concern source-location freshness and availability, not semantic support. Neither condition changes the associated User Flow's Active/Outdated status or removes the retained citation. A later Scan can establish semantic support and replace current citations through a determinate review; Indeterminate continues to leave them unchanged.

### Scan Records and execution provenance

A **Scan Record** retains the history of one attempt, including accepted result events and historical citations, its complete Agent Chat, and non-secret execution metadata. It is not User Flow revision history and is never a mechanism for restoring a deleted flow or rebuilding the current catalog.

Persist the Scan identity and Workspace association, timestamps, selected Scanning Effort, exact model identifier actually used, usage/cost when available, Review Pass accounting, activity ledger, terminal outcome and reason, and recorded unfinished work. A Retry has a new Scan identity and a link to the preceding Scan.

Recording the model used is historical provenance, not Workspace- or Scan-scoped OpenRouter Configuration. Do not copy the API key or unrelated environment values into execution metadata. OpenRouter Configuration remains application-wide process-startup environment configuration outside Workspace state; the separately accepted risk of sensitive content appearing in full tool transcripts remains.

### Agent Chat persistence

Persist a typed, monotonically ordered sequence of logical transcript entries, not network transport frames. Streaming transport chunks may be coalesced, but complete logical content, ordered provider block structure, reasoning details, tool arguments and outputs, and application-generated events must be preserved. Provider blocks needed for continuation retain their original content and structure. The transcript continues to include result events, validation failures, retries, file activity, compaction, cancellation, and completion as defined in [Define analysis agent architecture](06-define-analysis-agent-architecture.md).

Checkpoint unfinished entries during streaming so an abrupt exit retains checkpointed partial content as unfinished rather than losing the entire entry. Do not silently truncate large entries. Working-context compaction does not replace earlier transcript entries or reduce the retained history.

### Atomic results and idempotency

For each accepted result, atomically commit its idempotency marker, historical result, current User Flow/citation mutation, and transcript result event. Either the entire result is committed or none of it is. Expose the result as applied only after that commit. This is per-result atomicity, not a Scan-level transaction, staging area, or rollback mechanism.

The unique idempotency key is `(Scan ID, result-event ID)`. Retain accepted keys with the Scan Record. During an active Scan, replaying an accepted event returns its original outcome without applying another mutation. Invalid events are represented in Agent Chat but do not reserve their keys, so a repaired event may reuse a rejected key.

Transient outbox data may be removed after the atomic commit succeeds. If the application exits before a result is committed, restart must not apply that result, even if its outbox payload is otherwise valid. Finalize the Scan as Interrupted and discard its unapplied outbox events. A committed result remains committed even if its transient outbox payload was not cleaned up before exit; that leftover payload must not cause another mutation. Terminal Scans never resume result application.

### Scan lifecycle and restart

The persisted lifecycle states are **Running**, **Completed**, **Cancelled**, **Failed**, and **Interrupted**. Record a cancellation request separately while waiting for the agent to stop; requesting cancellation alone does not establish the terminal Cancelled outcome.

On startup, convert every remaining Running Scan to Interrupted. Retain its committed partial results, available Agent Chat, and terminal explanation. Neither a crash nor a normal application exit allows execution to continue in the background or resume on restart. A user-visible Retry starts a new Scan against the current catalog and leaves the old execution terminal.

### Retention, confidentiality, and permanent deletion

Persist Workspace data in the application's app-specific data location outside the Repository. The MVP adds no application-level encryption. App-specific storage is not a sandbox or confidentiality guarantee, and complete Agent Chat may contain substantial Repository content or accidentally accessed secrets. Make this clear to the user.

Retain complete Scan history and Agent Chat indefinitely until Workspace deletion. There is no per-Scan deletion, retention limit, or silent history trimming in the MVP.

Permanently removing a User Flow deletes its current catalog record and current citations, not historical mentions or citations in Scan Records and Agent Chat. Those historical records are not tombstones, restorable flows, or User Flow revision history. Manual deletion confirmation must make this retention boundary clear. A later Scan may rediscover the behavior under a new User Flow identity.

Deleting a Workspace purges its current catalog, Scan Records, Agent Chat, idempotency records, and associated application-owned working/outbox data. It leaves the Repository and application-wide environment configuration untouched. There is no trash, undo, or automatic restoration.

### MVP storage compatibility and remaining implementation choices

Use a versioned initial schema, but make no compatibility promise across future schema changes. The MVP requires no migration framework, automatic backups, downgrade support, or storage-recovery UI. Unsupported or unreadable storage produces a non-destructive startup error identifying its location; never reset or discard it automatically. During development, the user may remove local application data manually.

This compatibility limitation does not weaken ordinary persistence across restarts using a supported schema. The earlier proposal for automatic migrations and pre-migration backups was explicitly replaced by this leaner MVP decision.

The exact storage engine, schema layout, module interfaces, and background execution mechanisms remain decisions for [Choose application architecture](11-choose-application-architecture.md). They must support the behavior above without introducing additional migration or recovery scope.
