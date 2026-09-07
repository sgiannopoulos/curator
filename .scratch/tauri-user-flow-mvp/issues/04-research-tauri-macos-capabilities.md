Type: research
Status: resolved
Blocked by:

## Question

What do current first-party Tauri, Apple, and relevant official library sources establish about macOS credential storage, private local persistence, filesystem scoping, long-running background work, cancellation, and development-build requirements for this MVP?

## Answer

The MVP is feasible as an in-process Tauri 2 application, with three constraints carried into architecture decisions: use the native file-based macOS Keychain for the unsigned local-development milestone and plan a later migration to Apple's preferred provisioned data-protection keychain; enforce repository read-only/root confinement in Rust because Tauri WebView capabilities do not sandbox custom Rust filesystem code; and implement cooperative, checkpointed cancellation because active blocking tasks cannot be force-aborted. Persist non-secret workspace state under the bundle-identifier-specific application data path, keep the OpenRouter key out of that store, stream progress through Tauri channels, and treat process exit as interruption rather than background completion.

Full facts, citations, recommendations, and caveats: [Tauri macOS capability research](../research/tauri-macos-capabilities.md).

## Comments

- The Keychain recommendation was superseded for the MVP by [Define model and cost controls](07-define-model-and-cost-controls.md), which places the credential in application-root environment configuration. The underlying capability research remains valid.
