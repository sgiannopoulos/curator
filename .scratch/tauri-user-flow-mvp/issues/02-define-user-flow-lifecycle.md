Type: grilling
Status: resolved
Blocked by:

## Question

What is the complete lifecycle of a User Flow across generation, manual or agent-assisted creation and editing, removal, rescanning, being marked Outdated, restoration, and history, and which transitions require explicit user approval?

## Answer

### States and identity

A User Flow has a durable identity while it exists and is either **Active** or **Outdated**. Editing its title or description does not create a new User Flow or change its status. A Scan treats a result as the same User Flow when its user goal and essential behavior remain recognizable; an ambiguous match becomes a new Active User Flow rather than overwriting an existing one.

Removal is permanent deletion, not a lifecycle state. The MVP has no trash, tombstone, undo, or User Flow revision history. A deleted User Flow cannot be restored. Because the current catalog retains no record of it, a later Scan may rediscover the same behavior as a new User Flow with a new identity. The boundary with retained historical mentions is defined by [Define Workspace persistence](08-define-workspace-persistence.md).

### Creation, editing, and removal

- Each valid User Flow produced by an initial or later Scan is added as Active as soon as it is available.
- A manual creation or edit is committed by Save and needs no additional confirmation. Editing an Outdated User Flow leaves it Outdated.
- A user may explicitly mark an Outdated User Flow Active.
- Manual removal requires confirmation because it is permanent.
- A Scan never rewrites the title or description of an existing User Flow.

### Rescanning and Outdated behavior

A Scan reconciles conservatively:

- Positive confirmation of an existing Active User Flow leaves it unchanged.
- Positive confirmation that an Outdated User Flow is current again marks it Active as soon as the review result is validated.
- Positive evidence that behavior is no longer possible or current marks the existing User Flow Outdated as soon as the review result is validated. Mere absence from Scan results is insufficient because no Scanning Effort promises complete coverage.
- When behavior has materially changed, the old User Flow is marked Outdated and the changed behavior is added as a new Active User Flow rather than silently replacing the old text.
- An ambiguous match is added as a new Active User Flow.

Every valid Scan result is applied immediately. New User Flows and completed Outdated or reactivation transitions produced before cancellation or failure remain in the Workspace; an interrupted Scan does not roll them back. The detailed two-pass reconciliation and immediate-result protocol are defined by [Define analysis agent architecture](06-define-analysis-agent-architecture.md).

### Agent-assisted curation and approval

A user-initiated agent task authorizes the agent to add, edit, remove, mark Outdated, or reactivate User Flows directly. Agent changes require no preview, confirmation, or per-change approval, including permanent removal. The agent must not modify the catalog spontaneously outside an explicit user task or Scan.

Agent operations take effect as they occur. The MVP does not add catalog-level staging, transactions, undo, or its own retry framework around an agent task. The selected LangChain or coding-agent runtime owns retry and failure handling; modifications successfully made before a retry or terminal failure remain applied.

Change origin may be retained as lightweight metadata for diagnostics, distinguishing manual, Scan, and agent-assisted changes, but it does not alter lifecycle rules and is not a User Flow history.
