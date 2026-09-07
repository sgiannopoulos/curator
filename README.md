# Curator

Curator describes how people use a software product by deriving and curating
source-grounded User Flows from its Repository. It is a local macOS application:
a Tauri desktop host, a React interface, and one supervised Node runtime that
owns application logic and an app-private SQLite store.

This checkout implements opening and reopening Workspaces, manual User Flow
curation, and persistent Agent Chat with OpenRouter streaming, Stop, and Retry.
The agent reads the Repository with generic file and shell tools to answer
questions about it, and long conversations continue through context compaction.
Agent catalog changes and Scans arrive in later work.

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
Repository it inspects while answering. It cannot yet change User Flows. Each
submitted message or Retry starts a new Agent Execution, and different Workspaces
can run independently. Manual mutations and new messages are blocked in a busy
Workspace; inspection and Stop remain available. Stop aborts the local request
and waits for settlement; it does not guarantee provider-side cancellation or a
final cost. Actual request failures remain in the conversation with the
provider's error, without automatic retries or model fallbacks.

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
identity of the attempt are never summarized; they are rebuilt from current
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

This build uses schema version **4**; earlier version 1-3 stores are unsupported
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
