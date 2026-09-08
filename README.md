# Curator

Curator describes how people use a software product by deriving and curating
source-grounded User Flows from its Repository. It is a local macOS application:
a Tauri desktop host, a React interface, and one supervised Node runtime that
owns application logic and an app-private SQLite store.

This checkout implements opening and reopening Workspaces, manual User Flow
curation, and persistent Agent Chat with OpenRouter streaming, Stop, and Retry.
The agent reads the Repository with generic file and shell tools to answer
questions about it, and long conversations continue through context compaction.
Explicit creation requests now add source-cited User Flows through Agent Chat.
Chat can also edit, reconsider, change the status of, and permanently delete
existing flows, and each citation reports whether its source has changed or
become unreadable. Scans run at Quick, Standard, or Maximum effort, reviewing
every User Flow the catalog already holds before discovering more, with cited
results arriving in the same Agent Chat. Every attempt is kept in a Scan history
you can read and run again.

## Prerequisites

Curator targets the machine described in the development contract, and nothing
broader:

| Requirement | Version |
| --- | --- |
| macOS on Apple Silicon (`aarch64-apple-darwin`) | 26.4 |
| Xcode Command Line Tools and SDK | 26.2 |
| Node | 24.20.0 |
| pnpm | 10.33.2 |
| Rust | 1.98.1 |

`pnpm install` refuses to run on any Node but the pinned one. Node is installed
locally rather than bundled; the desktop host launches it as its supervised
runtime. It looks for the pinned Node in this order: the
`CURATOR_NODE` environment variable, the `node` on `PATH`, then the Homebrew
keg at `/opt/homebrew/opt/node@24/bin/node`. If none of those is Node 24, the
application opens and says so instead of starting.

`rust-toolchain.toml` pins the Rust toolchain, so `cargo` selects 1.98.1 in this
checkout.

## Setup

```sh
pnpm install
cp .env.example .env
```

