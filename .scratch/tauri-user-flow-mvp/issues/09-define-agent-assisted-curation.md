Type: grilling
Status: resolved
Blocked by: 02, 03, 08

## Question

How can a user initiate an agent task to add, edit, permanently remove, mark Outdated, reactivate, or reconsider User Flows; what context and mutation tools may the agent use; what boundaries keep direct modifications within the requested task; how should citations accompanying agent-assisted edits be maintained; and how should task history, progress, completed changes, retries, and terminal failures be reported within the constraints of [Define Workspace persistence](08-define-workspace-persistence.md)?

## Answer

### One ongoing Agent Chat

Each Workspace has one ongoing Agent Chat for questions, requests to change User Flows, and Scans. There is no separate Curation Task concept, selected-flow attachment, or separate curation interface in the MVP. Users identify the intended flows and changes through the conversation.

The conversation continues across completed Scans and application restarts. Persist its complete history; compact model working context as needed without replacing retained entries. Continuing the conversation after completion, cancellation, failure, or interruption starts new execution rather than resuming a terminal operation.

This decision expands the Scan-only Agent Chat framing in [Define analysis agent architecture](06-define-analysis-agent-architecture.md) and [Define Workspace persistence](08-define-workspace-persistence.md). Their transcript-fidelity and persistence requirements still apply, but Agent Chat belongs to the Workspace. A Scan Record associates the relevant entries with its Scan rather than owning a separate conversation.

### Scans and ordinary requests

An explicit Scan action with Scanning Effort selection starts a full Scan inside Agent Chat. It follows the established orientation, Review Pass, Discovery Pass, and gap-check protocol. Ordinary messages answer questions or make requested changes without automatically invoking that protocol.

Only one agent execution may be active per Workspace. While the agent is working, whether on a Scan or an ordinary message, the UI disables further messages, manual catalog mutations, and starting another Scan. The user may inspect results and history or press Stop. No message queue, mid-execution follow-up, or steering is part of this MVP. Sending another message becomes possible once execution ends, including after Stop has taken effect.

If the agent needs clarification, it asks in the conversation and yields so the user can reply. This does not create a separately managed task or introduce a new approval interface.

### Prompt-governed authority and context

The agent's prompt distinguishes questions from requests to change the catalog. Questions produce answers without catalog mutations. A change request authorizes immediate modifications within its stated scope, including permanent deletion when requested, without per-change preview or confirmation. If the conversation does not identify the intended flows or action sufficiently, the prompt instructs the agent to ask before changing anything.

These intent and scope rules are prompt-based, not enforced by code. The application does not add an intent classifier, selected-flow allowlist, or semantic authorization gate. The UI exclusion of overlapping work and the existing structural result validation are separate application behavior and remain in place.

The agent may inspect the whole current catalog and Repository to understand a request. Its working context includes the conversation and current Workspace state; prior chat descriptions must not substitute for the current catalog after manual or agent changes. It uses the existing generic local tools and prompt-governed Repository restrictions from [Define Repository data boundary](05-define-repository-data-boundary.md), including no Repository mutation and no dedicated arbitrary-network tool.

### Changes and Source Citations

Ordinary chat requests can authorize adding, editing, permanently removing, marking Outdated, reactivating, or reconsidering User Flows. The established durable-identity and lifecycle rules continue to apply; unlike a Scan, an ordinary request may authorize rewriting an existing flow's title or description.

- Wording-only edits preserve current citations.
- Creating a flow, materially changing its described behavior, marking it Outdated, or reactivating it requires inspecting source and supplying fresh supporting citations, replacing the current evidence for the changed judgment.
- An inconclusive reconsideration leaves the flow unchanged and explains why.
- Deletion requires no new citation.

The prompt governs semantic evidence sufficiency and the distinction between wording and behavior changes. Source Citation shape and location checks continue to use the existing validation contract. Manual editing retains its separately agreed citation behavior.

Use the existing app-private result handoff and per-result validation, idempotency, and atomic application contract for accepted chat-driven mutations as well as Scan results. Ordinary chat mutations must be identifiable independently of a Scan; the exact identifiers and storage design belong to [Choose application architecture](11-choose-application-architecture.md). This does not introduce catalog-wide staging, rollback, or direct edits to authoritative persistence by the agent.

### History, progress, and terminal outcomes

Retain user messages and the full observable agent transcript, including provider-returned reasoning, tool calls and outputs, applied result events, validation errors, compaction, and terminal events. Preserve the existing transcript ordering and streaming-checkpoint requirements. Show progress through Agent Chat, identify committed changes as they occur, and show usage or cost when returned by the provider under [Define model and cost controls](07-define-model-and-cost-controls.md). Do not imply an unavailable total is zero.

Stopping or failure retains every already committed change and the available history. After application exit, unfinished execution remains stopped and is recorded as interrupted; unapplied results must not be applied on restart. The conversation can continue afterward against the current catalog. No automatic retry or fallback framework is added; failures follow the later model-and-cost decision and retain the actionable error. Starting another Scan creates a new Scan Record.

Agent Chat history is retained until Workspace deletion, including historical mentions of permanently deleted flows. It is not User Flow revision history, a tombstone store, or a restoration mechanism. Workspace deletion purges its chat and associated execution data along with the existing Workspace-owned data. Existing Repository-availability and OpenRouter-configuration prerequisites remain applicable.

## Comments

### User decisions — first discussion round

- Use the Agent Chat for Scans, questions, and requests to change User Flows. Do not introduce a separate Curation Task concept or selected User Flows as attached context in the MVP.
- Preserve Agent Chat history.
- Wording-only agent edits preserve citations. Creating flows, materially changing described behavior, marking Outdated, or reactivating requires source inspection and fresh supporting citations. An inconclusive reconsideration leaves the flow unchanged with an explanation. Deletion requires no new citation.
- This broadens Agent Chat beyond the Scan-only definition in earlier decisions. Chat continuity, Scan interaction, and execution behavior remain under discussion; this ticket is not yet resolved.

### User decisions — second discussion round

- Each Workspace has one ongoing Agent Chat across completed Scans and application restarts. Preserve history and use working-context compaction as needed. Interrupted execution stays stopped; the user can continue the conversation afterward.
- An explicit Scan action with Scanning Effort selection starts a full Scan inside Agent Chat. Ordinary chat requests do not automatically trigger the full Review Pass and Discovery Pass.
- During a Scan, no user messages or steering are allowed in the MVP.

### User decisions — final discussion round

- Ordinary agent execution also disables messages, manual catalog edits, and starting a Scan until completion or Stop. Applied changes survive stopping or failure.
- Questions do not authorize catalog changes; change requests authorize immediate changes within their stated scope. Ambiguity is clarified through chat before mutation. The user explicitly requires these authority rules to be prompt-based, not enforced by code.
- The accepted answers complete this decision. The Answer above consolidates them with the existing result, persistence, and failure contracts.
