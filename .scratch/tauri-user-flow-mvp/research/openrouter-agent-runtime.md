# LangChain agent runtime with OpenRouter

Research date: 2026-09-07. This is a planning artifact for [Research OpenRouter agent runtime](../issues/14-research-openrouter-agent-runtime.md). Framework choice is settled by the user: LangChain. Language and application process boundaries remain recommendations for [Choose application architecture](../issues/11-choose-application-architecture.md).

## Recommendation

Use a TypeScript LangChain agent with a dedicated OpenRouter model adapter in an application-owned local runtime. Prefer a Node.js sidecar supervised by Tauri for the architecture discussion. Keep the provider adapter replaceable: the stock integration has useful functionality, but inspected upstream source does **not** establish compliance with the required unchanged reasoning-block round trip. A narrow adapter correction or custom LangChain chat-model implementation may be necessary. This preserves the LangChain agent choice.

TypeScript is the better default here because the application needs ordinary filesystem/shell operations, JSON schemas, streaming, and local orchestration, with no identified Python-specific requirement. It can share result and event types with a TypeScript frontend. These are engineering judgments, not a claim that Python is incapable or a locked architecture decision. Both languages have dedicated OpenRouter integrations. Tauri explicitly supports bundled Node/Python sidecars; using LangChain does not require a hosted LangGraph service or LangSmith. [JavaScript integration](https://docs.langchain.com/oss/javascript/integrations/chat/openrouter), [Python integration](https://docs.langchain.com/oss/python/integrations/chat/openrouter), [Tauri sidecars](https://v2.tauri.app/develop/sidecar/).

## Accepted constraints used in this investigation

The controlling local decisions are [Define analysis agent architecture](../issues/06-define-analysis-agent-architecture.md), [Define model and cost controls](../issues/07-define-model-and-cost-controls.md), [Define Workspace persistence](../issues/08-define-workspace-persistence.md), and [Define agent-assisted curation](../issues/09-define-agent-assisted-curation.md), with terminology from [CONTEXT.md](../../../CONTEXT.md).

The later decisions supersede earlier retry/budget suggestions: no automatic request retries, alternate-model fallback, capability/price preflight, live cost meter, or post-failure usage reconciliation. Invalid outbox events still return validation feedback for repair within active execution. This is ordinary agent work, distinct from retrying a failed network request.

The agent uses generic local tools and writes individual JSON events to an app-private file outbox. It does not receive direct authoritative-catalog mutation tools. The application enforces the Review Pass barrier, structural validation, idempotency, atomic application, execution exclusion, and terminal lifecycle. Repository and intent restrictions stay prompt-governed as already decided.

## Capability and ownership findings

| Requirement | Available runtime mechanism | Application responsibility |
| --- | --- | --- |
| One logical multi-turn Scan | JS `createAgent({ model, tools, middleware })`; Python `create_agent(...)` supplies the model/tool loop | Stable execution/Scan identity, prompt, orientation/review/discovery/gap protocol, terminal status |
| Generic local tools | JS `tool(fn, { schema: z.object(...) })`; Python callable/`@tool` definitions | Implement list/search/read/write/edit/shell, complete telemetry, cancellation and outbox acknowledgements |
| Stream text and activity | JS `agent.stream(..., { streamMode: ["messages", "updates", "custom"] })`; Python `agent.stream`/`astream` with analogous modes | Order and persist logical entries, checkpoint unfinished content, avoid duplicate recording across modes |
| Persistent conversation | Agent messages plus a checkpointer and `configurable.thread_id`, or application-supplied persisted context | Workspace identity/history, current catalog refresh, new execution after terminal outcomes |
| Same-session compaction | Summarization middleware or custom model middleware | Preserve current phase/accounting/catalog outside the lossy summary; archive original transcript separately |
| Structured result handoff | Schema libraries and tool feedback; optional agent structured-output facilities exist | File outbox acceptance and per-result transaction, including phase/identity/citation checks |
| Stop | JS run `signal` and provider fetch cancellation; Python asynchronous execution | Stop scheduler and tools, settle active work, prevent later commits, persist final status |
| Usage/cost | Provider usage response plus model metadata | Aggregate each returned request once; preserve missing/incomplete status |

LangChain documents the configurable agent loop, schema-defined tools, middleware state and structured final responses. Those facilities supply extension points, not this application's domain protocol. [Agents](https://docs.langchain.com/oss/javascript/langchain/agents).

Streaming `messages` carries model chunks, `updates` carries step results, and `custom` can carry tool progress via the writer. Capture model/tool IDs and structured payloads, not just the text convenience accessor. Python offers corresponding message/update/custom streams. [JavaScript streaming](https://docs.langchain.com/oss/javascript/langchain/streaming), [Python streaming](https://docs.langchain.com/oss/python/langchain/streaming).

Custom middleware has hooks around model and tool execution and before/after agent/model steps. An application can validate pending outbox files after generic writes or shell completion and return the exact acceptance/error acknowledgement before further model work. The precise hook arrangement remains implementation design. Structural rejection must not reserve an idempotency key or mutate current state. Ordinary tool/runtime failures should propagate to the terminal failure handler; do not install a catch-all middleware that converts every exception into a recoverable ToolMessage. [Custom middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/custom).

Final `responseFormat`/`response_format` output is not the required incremental file outbox. Provider-enforced JSON and tool schemas do not validate citation existence, line bounds, legal transitions, idempotency or transaction completion. Retain application validation even if structured model output is used elsewhere. No provider-native structured-response capability is needed merely to let the generic write tool produce JSON text.

## Provider fidelity is the critical integration constraint

OpenRouter returns reasoning detail arrays under `choices[].message.reasoning_details` or streamed `choices[].delta.reasoning_details`. Details can include text, summaries and encrypted data. Tool continuation requires preserving the complete consecutive block sequence without rearrangement or modification. Models differ in what reasoning they return; absent reasoning cannot be reconstructed. [OpenRouter reasoning tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).

Use the dedicated provider integration, not merely Python `ChatOpenAI(base_url=...)`: LangChain explicitly warns that generic OpenAI compatibility does not retain OpenRouter's extra reasoning fields. [Chat model integration guidance](https://docs.langchain.com/oss/python/integrations/chat).

Source inspection found these important qualifications:

- **JS inbound support is real.** The OpenRouter converter explicitly copies `reasoning` to `additional_kwargs.reasoning_content` and preserves `reasoning_details`; streaming chunks also carry those fields. Its outbound conversion delegates to the OpenAI completions converter. [OpenRouter message converter](https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/providers/langchain-openrouter/src/converters/messages.ts).
- **JS outbound fidelity is not established.** The inspected delegated converter emits ordinary message fields and tools, but does not copy `reasoning_details`; its standardized-content path similarly emits text/tool fields. Thus displaying reasoning successfully does not prove continuation compliance. The converter also exposes raw response capture internally, but that is not automatically enabled by the OpenRouter wrapper. [Delegated completions converter](https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/providers/langchain-openai/src/converters/completions.ts).
- **Python has a different limitation.** Its current source retains reasoning details, merges streaming fragments on output, and then strips `rs_` IDs from outbound reasoning objects. It exposes cost in `response_metadata`. It also has a documented `max_retries=2` default; at zero its client constructor omits `retry_config`. These source behaviors require explicit review against QA Assist's exact preservation and retry contracts. [Python adapter source](https://raw.githubusercontent.com/langchain-ai/langchain/master/libs/partners/openrouter/langchain_openrouter/chat_models.py).

These findings describe the moving upstream source retrieved on the research date, not a verified installed release. No package versions were installed, no commit snapshot was obtained, and no hosted model call was made. An implementation must pin the integration, core and runtime versions together and examine/test those exact artifacts. Neither language earns a blanket fidelity guarantee from a feature matrix.

Recommended boundary: retain each complete provider block as provider data alongside the display projection; assemble fragments by provider semantics without altering identifiers, signatures or opaque fields; use that preserved representation for continuation. Keep app-private raw **logical payloads**, not necessarily TCP/SSE frames. If adapter normalization loses required fields, capture them before normalization and repair/replace that adapter boundary. Do not deserialize everything into a reduced text-only message shape.

## Compaction and restart

JS `summarizationMiddleware` accepts a model, token/message/fraction triggers, retained-context settings and a custom summary prompt/token counter. Fraction triggers depend on model profile data. Defaults include approximate character-based counting and trimming the material sent to the summarizer; these defaults are insufficient evidence that required Scan state survives. Python has `SummarizationMiddleware`. [JS middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in), [Python middleware](https://docs.langchain.com/oss/python/langchain/middleware/built-in).

Use the same configured OpenRouter model instance for summarization so it obeys the application-wide model and retry policy. Count its returned usage with other requests. Preserve orientation, remaining review identities, applied event IDs, activity and current catalog independently of the generated summary, then reintroduce the authoritative state. Compact only completed conversational segments; keep an active tool exchange and its required reasoning blocks intact. Emit the actual continuation summary as a collapsed transcript event. These are QA Assist integration requirements, not middleware defaults.

The JS adapter's inspected profile lookup uses bundled static data and may return an empty profile. A fixed token/message trigger can work without a metadata request, but cannot guarantee compatibility with every arbitrary model context size. The architecture must define a conservative local context policy and handle genuine context-limit failure immediately; it cannot quietly introduce a preflight lookup, repeated overflow retries, or a new user budget. JS source also shows direct `fetch` with `options.signal`, and a legacy streaming path that skips chunks without `choices[0].delta`; usage-only events require a contract probe. [JS model source](https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/providers/langchain-openrouter/src/chat_models/index.ts).

LangChain checkpointers retain thread state across turns; in-memory savers do not survive process exit. Tool-call and tool-result pairing must remain valid when trimming messages. [JS memory](https://docs.langchain.com/oss/javascript/langchain/short-term-memory), [Python memory](https://docs.langchain.com/oss/python/langchain/short-term-memory).

For QA Assist, model working context/checkpoints are separate from the authoritative Agent Chat transcript. On restart mark unfinished execution Interrupted, discard unapplied outbox entries and never replay pending graph work. Rebuild continuation context for a **new** execution from completed history/current state, recording how unfinished tool exchanges were terminated or omitted from working context while retaining them in the transcript. A persistent LangGraph checkpoint must not implicitly resume an interrupted Scan. This behavior needs application supervision even if persistent checkpointing is selected.

## Hidden defaults, Stop and usage

Set JS model constructor `maxRetries: 0`; its documented default is six. Do not install retry, fallback or model/tool-call-budget middleware. Do not assume setting retries only on the outer agent changes the model transport. [ChatOpenRouter constructor reference](https://reference.langchain.com/javascript/langchain-openrouter/ChatOpenRouterInput).

Python deserves additional verification: the inspected OpenRouter SDK uses a default one-hour backoff window when both per-operation retries and client retry configuration are omitted. Explicit `retries=None` or client `retry_config=None` bypasses that selection in the inspected source. Combined with the adapter's omission at `max_retries=0`, this is a source-level reason to test the actual transport, not trust the high-level option alone. It is not a demonstrated bug in every released package. [OpenRouter Python SDK chat source](https://raw.githubusercontent.com/OpenRouterTeam/python-sdk/main/src/openrouter/chat.py).

LangGraph has a finite graph-step limit; current JS graph documentation gives a default of 25 and exposes `recursionLimit`. Raising it to another fixed count still imposes a ceiling. The selected pinned runtime must demonstrate a supported effectively unbounded execution configuration or equivalent same-execution driver consistent with the accepted no-call-ceiling contract. No tested unlimited setting is established by this research. Do not start fresh Scans to reset the counter or report a recursion error as successful completion. [Graph recursion limit](https://docs.langchain.com/oss/javascript/langgraph/graph-api).

JS agent execution accepts `signal`; OpenRouter call options expose `AbortSignal`. The application must propagate Stop through the run, requests and local subprocess/file tools, wait for settlement, and stop scheduling further steps. Aborting an HTTP request cannot undo already committed results. Do not replace Stop with LangGraph's resumable human-approval interrupt. [Agent implementation](https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain/src/agents/ReactAgent.ts), [OpenRouter call options](https://reference.langchain.com/javascript/langchain-openrouter/ChatOpenRouterCallOptions).

OpenRouter cancels streaming by connection abort, but upstream processing/billing termination depends on the provider. This establishes best-effort request cancellation, not a promise of zero additional cost. [OpenRouter cancellation guidance](https://openrouter.zendesk.com/hc/en-us/articles/51691588409883-How-do-I-cancel-a-streaming-request-and-which-providers-stop-billing-when-I-do).

OpenRouter returns native token counts and account cost in `usage`; current docs say final streaming usage is automatic and older include-usage flags are deprecated. The generation lookup endpoint exists but is outside this MVP. Aggregate returned usage once per model request, including compaction; do not add reasoning tokens again to completion tokens. Preserve exact provider cost instead of estimating from prices. An aborted stream may never yield its final usage: show the available subtotal as incomplete or unknown, not zero or a reconciled total. [Usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting).

## Tauri implications and focused implementation checks

Tauri uses a Rust core and system WebView; a WebView does not supply a Node process. A Node sidecar keeps model execution independent of UI rendering. Browser-hosted LangChain with Rust-backed tools is another possible JS arrangement, but requires deliberate credential transport, lifecycle and tool bridges. Python likewise needs a local runtime/embedded interpreter or sidecar. Tauri supports target-specific external binaries and Rust-side stdin/stdout communication. Packaging and parent-exit supervision remain work; neither language removes them. [Tauri architecture](https://v2.tauri.app/concept/architecture/), [Sidecar packaging and communication](https://v2.tauri.app/develop/sidecar/).

Choose application architecture must assign one authority for persistence and result transactions, the sidecar ownership/lifecycle, serialized event and cancellation protocol, context reconstruction, phase gating, and provider fidelity. Avoid duplicate catalog authority across Rust and the agent runtime. Keep the startup configuration source in the QA Assist application root; do not accidentally load the analyzed Repository's environment.

Before building on the selected versions, run focused contract probes:

1. Stream text, text/summary/encrypted reasoning and tool calls; compare assembled provider blocks to the next outbound tool-continuation request, including unknown fields, IDs, signatures and multiple indexes.
2. Inject HTTP failure and midstream error; assert exactly one request and no fallback, including summarization. Distinguish valid repair feedback from terminal transport/tool failure.
3. Capture usage-only and duplicate terminal chunks; assert actual model ID, cost and token totals survive and are counted once.
4. Run beyond the default graph-step limit while compacting; retain one execution/Scan identity and phase barrier/accounting.
5. Stop during model streaming, a local subprocess and outbox commit races; no subsequent tool scheduling or post-terminal mutation, with committed partial results retained.
6. Exit with partial text, pending tool calls and both committed/uncommitted outbox files; restart retains checkpointed history, applies nothing new, and a new message starts new execution against current catalog.

These checks are proposed implementation validation, not tests performed in this planning session. Their purpose is to close specific adapter/runtime integration uncertainties, not reopen LangChain selection or expand product scope.

## Architecture-session follow-up — 2026-09-07

A further read-only source inspection found a candidate for the no-finite-step-ceiling requirement: set `recursionLimit: Infinity` locally in the Node invocation configuration. The inspected [ReactAgent implementation](https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain/src/agents/ReactAgent.ts) forwards configuration; the [Pregel guard](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/langgraph-core/src/pregel/index.ts) rejects absent or less-than-one limits without requiring a finite number; and the [loop](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/langgraph-core/src/pregel/loop.ts) calculates its stop threshold using addition and checks whether the step exceeds it. Positive infinity therefore appears to remove that particular finite stop condition. This is an inference from mutable source, not documented or tested unlimited-mode support. Keep the value inside Node: JSON serialization would convert it to `null`. Pin exact packages and verify propagation and behavior before relying on it.

If the selected packages cannot support that configuration, a same-execution application-owned loop using [LangChain model streaming and tool calling](https://docs.langchain.com/oss/javascript/langchain/models) is an architectural alternative. It would retain the same execution identity, run the same result/phase/cancellation protocol, and compact before successive model calls. This alternative requires an explicit architecture choice; it is not a provider fallback or a retry after an execution has failed.

The inspected [OpenRouter model implementation](https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/providers/langchain-openrouter/src/chat_models/index.ts) resolves model profiles from a bundled local table and returns an empty profile when unknown. Compaction can therefore use locally available context metadata without a network preflight, with an absolute estimated-token trigger for unknown identifiers. Such a fallback cannot guarantee compatibility with arbitrary context sizes.

The inspected [summarization implementation](https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain/src/agents/middleware/summarization.ts) catches summary-generation errors and returns an error string that can replace earlier working history. This conflicts with terminal model-failure handling. Use application-owned compaction behavior that propagates failure and replaces working context only after a successful summary; retain original transcript and authoritative execution state independently.

No installed-package or hosted-model probes were run. The inspected LangGraph source manifest advertised `1.4.15-rc.0`; no exact matching commit was captured. These findings refine the architecture options while preserving the pinned-version contract-probe requirement.

## Capture limitations

The working folder is not a Git repository, so the research skill's throwaway branch capture was unavailable. No repository was initialized. This local Markdown file is the context pointer. Primary documentation and upstream source were inspected through the web tool; source URLs point at mutable branches, so record exact dependency versions/commit identifiers when implementation begins. No application code or runtime prototype was created.
