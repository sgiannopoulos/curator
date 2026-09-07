Type: grilling
Status: resolved
Blocked by: 01, 03

## Question

What OpenRouter onboarding, model selection, API-key validation, usage display, budget controls, model fallback, and failure behavior should each Workspace and Scan expose?

## Answer

The MVP exposes no OpenRouter onboarding, credential entry, model selection, provider-policy, or spending-control UI. OpenRouter Configuration is application-wide rather than part of a Workspace or an individual Scan. The application loads two required values from the QA Assist application root `.env` file when the process starts:

- `OPENROUTER_API_KEY`: the API credential used by every hosted agent task.
- `OPENROUTER_MODEL`: the exact OpenRouter model identifier used by every hosted agent task.

The analyzed Repository's own environment files never supply these values. The repository includes a committed `.env.example`, while the real `.env` is ignored. Changing either value requires restarting QA Assist. There is no built-in model default when `OPENROUTER_MODEL` is absent, although `.env.example` may show `deepseek/deepseek-v4-flash-0731` as the suggested value.

QA Assist performs no separate API-key test, model lookup, capability validation, or price preflight. The application may open and existing Workspace data remains available when either variable is missing, but a hosted agent task cannot start until both are present. Authentication, unknown-model, insufficient-credit, rate-limit, unsupported-capability, and network failures are discovered through the actual OpenRouter request.

There are no application budgets, estimates, warnings, cost limits, automatic retries, alternate-model fallbacks, or provider privacy and retention filters. QA Assist submits the configured model identifier through OpenRouter without implementing its own fallback policy; OpenRouter's ordinary routing behavior is outside the application's policy surface. A failure ends the current task immediately, retains already accepted partial results, records the original actionable error, and tells the user to correct `.env`, restart the application, and begin a new task.

When OpenRouter returns final token usage and cost, the Scan record retains and displays those totals. The MVP has no live cost meter, dedicated cost dashboard, or reconciliation workflow for usage that the failed or cancelled request did not return.
