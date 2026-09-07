Label: wayfinder:map

## Destination

An implementation-ready MVP specification and decision map for a locally runnable macOS Tauri application that analyzes any local source repository through an OpenRouter-hosted agent and lets developers and QA engineers inspect and curate inferred User Flows.

## Notes

- Planning only: implementation and application scaffolding begin after this map reaches its destination.
- Current scope refinement: diagnostics and verification are deferred for now; see the user's recorded choices in [Define macOS development contract](issues/12-define-macos-development-contract.md#toolchain-commands-shared-data-and-deferrals--2026-09-07). Earlier probe lists are deferred context, not implementation gates or completed validation.
- Every decision session should use `grilling` and `domain-modeling`; use `research`, `prototype`, and `codebase-design` when named by a ticket.
- The user has chosen a LangChain agent; consult [Research OpenRouter agent runtime](issues/14-research-openrouter-agent-runtime.md) for integration evidence and its implementation-verification limits.
- A Workspace persists one Repository, its ongoing Agent Chat, its Scan history, and its curated User Flows without writing into the Repository.
- A Scan treats its Repository as read-only by agent instruction, not by programmatic confinement, and has a user-selected Scanning Effort. Maximum effort aims to surface detailed and uncommon behavior; the user remains the acceptance authority.
- A User Flow has a title and free-text description of user actions and expected outcomes. Every generated flow requires supporting source citations; confidence scores are not required.
- Users can add, edit, and permanently remove flows manually or request changes through Agent Chat. A Scan reviews every existing Active and Outdated User Flow before discovering new ones; determinate review results immediately update status and citations.
- OpenRouter Configuration is application-wide and supplied only by required `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` values in the application root `.env`; the MVP exposes no UI or provider-policy and spending controls for it.
- Scans show progress, considered and excluded files, usage or cost when available, cancellation, actionable failures, and valid partial results.
- The user will personally evaluate inference quality across unfamiliar repositories.

## Decisions so far

<!-- Resolved ticket links are appended here; decision detail remains in each ticket. -->

- [MVP specification](spec.md): Published with `Status: ready-for-agent` using the to-spec template. Synthesizes the accepted User Flow, Agent Chat, architecture, and local-development contracts; preserves deferred diagnostics and verification. Implementation slicing remains a separate to-tickets step.

- [Define Scanning Effort and coverage](issues/01-define-scanning-effort-and-coverage.md): Quick, Standard, and Maximum are prompt-only detail presets with transparent activity reporting, no completeness promise, and no default resource ceilings.
- [Research OpenRouter and initial model capabilities](issues/03-research-openrouter-and-model-capabilities.md): The requested pinned model exists; OpenRouter exposes volatile model metadata and authoritative terminal usage, while routed capabilities and cancellation behavior have documented limits.
- [Research Tauri macOS capabilities](issues/04-research-tauri-macos-capabilities.md): Tauri supports app-private persistence and cooperative background work; the research documents the tradeoffs of native Keychain storage and what an intentionally deferred confinement guarantee would require.
- [Define User Flow lifecycle](issues/02-define-user-flow-lifecycle.md): User Flows use an Active/Outdated current-state lifecycle with hard deletion and no User Flow revision history; Scans reconcile conservatively, while explicitly invoked agents modify the catalog directly.
- [Define Repository data boundary](issues/05-define-repository-data-boundary.md): Repository selection and safety are prompt-governed in the MVP; the agent has general file tools, writes User Flows outside the Repository, and receives no dedicated network tool or safety guarantee.
- [Define analysis agent architecture](issues/06-define-analysis-agent-architecture.md): Each Scan is one compacting agent session with orientation, complete existing-flow review, source-cited discovery, immediate validated results, a persistent full-fidelity Agent Chat, and no rollback or terminal resumption.
- [Define model and cost controls](issues/07-define-model-and-cost-controls.md): OpenRouter credentials and the exact model come only from app-root environment configuration; the MVP adds no configuration UI, preflight validation, spending or privacy controls, retries, or fallbacks.
- [Define Workspace persistence](issues/08-define-workspace-persistence.md): Path-recognized Workspaces retain a mutable catalog and complete Scan history, with explicit Relink, atomic results, terminal interruption, permanent-deletion boundaries, and citations unchanged by manual edits.
- [Define agent-assisted curation](issues/09-define-agent-assisted-curation.md): One persistent Workspace Agent Chat hosts explicit Scans, questions, and prompt-authorized changes, with citation rules and no overlapping work or steering.

- [Prototype MVP information architecture](issues/10-prototype-mvp-information-architecture.md): Curator uses a shared, independently collapsible flow list and Agent Chat, Description-first review with display-only citations, and a chat-composing generation modal; testing remains a future preview.
- [Research OpenRouter agent runtime](issues/14-research-openrouter-agent-runtime.md): LangChain is chosen; research recommends a local TypeScript runtime and identifies provider-fidelity, retry, compaction, step-limit, persistence, and cancellation constraints for architecture.
- [Choose application architecture](issues/11-choose-application-architecture.md): React/TypeScript/Vite and a Tauri-supervised Node runtime use application-owned SQLite, shared Agent Execution contracts, per-Workspace concurrency, and explicit LangChain provider/compaction contracts.
- [Define macOS development contract](issues/12-define-macos-development-contract.md): The current Apple Silicon Mac uses pinned Node/Rust/pnpm, built-in SQLite, shared local data, and checkout-based dev/build/start commands; diagnostics and verification are deferred.

## Not yet specified

<!-- All currently known in-scope questions are represented by child tickets. -->

## Out of scope

- Windows and Linux support.
- Broader macOS-version support, Intel/universal builds, independent Finder launch, and bundling Node; [Define macOS development contract](issues/12-define-macos-development-contract.md) limits this effort to checkout-based use on the current Mac.
- Signing, notarization, distribution, and automatic updates.
- Collaboration, accounts, authentication, cloud sync, and a hosted application backend.
- Test generation or execution, flow export, and any mutation of the analyzed Repository.
- Cross-schema migration, automatic backups, downgrade support, and storage-recovery UI are beyond this locally runnable MVP; [Define Workspace persistence](issues/08-define-workspace-persistence.md) establishes the minimal compatibility boundary.
