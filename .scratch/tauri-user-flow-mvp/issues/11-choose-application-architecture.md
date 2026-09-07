Type: grilling
Status: resolved
Blocked by: 04, 06, 08, 09, 10, 14

## Question

Which frontend stack, Tauri/Rust boundary, module seams, persistence implementation, background-job mechanism, and typed interfaces make the accepted MVP behavior straightforward to implement, test, and extend to other desktop platforms later, while satisfying the current-state, append-only history, atomic-result, and restart contract in [Define Workspace persistence](08-define-workspace-persistence.md)?

Account for [Define agent-assisted curation](09-define-agent-assisted-curation.md): one persistent Workspace conversation, associated Scan Records, ordinary chat execution and mutation identities, shared result application, and prompt-governed semantic authority.

The user has chosen a LangChain agent. Decide its language, local process boundary, and integration with application-owned persistence using [Research OpenRouter agent runtime](14-research-openrouter-agent-runtime.md); framework selection is settled.

The research recommends TypeScript in a Tauri-supervised Node.js runtime; the user has no language preference and asks for the best fit. Resolve ownership of the provider adapter and lossless transcript capture, a runtime step-limit policy consistent with no resource ceilings, and context compaction without model preflight. Carry the research's pinned-version contract probes into implementation acceptance, including cancellation, transport retries, reasoning-block continuation, usage capture, and restart behavior.

## Comments

### Architecture discussion opened — 2026-09-07

Claimed for the current wayfinder session. The first discussion round proposes two independent choices, pending the user's response:

- Use TypeScript for application logic and the LangChain agent in a local Node.js process supervised by Tauri. Keep Rust focused on desktop integration, process supervision, and communication with the frontend. Application-owned modules would validate and persist agent results separately from the LangChain loop. This is an ownership separation, not a process sandbox.
- Use React, TypeScript, and Vite for the frontend, carrying forward the accepted Curator prototype's appearance and behavior.

After these choices, resolve persistence implementation, module interfaces, process communication, execution identity and lifecycle, provider fidelity, and the step-limit/compaction strategy. The existing research's contract probes remain implementation acceptance inputs. No architecture choice has yet been accepted, and no application scaffolding has begun.

### Application structure and frontend accepted — 2026-09-07

The user accepted both first-round recommendations:

- TypeScript application logic and LangChain execution in a local Node.js process supervised by Tauri; Rust handles native desktop integration, process supervision, and frontend communication. Application-owned validation and persistence remain separate from the LangChain loop.
- React, TypeScript, and Vite for the production frontend, preserving the accepted Curator design and interactions.

These supersede the pending status of the first-round proposals above. This ticket remains claimed while the remaining architecture decisions are discussed; no implementation is authorized by this planning resolution.

### Second-round proposals — pending

- Q3: One app-private SQLite database for all Workspaces, owned exclusively through TypeScript application persistence modules in the Node process. Store catalog state, history, transcript content, and accepted-result identities together so each accepted result can commit atomically. Retain per-execution file outboxes as transient handoff data. SQLite's transaction contract supports the required all-or-nothing commit: https://www.sqlite.org/transactional.html.
- Q4: Typed commands and ordered events over the Node process's stdin/stdout, bridged by Rust through Tauri commands/channels. Share TypeScript schemas between frontend and runtime and validate messages at runtime. The frontend receives committed state and progress; it never opens the database. Process logs use stderr. Reconnect/reload obtains current state and persisted events rather than assuming every live notification arrived.
- Q5: One running application instance with one supervised Node process, supporting one active agent execution per Workspace and concurrent work in different Workspaces. Switching Workspaces leaves existing work running while the application is open; quitting terminates all execution under the established interruption contract. Launching another app instance focuses the existing window. Tauri provides the single-instance mechanism: https://v2.tauri.app/plugin/single-instance/.
- Q6: Preserve layout, selected flow, and unsent drafts while navigating during an app session, but reset these incidental UI choices to defaults after restart for the MVP. Persist all accepted Workspace/catalog/chat/Scan data as already required. Persisting drafts and layout across restarts would require an explicit expanded choice here.

A read-only investigation is checking the remaining LangGraph step-limit and context-compaction facts before proposing that dependent runtime policy. None of these second-round proposals is accepted yet.

### Persistence, communication, concurrency, and UI state accepted — 2026-09-07

The user accepted all four second-round recommendations (Q3–Q6):

- One app-private SQLite database for all Workspaces, owned through TypeScript application persistence modules in Node, with atomic accepted-result transactions and transient per-execution file outboxes.
- Typed commands and ordered events across React, Tauri, and Node, using stdin/stdout for the Node connection, shared TypeScript schemas and runtime validation, stderr for process logs, and persisted-state catch-up after UI reload.
- One application instance and supervised Node process, with one active agent execution per Workspace and concurrent execution across different Workspaces. Switching Workspaces leaves work running while the app stays open; app exit follows the established interruption contract. A second launch focuses the existing window.
- Session-only preservation of incidental UI state, including panel sizes, selected flow, and unsent drafts. These reset after restart; required Workspace data remains persistent.