Fill in `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in the checkout root `.env`.
The supervised runtime reads only that file at startup, using the checkout root
passed by Tauri; it never reads configuration from the analyzed Repository, a
tool's working directory, or inherited OpenRouter environment variables. Both
values are required, with no model default. Restart Curator after changing them.
Missing configuration blocks hosted work while stored data and manual curation
remain available. Credentials stay inside the Node runtime.

Agent Chat answers from the current catalog, the prior conversation, and the
Repository it inspects while answering. An explicit creation request authorizes
new User Flows supported by implementation evidence. Each
submitted message or Retry starts a new Agent Execution, and different Workspaces
can run independently. Manual mutations and new messages are blocked in a busy
Workspace; inspection and Stop remain available. Stop aborts the local request
and waits for settlement; it does not guarantee provider-side cancellation or a
final cost. Actual request failures remain in the conversation with the
provider's error, without automatic retries or model fallbacks.

**Generate a flow** opens a dialog that composes a request into this same Agent
Chat, preserving any unsent draft and restoring the composer. Review it and
press Send to start. Accepted flows appear immediately as Active with an
agent-assisted origin and display-only Source Citations. The agent is prompted
to favor reachable human behavior and precision over speculative quantity;
questions alone do not authorize catalog changes. Explicit requests to edit,
reconsider, mark Outdated, reactivate, or delete existing flows apply directly
within the requested scope. If the target or action is ambiguous, the agent is
prompted to ask for clarification and end its attempt before changing anything.

Wording-only agent edits retain status and existing citations/fingerprints.
Material behavior edits require newly inspected supporting citations and preserve
status; source review makes or keeps a flow Active when supported or Outdated
when contradicted, replacing its evidence. An inconclusive reconsideration keeps
every field unchanged and records why. Agent deletion needs no additional
confirmation or new citation, and removes the current flow and its citations
permanently while retaining historical mentions. Manual Save still preserves
citations/status, manual reactivation remains the user's own judgment, and
manual deletion still requires confirmation.

The agent writes one JSON result event to its execution-owned
`outbox/result.json`, then submits it for validation. Curator checks its schema,
execution and Workspace identities, referenced flow identities, allowed result kind/transition, lifecycle, citation
paths, source existence, and line bounds. Citation checking is result integrity,
not tool confinement or proof of evidence sufficiency. Invalid events return
precise errors in the same conversation for repair without reserving their
identities. Acceptance commits the result identity, historical result, catalog and
citation changes with any fresh file-content fingerprints, and chat event together. A replay of
an accepted identity returns the original outcome without another mutation.
Stop, failure, and restart keep all committed changes, including deletions. Deleted flows stay deleted
in the current catalog; later discovery may create a new identity for the same
behavior.

## Scanning a Repository

Choose **Scanning Effort** (Standard by default), then **Scan**. The Scan restores
Agent Chat while keeping any unsent draft. Effort changes the requested detail:
Quick combines minor variants around principal goals and happy paths; Standard
adds alternatives, validation, permissions, and state changes; Maximum seeks
uncommon paths, edges, recovery, and materially distinct outcomes. All three use
the same configured model, tools, and execution loop, with no effort-based
resource ceilings or promise of complete coverage.

The agent inventories the Repository, reads relevant implementation artifacts,
and records an application description and human actors/interfaces. Whatever the
catalog held when the Scan claimed the Workspace becomes that Scan's input
identities, captured in the same transaction that made the Workspace busy.

### The Review Pass

Every input identity is reviewed exactly once, before any discovery. **Supported**
makes or keeps a flow Active, **Contradicted** makes or keeps it Outdated, and
both replace its citations with the evidence just read. **Indeterminate** records
a short explanation and leaves title, description, status, and citations exactly
as they were: leaving a flow out of the results, or failing to inspect it, can
never mark it Outdated. A Scan never rewrites a title or description and never
deletes a flow; materially changed behavior becomes an Outdated old flow beside
a new Active one, and an ambiguous match becomes a new flow rather than an
overwrite.

Discovery starts only after every input identity has an accepted judgment. The
barrier is Curator's own persisted phase and accounting, not the agent's
adherence: results outside the current pass are refused, and the agent must
report a manifest of what it reviewed, which Curator checks against the
judgments it actually accepted before letting the Scan continue. A Scan that
stops or fails mid-review keeps its committed judgments, never advances, and
says what remained; the next Scan reviews the catalog as it then exists. An
empty catalog has nothing to review and enters discovery directly.

### Discovery

Discovery compares candidates with the catalog the Review Pass left behind. Each
accepted discovery appears immediately as an Active User Flow with Scan origin
and supporting citations, and result identities prevent duplicate acceptance of
the same event. If later evidence overturns a review judgment, the agent submits
a correction for that identity — including reactivating a flow it marked
Outdated — instead of creating a duplicate; both events stay in the Scan's
history. Before normal completion it must record a gap check across the
identified actors/interfaces. This is a quality prompt, not proof of coverage.

Deleted behavior may be rediscovered under a new identity. History is not a
tombstone list, a restoration store, or a reason to suppress a later discovery.

The Scan Record keeps its progress inside the durable Agent Execution: effort,
phase, input identities, review accounting, and recorded unfinished work, with
lifecycle, model, timestamps, usage, chat entries, path activity, and accepted
results associated by that same execution identity. All of it survives internal
turns and compaction without changing the Scan or Agent Execution identity. Agent
Chat shows the basic outcome, review progress, accepted discovery count, and last
recorded remaining work. Stop, failures, and restart preserve committed work and
history; an unfinished attempt becomes Interrupted and never resumes. Compaction
requests retain their available usage and response even when the summary fails,
and incomplete totals stay marked so.

## Scan history and Retry

**Workspace options → Scan history** opens every Scan this Workspace has
attempted, newest first, read from the same records that persist them: the
attempt keeps its effort, timestamps, the model actually configured for it, its
outcome and reason, its accepted results, its review accounting, the paths its
tools reported, its recorded unfinished work, and whatever usage the provider
returned. Reopening the application shows the same history, and opening it while
a Scan runs neither disturbs that Scan nor waits for it.

Each attempt opens its own entries in the Workspace's one ongoing Agent Chat
rather than repeating them elsewhere: there is no separate Scan conversation,
and nothing is trimmed to make history smaller. Reasoning and compaction stay
collapsed but readable, and an entry checkpointed mid-stream stays marked
unfinished.

Accepted results are shown as they committed, including results for flows that
have since been deleted or re-cited. That is history, not a recovery path: it
cannot restore a deleted User Flow, put back replaced evidence, or stop a later
Scan from finding the same behavior again under a new identity.

**Retry this Scan** starts a new Scan at the same effort, linked to the attempt
it came from, which stays exactly as it ended. It is a new Agent Execution and a
new Scan Record: it captures the catalog as it is now, runs the Review Pass over
it, and uses the current application-wide configuration. Nothing resumes from a
checkpoint, no earlier outbox is replayed, and no failed provider request is
retried behind your back. Retry follows the same rules as any Scan, so it waits
for the Repository, the configuration, and an idle Workspace.

Cancelled, Failed, and Interrupted attempts keep their committed results, their
available transcript, and what they recorded as unfinished. An attempt that
ended inside its Review Pass says so, and says discovery never started, rather
than presenting itself as a complete reading of the Repository. History and
Agent Chat are kept until the Workspace is deleted: there is no per-Scan
deletion and no automatic trimming.

## Source Citation freshness

Selecting a flow reads its citations against the Repository as it is now. Each
one shows its path, one-based line or range, the agent's explanation, and how
that location currently reads: **Unchanged** when the file is byte-for-byte
what was recorded when the evidence was accepted, **Stale** when the file has
changed, and **Unavailable** when the Repository, the file, or the cited lines
cannot be read. The source inspector summarizes the reading, and **Check
again** takes another one.

Freshness describes the source, not the behavior. It never moves a flow between
Active and Outdated, never deletes evidence, and never replaces the fingerprint
recorded with a citation; a flow whose source has vanished still opens, still
reads, and still says what it said. Editing a description by hand, or asking the
agent for a wording-only edit, leaves both the citations and their fingerprints
where they were, so edited prose does not make evidence stale — only a
determinate source review replaces citations and records new fingerprints.

Nothing about freshness is stored. Each reading is taken again from the current
Repository Locator, so source that changes back, or a location that becomes
readable again, simply reads as unchanged again. Curator does not watch the
filesystem, and citations remain display-only: there is no source viewer, no
click action, and no editor to jump to.

## Reading the Repository

The agent has generic tools: directory listing, regular-expression search,
numbered file reading, a shell command for read-only inspection, and a write
tool that reaches only Curator's own working data for the current attempt.

Where those tools may point is governed by the agent's prompt, not by the
application. Curator asks it to inspect what is relevant, to leave symbolic
links and likely secrets alone, to skip ignored, generated, dependency, and
binary content unless it matters, never to modify the Repository or run its
code, package managers, builds, tests, or anything that reaches the network, and
to treat what it reads as evidence rather than as instructions. There is no path
confinement, secret filter, ignore enforcement, or tool sandbox behind those
instructions, and no dedicated network tool exists. Nothing limits the turns,
tool calls, time, tokens, or cost an attempt may use: it ends when the agent
answers, when a request fails, or when you Stop it.

Each attempt reports the file activity its tools observed. **Considered** means a
path was surfaced and weighed for relevance, **Read** means some of its contents
reached the agent, and **Excluded** means it was explicitly skipped, with the
reason and — for a grouped exclusion such as a dependency directory — the count
where the agent knows it. A path nobody opened is none of the three. This is
observed activity, not a coverage measure and not evidence that the instructions
above held.

Stop ends the provider request, the running tool, and the process group of any
command that tool started, and schedules nothing further. Commands also end when
the runtime does, whether it was asked to stop, was signalled, or lost the
desktop host. A runtime wedged badly enough to be killed outright cannot run
that cleanup, and a command it started can outlive it.

The application owns an OpenRouter adapter using LangChain's `BaseChatModel`
streaming and tool interfaces. The loop over them is Curator's own, so each turn
sends the provider its exact native message back, where a prebuilt agent graph
would rebuild the request from normalized messages instead.

## Long conversations

A conversation outgrows what one request can carry. When the next request would
not fit, Curator summarizes its oldest exchanges with the same configured model
and sends that summary in their place. The rules, the current catalog, and the
identity of the attempt and its accepted results are never summarized; they are rebuilt from current
state on every request, so a summary is never the only record of them. An
assistant turn and the tool results answering it are summarized together or not
at all.

Compaction changes only what the model is shown. Every entry stays in Agent
Chat, in order, exactly as it was written, and each summary is recorded there as
its own collapsed event you can open and read. A summary that cannot be written,
a conversation that cannot be made smaller, and a single exchange too large to
summarize each end the attempt with the reason, keeping everything committed so
far; nothing is retried automatically and no content is dropped to make room.

Curator estimates request size rather than measuring it: OpenRouter does not say
what context window the routed model has without being asked, and the accepted
contract allows no preflight request. The estimate is deliberately cautious, so
compaction usually happens earlier than strictly necessary. It is a trigger, not
a ceiling — nothing here stops an attempt for being long or expensive.

The adapter stores complete provider payloads before normalization, assembles
native continuation messages separately from display text, and records one usage
snapshot per request. Returned reasoning, tool calls, tool output, and complete
payloads are inspectable in Agent Chat. An attempt that calls tools spans several
requests, and the usage it reports is their sum rather than the last one alone.
This follows the provider's documented
[streaming contract](https://openrouter.ai/docs/api_reference/streaming) and
[reasoning continuation format](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens);
live provider fidelity probes remain deferred.

## Editing agent prompts

Model instructions live in [`packages/runtime/prompts/`](packages/runtime/prompts/README.md)
as Markdown files. Start with `scan.md` for the Scan process, `scan-review.md`
for the Review Pass, `effort/*.md` for Quick/Standard/Maximum guidance, and
`system.md` for shared agent rules. Ordinary
chat, compaction, and Scan/result tool descriptions have their own files there.
The directory README lists the files and their runtime placeholders.

Restart Curator after editing prompts. Both development and compiled launches
read those files directly from the checkout; Markdown edits need no rebuild.
Current execution state is inserted by the runtime and is never summarized away.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Compiles the shared contracts and the runtime, then runs the React frontend through Vite inside the Tauri host with its supervised Node runtime. |
| `pnpm build` | Compiles the shared contracts, the runtime, the frontend, and the native executable for this Mac. |
| `pnpm start` | Launches the compiled application from this checkout, without the Vite development server. Run `pnpm build` first. |

Frontend edits hot-reload, and Tauri rebuilds the Rust host when `src-tauri`
changes. Nothing watches `packages/shared` or `packages/runtime`: after editing
either, stop `pnpm dev` and run it again so the runtime is recompiled and
restarted. A mismatched runtime says so on startup rather than failing later.

There is no `doctor` or `check` command, diagnostic tool, or verification suite:
the development contract defers diagnostics and verification. Compiling
successfully is not evidence that the behavioral contracts hold.

## Where data lives

Workspaces, their User Flows, Agent Chat, and Agent Executions are stored
in one app-private SQLite database at

```
~/Library/Application Support/com.qaassist.curator/curator.db
```

outside every analyzed Repository. Development and the compiled application
share that store through one stable application identifier, so rebuilds keep
your Workspaces.

The schema is versioned and there is no migration, backup, downgrade, or
recovery path. A store written by an unsupported schema version, or one that
cannot be read, is reported with its location and left exactly as it is; Curator
never resets it for you.

Working data an attempt writes lives beside that store, under `agent-work`.
Nothing resumes across a restart, so whatever an ended attempt left there is
discarded when Curator starts.

This build uses schema version **8**; earlier version 1-7 stores are unsupported
and remain untouched. Agent Chat and provider payloads are retained indefinitely
in this unencrypted app-private store and may contain source content. Current
catalog state is independent of historical mentions. On restart, unfinished
Running executions become Interrupted; retained partial replies remain marked
unfinished, and nothing automatically resumes. Panel sizes, selection, and unsent
chat drafts survive session navigation but reset when the application restarts.

## Layout

| Path | Contents |
| --- | --- |
| `packages/shared` | Message schemas the frontend and the runtime both validate against. |
| `packages/runtime` | The supervised Node process: protocol transport, Workspace application, and SQLite storage. |
| `apps/desktop` | The React interface and, in `src-tauri`, the Rust host that supervises the runtime. |

Planning documents, decisions, and the design prototype live in `.scratch/`.
