# OpenRouter and initial model capabilities

Checked against first-party OpenRouter and DeepSeek sources on 2026-09-02.

## Executive answer

The requested model exists on OpenRouter. Its exact request identifier is `deepseek/deepseek-v4-flash-0731`. OpenRouter describes it as the GA release of DeepSeek V4 Flash, currently lists multiple routed providers, a 1,310,720-token context window, a 393,216-token maximum completion, function calling, and JSON-Schema structured output. The [OpenRouter model page](https://openrouter.ai/deepseek/deepseek-v4-flash-0731) is the first-party source for the OpenRouter identifier and current routed capabilities.

There is an important naming distinction: DeepSeek's own API accepts `deepseek-v4-flash`, while its current documentation names the backing version `DeepSeek-V4-Flash-0731`. It does **not** document `deepseek-v4-flash-0731` as its direct-API request name. DeepSeek lists a 1M context, up to 384K output, JSON output, tool calls, and both thinking and non-thinking modes for this family. See [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/).

For this MVP, use the pinned OpenRouter identifier `deepseek/deepseek-v4-flash-0731` as the recommended default, but discover and validate it at runtime rather than treating a hard-coded catalog entry or price as permanent.

## Candidate and initial alternatives

| Role | OpenRouter request identifier | Context / maximum completion | Tool and structured-output support | Current displayed price per 1M tokens* |
| --- | --- | --- | --- | --- |
| Recommended default | `deepseek/deepseek-v4-flash-0731` | 1,310,720 / 393,216 | `tools`, `tool_choice`, JSON Schema in `response_format` | from $0.05 input / $0.16 output; cache read from $0.013 |
| Higher-cost DeepSeek option | `deepseek/deepseek-v4-pro-0813` | 1,048,576 / 393,216 | `tools`, `tool_choice`, JSON Schema in `response_format` | from $0.5808 input / $1.742 output; cache read from $0.05808 |
| Premium, vendor-diverse option | `openai/gpt-5.4` | 1,050,000 / 128,000 | `tools`, `tool_choice`, JSON Schema in `response_format` | $2.50 input / $15 output; cache read $0.25 |

\*These are observations, not a price contract. OpenRouter routes a model to multiple endpoints whose price and availability can differ and change. The cited model pages currently list 30 providers for [DeepSeek V4 Flash 0731](https://openrouter.ai/deepseek/deepseek-v4-flash-0731), 17 for [DeepSeek V4 Pro 0813](https://openrouter.ai/deepseek/deepseek-v4-pro-0813), and multiple providers for [GPT-5.4](https://openrouter.ai/openai/gpt-5.4). The Models API's price is the current top-provider price, not necessarily the price of every eligible route.

The default should remain the user's requested Flash model. Pro is a suitable opt-in candidate for testing a more expensive “maximum effort” configuration within the same provider family; its quality advantage must be established by the product's acceptance testing rather than assumed from its name. GPT-5.4 is a useful premium cross-provider-family comparison because OpenRouter presents it as a software-engineering model with a similarly large context; it should not be the cost-default.

## Capability findings

### Availability and model discovery

OpenRouter provides `GET /api/v1/model/{author}/{slug}` for exact lookup and returns `404` when the identifier neither exists nor resolves as an alias. Its model object includes `id`, permanent `canonical_slug`, `context_length`, `pricing`, `top_provider`, `supported_parameters`, and `expiration_date`. See [OpenRouter's Models API guide](https://openrouter.ai/docs/guides/overview/models) and [single-model API reference](https://openrouter.ai/docs/api/api-reference/models/get-model).

The app should therefore:

1. validate a configured model identifier through exact lookup before starting a scan;
2. reject missing/expired models with an actionable configuration error;
3. snapshot the returned canonical slug, context, supported parameters, and displayed pricing into the scan record;
4. also retain the requested identifier, because a mutable alias and a dated identifier do not have the same reproducibility properties.

OpenRouter load-balances across eligible providers and normally allows fallback providers. `provider.require_parameters: true` restricts routing to endpoints that support every requested parameter. Provider preferences can also deny data-collecting routes or require zero-data-retention endpoints, but those filters can reduce available routes. See [Provider Routing](https://openrouter.ai/docs/guides/routing/provider-selection).

### Tool use and repository safety

OpenRouter standardizes OpenAI-style `tools` and `tool_choice`, and the requested model's page explicitly reports both. The model proposes a tool call; the application executes it and returns the result. See [Tool & Function Calling](https://openrouter.ai/docs/guides/features/tool-calling).

That separation is the correct enforcement boundary for a read-only scanner: expose only narrow read/list/search repository tools, validate all paths inside the selected repository, and never expose write or shell tools. “The model is instructed not to write” is not an access control.

### Structured output

Although each user-flow body remains free text, the surrounding response can be a JSON-Schema object such as a list of `{ title, body }` records. OpenRouter accepts `response_format.type: "json_schema"`, supports the format while streaming, and recommends `strict: true`. Support is endpoint-specific, not merely model-wide; OpenRouter warns that enforcement varies between providers. Requests that depend on it should include `provider.require_parameters: true`. See [Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

The requested Flash model's OpenRouter page reports JSON-Schema support. DeepSeek's direct API documentation only promises “Json Output” at the family level, so the OpenRouter endpoint/routing contract—not an assumption about every DeepSeek endpoint—must be checked at scan time.

### Streaming and cancellation

OpenRouter streams chat responses as server-sent events (SSE) when `stream: true`. Structured output and tool calls can also be streamed. OpenRouter's Agent SDK documents both an `AbortSignal` request option and `cancel()` for stopping the stream and its consumers. See [OpenRouter streaming](https://openrouter.ai/docs/agent-sdk/call-model/streaming) and the [Agent SDK API reference](https://openrouter.ai/docs/agent-sdk/call-model/api-reference).

The documented text-generation APIs do not expose a separate durable “cancel job” endpoint. The MVP should define cancellation as aborting the in-flight HTTP request/stream and preventing further agent steps. It should not promise that cancellation incurs no additional charge. This is especially important because usage is delivered in the terminal stream event, which an early abort may prevent the client from receiving.

For a canceled or disconnected scan, preserve a generation identifier when available and reconcile asynchronously. OpenRouter's generation metadata endpoint exposes `cancelled`, model, provider, prompt/completion token counts, and `total_cost`; see [Get request and usage metadata for a generation](https://openrouter.ai/docs/api/api-reference/generations/get-generation).

### Usage and pricing metadata

OpenRouter automatically includes native-tokenizer prompt, completion, reasoning, and cached-token counts plus charged cost in `usage`. For streaming, this arrives in the last SSE message; for non-streaming, it is in the completed response. The older “include usage” flags are deprecated. See [Usage Accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting).

The Models API represents pricing as USD-per-unit strings, including `prompt`, `completion`, fixed `request`, `input_cache_read`, `input_cache_write`, `internal_reasoning`, and optional conditional overrides. Overrides can depend on prompt length, time, or weekday. See [Models API pricing metadata](https://openrouter.ai/docs/guides/overview/models#pricing-object).

For the MVP:

- use current model metadata only for a pre-scan estimate and display the retrieval timestamp;
- compute estimates with decimal arithmetic, not binary floating point;
- treat response `usage.cost` (or reconciled generation `total_cost`) as the authoritative actual cost;
- aggregate usage across every model call in a scan, including retries and agent turns;
- retain per-call requested model, actual model/provider when reported, generation ID, token counts, cache counts, and cost;
- show “actual cost pending” when a canceled stream has not yet been reconciled.

## Decision-relevant limitations

1. **“Any repository” cannot mean “one prompt containing any repository.”** Even the requested model's unusually large context is finite, and system instructions, tool schemas, conversation history, and desired output all consume it. Scanning effort must control deterministic inventory, exclusions, chunking, iterative read/search calls, and synthesis passes. “Maximum effort” should mean broader/deeper traversal, not merely filling the context window.
2. **Capabilities vary by routed endpoint.** Model-level support is insufficient when the scan requires tools and strict JSON. Runtime validation plus `require_parameters` is required.
3. **Prices and live availability are volatile.** Do not encode today's page prices as application constants or acceptance criteria.
4. **Cancellation is best-effort transport cancellation.** Preserve completed flow batches, stop subsequent calls, and reconcile usage; do not claim zero post-click cost.
5. **Read-only behavior belongs in local tool enforcement.** Hosted-model tool calling does not itself guarantee repository safety.

## Recommended MVP contract

- Recommended default model: `deepseek/deepseek-v4-flash-0731`.
- Additional selectable models: `deepseek/deepseek-v4-pro-0813` and `openai/gpt-5.4`, plus an advanced custom OpenRouter identifier field.
- Validate every selection with the single-model API and require tool/structured-output parameters actually used by the scan.
- Use a pinned identifier in each scan record; never silently migrate old workspaces to a new model.
- Stream progress, support client abort, persist already validated flow batches, and reconcile final usage/cost.
- Keep “scanning effort” independent from model choice so users can compare effort, model, coverage, latency, and cost separately.