These supersede the pending status of Q3–Q6 above. Remaining module, execution-identity, and agent-runtime choices are still open.

### Modules and runtime policy accepted — 2026-09-07

The user accepted all four third-round recommendations (Q7–Q10), completing the architecture discussion. The resolution below consolidates all ten accepted choices. Earlier comments describing proposals as pending are historical and superseded by this answer.

## Answer

### Application structure and frontend

Use React, TypeScript, and Vite to implement the accepted Curator design. Run TypeScript application logic and LangChain in one local Node.js process supervised by Tauri. Rust owns native desktop integration, process supervision, and frontend communication; application validation and persistence remain separate from the LangChain loop. These modules are an ownership separation, not a sandbox for the agent's general tools.

This keeps most application behavior and shared contracts in TypeScript while separating agent execution from UI rendering. The accepted tradeoff is explicit process communication and shutdown coordination. Native integration stays in the host so other desktop platforms can be considered later without adding them to the MVP.

### Persistence and process communication

Use one app-private SQLite database for all Workspaces, accessed only through TypeScript application persistence modules in Node. Store authoritative mutable catalog state, citations, Agent Executions, Scan Records, ordered Agent Chat, historical results, and accepted-result identities together. Preserve the versioned initial schema and compatibility/deletion rules from [Define Workspace persistence](08-define-workspace-persistence.md); no migration framework or recovery UI is added.

Each accepted result transaction commits the idempotency marker, historical result, current catalog/citation change, and transcript result event together. Publish it as applied only after commit. Retain the file outbox as transient per-execution handoff data; invalid events remain repairable during active execution and do not reserve their keys. Never replay unapplied files after interruption. The current catalog is not reconstructed from history.

Connect React to the Node runtime through typed Tauri commands and ordered events. Rust bridges Node stdin/stdout; process logs use stderr. Share TypeScript schemas between frontend and runtime, and validate messages at runtime. Requests and replies must be correlated; Workspace and Agent Execution identities scope execution events. Persisted transcript ordering supports state catch-up after UI reload so missed live notifications do not lose accepted state. The frontend never opens the database or becomes a second catalog authority.

Use one application instance with one supervised Node process. Launching another instance focuses the existing window. Enforce one active Agent Execution per Workspace, while allowing executions in different Workspaces to run concurrently. Switching Workspaces leaves existing work running while the app remains open. Manual mutations and new agent work in the busy Workspace follow the existing exclusion rules; inspection and Stop remain available.

Preserve panel sizes, selected flow, and unsent drafts during navigation within the app session. Reset incidental UI state after app restart; required Workspace, catalog, Agent Chat, and Scan data persist.

### Module interfaces and Agent Execution

Use four application modules behind the frontend's typed commands and ordered events:

| Module | Responsibility and interface |
| --- | --- |
| Workspace application | Open/read/relink/delete Workspaces; query and manually mutate the catalog; read/checkpoint ordered Agent Chat; validate and atomically apply agent outbox results. Own SQLite access and transaction rules internally. |
| Execution coordinator | Start a Scan or ordinary chat execution, Stop it, and report lifecycle. Own per-Workspace exclusion, execution identities, Review Pass accounting and the discovery barrier, terminal transitions, and startup interruption recovery. |
| Agent runtime | Execute the supplied context and protocol through LangChain; stream model/tool activity and return completion or failure. Keep provider adaptation and compaction inside this module, with injectable provider/tool dependencies for contract tests. |
| Repository access | Supply generic file/shell tools and citation-location/fingerprint checks, with activity reporting and cancellable operations. Preserve the agreed prompt-governed restrictions. |

Give every explicitly submitted Scan or ordinary chat request one durable **Agent Execution** ID and kind, with an optional associated Scan ID. Agent Chat entries, usage, and result provenance reference the execution; the Workspace owns the conversation. Key accepted outbox events by `(execution ID, result-event ID)` for both kinds, replacing the earlier Scan-only key. Retry is a new execution; a Scan retry also creates a new linked Scan Record. Internal model/tool turns and compaction retain the execution ID.

Workspace application transactions check persisted execution/phase state when accepting results or manual mutations. The coordinator uses the same transactional persistence path for lifecycle and phase transitions, so terminalization and result application serialize consistently. Validation that requires source reads occurs before a short transaction; transaction-sensitive identity, phase, and state checks are repeated within it. UI state is a projection, never a second catalog authority. Application and contract tests cross these same interfaces; production database/transport adapters and controlled test substitutes supply real variation at internal seams.

### Provider fidelity and compaction ownership

Use an application-owned OpenRouter adapter inside LangChain that preserves the complete logical provider payload before display normalization, round-trips required reasoning/tool blocks unchanged, and reports provider-returned usage once per request. Prefer the stock integration only where pinned-version probes demonstrate compliance; repair or replace its narrow adapter as necessary. Set and verify zero retries at the actual transport, including summary calls; install no model fallback or post-failure usage reconciliation.

Use application-owned compaction with the same configured model. Persist full original Agent Chat separately; keep current catalog, Scan phase/accounting and accepted-event identities outside the lossy summary; retain active tool exchanges and required provider blocks intact. Replace working context only after successful summary generation and record the actual summary. Compaction failure terminates execution under the existing failure contract.

