Type: research
Status: resolved
Blocked by: 06, 09

## Question

What do current first-party OpenRouter and LangChain documentation establish about implementing one logical multi-turn Scan with generic local tools, streamed text, reasoning and tool activity, preserved reasoning blocks, same-session context compaction, schema-validated result handoff, cancellation, provider-returned usage capture, and complete persistent transcript capture, and what constraints must the later application-architecture decision account for?

Evaluate how the runtime supports the persistent Workspace conversation, explicit Scan execution, and ordinary chat requests resolved in [Define agent-assisted curation](09-define-agent-assisted-curation.md), including continuing the conversation after restart without resuming interrupted execution.

Honor [Define model and cost controls](07-define-model-and-cost-controls.md): no automatic retries, fallback, model or price preflight, or reconciliation of usage missing from failed or cancelled requests. Identify framework defaults that conflict with those decisions. Compare LangChain language and local-hosting implications as input to the later architecture decision, without reopening the user's framework choice.

## Comments

- 2026-09-07: The user has chosen a LangChain agent. Research LangChain's fit and integration constraints with OpenRouter; framework selection is settled. Language, local process boundary, and persistence ownership remain application-architecture decisions.
- 2026-09-07: The user has no TypeScript/Python preference and requests a recommendation based on fit.

## Answer

LangChain is the settled framework choice. The [LangChain agent runtime with OpenRouter research](../research/openrouter-agent-runtime.md) records the primary-source findings, capability and ownership comparison, integration constraints, and proposed implementation checks.

Recommend a TypeScript LangChain agent in a local Node.js runtime supervised by Tauri. Both TypeScript and Python have dedicated OpenRouter integrations; TypeScript fits the proposed typed frontend/tool/event interfaces without an identified Python-specific need. This is a recommendation for [Choose application architecture](11-choose-application-architecture.md), not a user-approved language or process-boundary decision.

The application must own the full persistent Agent Chat, execution lifecycle, current catalog, Review Pass barrier, file-outbox validation, and atomic result application. LangChain supplies the model/tool loop, streaming and middleware; its working context and checkpoints cannot substitute for the transcript or resume terminal execution.

The architecture must explicitly account for these findings:

- The inspected stock adapters do not establish unchanged OpenRouter reasoning-block round trips. Budget a narrow provider adapter correction or replacement within LangChain, with lossless logical provider payload capture and verification against pinned versions.
- Disable retries at the actual transport, including compaction calls. Documented defaults and the inspected Python adapter/SDK interaction require verification; repair of invalid outbox events remains allowed within active execution.
- LangGraph's finite step limit and compaction's context-size assumptions need an explicit integration strategy compatible with no resource ceilings and no model preflight. This research does not establish a tested unlimited runtime configuration.
- Propagate cancellation through model requests and local tools, supervise helper-process exit, and reject results from terminal execution. Retain committed partial results and checkpointed transcript content.
- Capture only provider-returned usage and cost, including compaction, without double counting or post-failure reconciliation. Preserve missing usage as unavailable or incomplete.

This resolves the documentation investigation, not an implementation proof. Sources include mutable upstream code; no packages were installed or hosted-model calls made. The report supplies focused contract probes for implementation. The working folder has no Git repository, so the local research artifact is the context pointer and no throwaway branch was created.
