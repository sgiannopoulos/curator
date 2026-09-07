# Curator

Curator describes how people use a software product by deriving and curating
source-grounded User Flows from its Repository. It is a local macOS application:
a Tauri desktop host, a React interface, and one supervised Node runtime that
owns application logic and an app-private SQLite store.

This checkout implements opening and reopening Workspaces, manual User Flow
curation, and persistent Agent Chat with OpenRouter streaming, Stop, and Retry.
Repository tools, agent catalog changes, compaction, and Scans arrive in later work.

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

Agent Chat answers from the current catalog and prior conversation. It does not
yet inspect Repository files or mutate User Flows. Each submitted message or
Retry starts a new Agent Execution, and different Workspaces can run independently.
Manual mutations and new messages are blocked in a busy Workspace; inspection
and Stop remain available. Stop aborts the local request and waits for settlement;
it does not guarantee provider-side cancellation or a final cost. Actual request
failures remain in the conversation with the provider's error, without automatic
retries or model fallbacks.

The application owns an OpenRouter adapter using LangChain's `BaseChatModel`
streaming interface. It stores complete provider payloads before normalization,
assembles native continuation messages separately from display text, and records
provider usage snapshots once per request. Returned reasoning and complete
payloads are inspectable in Agent Chat. This follows the provider's documented
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

This build uses schema version **3**; earlier version 1/2 stores are unsupported
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