Use only bundled local context metadata when available; otherwise use a conservative fixed estimated-token trigger. Size the whole assembled request, reserving space for response and required state; compact completed segments in bounded pieces where necessary. Exact counting and thresholds are implementation constants to verify against the selected packages/model, not user budgets or resource ceilings. An actual context overflow or context that cannot fit without breaking required block integrity fails clearly, with no preflight, overflow retry, or silent transcript truncation. New executions reconstruct valid working context from persisted completed history/current state without resuming old graph work.

The [runtime research follow-up](../research/openrouter-agent-runtime.md#architecture-session-follow-up--2026-09-07) documents the stock summarization error-handling conflict and local profile mechanism. These source findings motivate the accepted application-owned compaction policy; they do not replace pinned-package verification.

### No finite graph-step ceiling

First try LangChain's agent with `recursionLimit: Infinity` configured entirely inside Node. Source inspection supports it as a candidate, not a documented guarantee. Make pinned-package probes a prerequisite for implementation acceptance.

If the chosen packages cannot satisfy the contract, select an application-owned same-execution loop using LangChain model streaming and tool interfaces during implementation. This preserves the selected framework and the same execution, phase, result, context, cancellation, and error contracts. It is a preselected implementation alternative, not a runtime fallback after failure. Do not reset counters by creating fresh Scans or substitute another finite call ceiling.

### Supervision and failure scope

An ordinary model/tool failure terminates its execution only; other Workspaces continue. Stop propagates to that execution's model requests and local tools, stops further scheduling, waits for settlement, and records Cancelled. Serialize terminal transitions against accepted-result transactions; committed partial results remain. Subprocess tools have execution-specific process ownership so cancelling one does not kill another Workspace's tools.

If the shared Node runtime dies or becomes unusable, show an application-runtime failure and require an app restart for the MVP. Every still-Running execution is finalized Interrupted during startup recovery; preserve committed results/checkpointed history and discard unapplied outboxes. Do not automatically rerun a request. App shutdown prevents new work, supervises tool/child exit, checkpoints available content when possible, and leaves unfinished executions Interrupted on recovery. Parent-connection loss also stops Node scheduling and shuts down its tools. A hung runtime may require terminating its whole process tree, affecting every Workspace; the UI must make that scope clear.

Keep configuration loading in the application startup path: pass the explicit application-root `.env` location to the runtime, never infer it from the selected Repository or a tool working directory, and never send the credential to the frontend or store it as execution metadata. Exact development launch/build commands belong to the following development-contract ticket.

### Implementation acceptance and next decisions

Subsequent scope refinement: the user deferred diagnostics and verification in [Define macOS development contract](12-define-macos-development-contract.md#toolchain-commands-shared-data-and-deferrals--2026-09-07). The verification requirements below and earlier in this answer are retained as historical proposals for later work; they are no longer mandatory gates for this MVP phase. The intended runtime and persistence behavior remains the architecture contract, and none of these checks is represented as completed.

Pin the runtime, LangChain, model adapter, and related dependency versions together and verify their actual behavior before building on the integration. The [runtime research](../research/openrouter-agent-runtime.md) supplies the detailed contract probes; implementation acceptance must cover:

1. Lossless streamed provider-block assembly and reasoning/tool continuation, including opaque and unknown fields.
2. Exactly one transport attempt on model and compaction failure, no fallback, and terminal compaction errors that never replace working history with an error string.
3. Provider-returned usage-only and duplicate terminal events, correct once-per-request accounting including summaries, and incomplete usage after failure or cancellation.
4. Execution beyond the default graph-step limit with compaction, a stable Agent Execution/Scan identity, and preserved Review Pass accounting and discovery gating. Verify the chosen unlimited configuration or accepted application-owned driver against the pinned packages.
5. Atomic result replay and failure injection, including ordinary chat result keys, rejected-event repair, concurrent lifecycle transitions, and cancellation/commit races.
6. Independent work in two Workspaces: Stop or ordinary failure in one leaves the other running; global runtime loss produces an explicit failure and interruption on restart.
7. UI reload catches up from persisted state; app restart retains committed results and checkpointed partial transcript, discards unapplied outbox files, and never resumes terminal work. A new request uses a new execution against current state.
8. Parent exit, runtime failure, and local subprocess cancellation leave no application-owned execution continuing in the background. Configuration is read from the application root and never exposed through frontend configuration or execution metadata.

These are required implementation checks, not tests run in this planning session. Exact dependencies, database binding, framing details, checkpoint cadence, and context-counting constants are implementation selections constrained by these contracts. The accepted alternative driver resolves the step-limit design contingency without claiming the proposed Infinity configuration has already passed.

[Define macOS development contract](12-define-macos-development-contract.md) now settles local prerequisites, launch/build commands, runtime provision, and diagnostics for this architecture. [Define MVP acceptance specification](13-define-mvp-acceptance-specification.md) settles the final specification structure, implementation decomposition, and observable verification plan. No application code or scaffolding was created by this decision.
