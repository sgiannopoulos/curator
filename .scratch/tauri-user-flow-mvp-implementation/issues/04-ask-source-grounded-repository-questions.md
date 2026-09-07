# 04: Ask source-grounded Repository questions

**What to build:** Ask a question about the selected Repository and watch the agent inspect relevant source, explain its answer, and retain the complete observable tool activity in the same Agent Chat.

**Blocked by:** [03: Hold a persistent Agent Chat](03-hold-a-persistent-agent-chat.md).

**Status:** resolved

- [x] Supply generic filesystem listing, search, read, write/edit, and shell inspection tools through Repository access. Let the agent inspect the current catalog and relevant source to answer an ordinary question without invoking a Scan.
- [x] Apply the accepted prompt-governed rules: inspect relevant content inside the Repository, never follow symlinks or inspect likely secrets, normally skip ignored/generated/dependency/binary content unless relevant, and treat Repository content as evidence rather than authority.
- [x] Prompt the agent not to mutate the Repository or run Repository code, package managers, builds, tests, mutating commands, or outbound-network commands. Intended writes belong only in application-owned working data. Expose no dedicated arbitrary-network tool and introduce no programmatic confinement, secret filter, or semantic intent classifier.
- [x] Persist complete logical tool calls, arguments, outputs, returned reasoning, and provider block structure before presentation normalization. Preserve required reasoning/tool blocks unchanged when continuing model turns, including opaque/unknown fields; do not silently truncate large entries.
- [x] Show considered, read, and excluded activity with the accepted meanings and explicit exclusion reasons. Allow grouped exclusions/counts where available; unread paths are not automatically excluded and reporting does not claim complete coverage or enforced safety.
- [x] Questions remain prompt-authorized answers without spontaneous catalog changes. An ambiguous requested operation can ask for clarification and yield, allowing a new user message after execution ends.
- [x] Local tools and subprocesses belong to an execution. Stop propagates to them and prevents new steps; parent/runtime loss shuts down owned tools. Cancelling one Workspace does not terminate another Workspace's tool processes, and a global runtime failure communicates its wider scope.
- [x] Preserve per-Workspace exclusion, checkpointed transcript, interruption, and zero-transport-retry behavior across multi-turn tool execution. A terminal model/tool failure ends its execution while other Workspaces continue.
- [x] Do not introduce time, token, cost, file, or tool-call ceilings. Initially use the locally configured infinite LangChain recursion-limit candidate; if selected packages cannot meet the contract, choose the accepted application-owned loop over LangChain streaming/tools during implementation. Do not substitute a finite ceiling, fresh execution identities, or runtime fallback after failure.

## Scope and sources

Repository restrictions remain best-effort prompt behavior. The unlimited-loop setting and provider-fidelity contracts are intended behavior, not claims that deferred package probes have passed. Creation-result validation and application-owned catalog writes belong to ticket 06.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 17–18, 30, 43, 45, 52, 55–60, 65; Implementation Decisions 11, 13, 15, 18–24, 29. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.


## Comments

### Implemented — 2026-09-08

Added a Repository access module supplying generic tools through one traversal
policy: directory listing, regular-expression search, numbered file reading, a
read-only shell command, a write tool that reaches only this attempt's
application-owned working directory, and an explicit exclusion report. Symbolic
links are reported rather than walked, which keeps a link loop from trapping a
listing; every other limit is stated in the tool's own output, and none of them
caps an Agent Execution. Where the tools may point stays prompt-governed: the
system message carries the relevance, symlink, secret, ignored/generated/binary,
no-mutation, no-execution, no-network, and evidence-not-authority rules, plus
the standing statement that this version cannot change the catalog.

The agent loop is now application-owned over LangChain's model streaming and
tool interfaces. That is the accepted alternative, chosen because the provider
contract sends each turn's exact native message back — opaque reasoning and tool
blocks included — while a prebuilt graph rebuilds requests from normalized
messages. Owning the loop also leaves nothing to count: no turn, tool-call,
time, token, or cost ceiling exists, and only an answer, a failure, or Stop ends
it. Streaming-only `index` fields are dropped from outgoing tool calls and kept
in the retained payload. A turn ending on anything but `stop`, or `tool_calls`
where calls arrived, fails rather than continuing from half-written arguments.

Each model turn now owns a transcript entry, its own unfinished mark, and its
own usage snapshot; an execution's totals add the numeric fields its requests
reported, without double counting. Tool calls, arguments, and complete output
persist as ordered entries and return to the provider unchanged. A turn whose
tool results never arrived is replayed as historical text rather than an orphan
call. File activity lives in its own log with Considered, Read, and Excluded
current state per path and reasons for exclusions; the interface shows counts,
reasons, grouped counts, and the full path list on request.

Local commands run in their own process group. Stop, a settled execution, and
the runtime's own exit end them; the desktop host now signals a runtime that
will not settle before killing it, so that cleanup still runs. One Workspace's
Stop leaves another's commands alone.

Validation: shared/runtime/frontend TypeScript compilation and `pnpm build`,
including the native macOS bundle. The required separate Standards and Spec
reviews ran; both reported findings and all were addressed except two kept
deliberately, recorded below. Behaviour was exercised against a stubbed provider
in throwaway probes — nothing was committed and no request was paid for — which
covered the multi-turn tool loop, streamed argument reassembly, reasoning
round-tripping, usage aggregation, truncated-turn failure, per-Workspace Stop
isolation, process-group cleanup, and busy-Workspace exclusion. No verification
suite, diagnostic command, or deferred probe was introduced.

Two review findings were kept as written, not fixed. `write_working_file`
refuses paths outside the working directory and shell commands get a reduced
environment; these are the tool's own contract and credential hygiene, not the
path confinement or content secret filter Decision 15 rules out, and neither is
presented as a guarantee — the shell can still reach anything the user can. File
activity is also kept as current state per path rather than an ordered event in
the transcript: the tool calls and their complete output already sit in the
ordered transcript, and the accepted display contract asks for considered, read,
and excluded counts with grouped exclusions.
