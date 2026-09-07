# 03: Hold a persistent Agent Chat

**What to build:** Send an ordinary message in a Workspace's ongoing Agent Chat, receive and retain an OpenRouter response, stop or recover from a failed attempt, and continue the conversation after restart while other Workspaces remain independent.

**Blocked by:** [02: Manually curate User Flows](02-manually-curate-user-flows.md).

**Status:** resolved

- [x] Load required application-wide OPENROUTER_API_KEY and exact OPENROUTER_MODEL at startup from the explicit application-root environment configuration. Provide an example configuration, ignore real credentials, never load values from a Repository or tool working directory, and require restart for configuration changes.
- [x] Keep credentials out of frontend configuration and execution metadata. Missing configuration or unavailable Repository blocks hosted execution while stored data and idle manual curation remain accessible. There is no built-in model default, settings UI, provider preflight, or application fallback.
- [x] Sending a message creates a durable Agent Execution ID of ordinary-chat kind and appends to the Workspace's single Agent Chat. Include current catalog state and valid prior conversation context. Terminal work is never resumed; a later message or explicit Retry starts a new execution.
- [x] Use the selected LangChain runtime and application-owned OpenRouter adaptation. Persist complete logical provider content before display normalization, retaining ordered and unknown/opaque fields and provider-returned reasoning needed for continuation. Reasoning is collapsed but inspectable; do not invent unreturned content.
- [x] Stream and persist a typed, monotonically ordered transcript with user messages, observable agent replies, and application lifecycle events. Checkpoint unfinished content, mark retained partial entries unfinished after interruption, and recover current state and persisted events after UI reload.
- [x] Retain and display provider-returned usage/cost once per request. Missing or partial totals remain unavailable/incomplete, not zero; add no live cost meter or reconciliation requests.
- [x] Set zero retries at the actual model transport. Authentication, credit, model, capability, rate-limit, and network failures come from the actual request, end that execution, preserve the original actionable error and history, and allow a new attempt after correction.
- [x] Enforce one active Agent Execution per Workspace in application state, not only disabled buttons. Disable new messages and manual mutations while busy; keep inspection and Stop available. Questions request answers without catalog mutations, and ambiguous requests can ask for clarification and yield.
- [x] Stop records a cancellation request, aborts the in-flight model request when possible, prevents further scheduling, and records Cancelled only after settlement. Preserve recorded content and do not imply guaranteed provider-side cancellation or zero cost.
- [x] Support concurrent ordinary conversations in different Workspaces. Switching Workspaces leaves active work running; Stop or ordinary failure affects its execution only. Preserve execution-scoped ordering and state during navigation.
- [x] Persist Running, Completed, Cancelled, Failed, and Interrupted lifecycle outcomes. Runtime failure is application-wide and requires restart. Startup finalizes leftover Running executions as Interrupted without automatic replay or resumption.
- [x] Extend host supervision so app exit and parent loss stop provider scheduling and checkpoint available content where possible. Do not invent a shutdown grace period or window-close policy; later tool execution uses the same ownership and shutdown path.
- [x] The Curator flow list and Agent Chat share a column and can each minimize independently to an accessible header. Chat is resizable; restoring panels retains the session's split size, selected flow, and unsent draft. Session navigation preserves drafts, while restart resets incidental UI state.
- [x] Conversation history persists indefinitely until Workspace deletion. The storage note reflects app-private unencrypted storage and potentially retained source content; do not introduce a Repository-safety consent workflow.

## Scope and sources

This slice delivers ordinary conversation about supplied/current catalog context. Repository tool use is ticket 04, compaction is ticket 05, and catalog-changing requests become available in tickets 06–07. Use the accepted module interfaces so those slices extend the same conversation and execution lifecycle.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 9, 42–43, 45, 50–62, 64–69; Implementation Decisions 3–4, 13, 18–22, 25, 27–28. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

## Comments

### Implemented — 2026-09-07

Delivered ordinary Agent Chat through shared typed commands and ordered change
notifications, Workspace-owned SQLite history, the Execution coordinator, and an
application-owned OpenRouter adapter using LangChain model streaming. Persisted
provider frames precede normalization; native continuation messages retain
reasoning and opaque fields separately from displayed content. Each request owns
one usage snapshot and one cancellation signal, with no transport retry.

The Curator column now supports independent panel minimization, keyboard/pointer
resizing, session drafts and split sizes, retained reasoning/provider inspection,
and Stop/Retry. Manual mutations check persisted execution state transactionally.
Shutdown interrupts active work, and startup finalizes leftover Running attempts
without resumption. Configuration comes only from the explicit checkout-root
`.env`, and schema version 3 rejects older stores non-destructively.

Validation: shared/runtime/frontend TypeScript compilation and `pnpm build`,
including the native macOS bundle. The required separate Standards and Spec
reviews identified one maintainability suggestion and two Spec defects (network
cause retention and both panels minimized); all were corrected and re-reviewed.
The checkboxes record implementation, not experimental provider/native proof.
No verification suite, paid model request, or deferred probe was introduced or
run. Repository tools and later agent features remain in their own tickets.
