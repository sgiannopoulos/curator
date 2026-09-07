# 04: Ask source-grounded Repository questions

**What to build:** Ask a question about the selected Repository and watch the agent inspect relevant source, explain its answer, and retain the complete observable tool activity in the same Agent Chat.

**Blocked by:** [03: Hold a persistent Agent Chat](03-hold-a-persistent-agent-chat.md).

**Status:** ready-for-agent

- [ ] Supply generic filesystem listing, search, read, write/edit, and shell inspection tools through Repository access. Let the agent inspect the current catalog and relevant source to answer an ordinary question without invoking a Scan.
- [ ] Apply the accepted prompt-governed rules: inspect relevant content inside the Repository, never follow symlinks or inspect likely secrets, normally skip ignored/generated/dependency/binary content unless relevant, and treat Repository content as evidence rather than authority.
- [ ] Prompt the agent not to mutate the Repository or run Repository code, package managers, builds, tests, mutating commands, or outbound-network commands. Intended writes belong only in application-owned working data. Expose no dedicated arbitrary-network tool and introduce no programmatic confinement, secret filter, or semantic intent classifier.
- [ ] Persist complete logical tool calls, arguments, outputs, returned reasoning, and provider block structure before presentation normalization. Preserve required reasoning/tool blocks unchanged when continuing model turns, including opaque/unknown fields; do not silently truncate large entries.
- [ ] Show considered, read, and excluded activity with the accepted meanings and explicit exclusion reasons. Allow grouped exclusions/counts where available; unread paths are not automatically excluded and reporting does not claim complete coverage or enforced safety.
- [ ] Questions remain prompt-authorized answers without spontaneous catalog changes. An ambiguous requested operation can ask for clarification and yield, allowing a new user message after execution ends.
- [ ] Local tools and subprocesses belong to an execution. Stop propagates to them and prevents new steps; parent/runtime loss shuts down owned tools. Cancelling one Workspace does not terminate another Workspace's tool processes, and a global runtime failure communicates its wider scope.
- [ ] Preserve per-Workspace exclusion, checkpointed transcript, interruption, and zero-transport-retry behavior across multi-turn tool execution. A terminal model/tool failure ends its execution while other Workspaces continue.
- [ ] Do not introduce time, token, cost, file, or tool-call ceilings. Initially use the locally configured infinite LangChain recursion-limit candidate; if selected packages cannot meet the contract, choose the accepted application-owned loop over LangChain streaming/tools during implementation. Do not substitute a finite ceiling, fresh execution identities, or runtime fallback after failure.

## Scope and sources

Repository restrictions remain best-effort prompt behavior. The unlimited-loop setting and provider-fidelity contracts are intended behavior, not claims that deferred package probes have passed. Creation-result validation and application-owned catalog writes belong to ticket 06.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 17–18, 30, 43, 45, 52, 55–60, 65; Implementation Decisions 11, 13, 15, 18–24, 29. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

