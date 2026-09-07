Type: research
Status: resolved
Blocked by:

## Question

What do current first-party OpenRouter and model-provider sources establish about the requested `deepseek-v4-flash-0731` candidate and suitable alternatives, including exact model identifiers, availability, context limits, tool use, structured output, streaming, cancellation, usage reporting, and pricing metadata needed by this MVP?

## Answer

The requested model is available on OpenRouter as `deepseek/deepseek-v4-flash-0731`; DeepSeek's direct API instead names the request model `deepseek-v4-flash` and identifies its current version as `DeepSeek-V4-Flash-0731`. Use the pinned OpenRouter model as the MVP default, validate capabilities and pricing at runtime, require endpoint support for tools and JSON Schema, treat cancellation as best-effort stream abortion with later usage reconciliation, and keep scan effort independent of model selection. Suitable initial comparison models are `deepseek/deepseek-v4-pro-0813` and `openai/gpt-5.4`, with actual quality determined by acceptance testing. Full findings and first-party citations: [OpenRouter and initial model capabilities](../research/openrouter-and-model-capabilities.md).

## Comments

- The configuration and validation recommendations were superseded for the MVP by [Define model and cost controls](07-define-model-and-cost-controls.md). The researched provider facts remain valid inputs to implementation and later scope.
