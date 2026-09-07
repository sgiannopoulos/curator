# Curator

Curator describes how people use a software product by deriving and curating
source-grounded User Flows from its Repository. It is a local macOS application:
a Tauri desktop host, a React interface, and one supervised Node runtime that
owns application logic and an app-private SQLite store.

This checkout currently implements opening and reopening a Workspace. Manual
curation, the Agent Chat, and Scans arrive in later work.

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
That file is where OpenRouter Configuration will be read from when hosted agent
work arrives — only from there, never from the analyzed Repository or a tool's
working directory. No code reads it yet, and stored Workspaces stay available
whether or not it is filled in.

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

Workspaces, and later their User Flows, Agent Chat, and Scan history, are stored
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

## Layout

| Path | Contents |
| --- | --- |
| `packages/shared` | Message schemas the frontend and the runtime both validate against. |
| `packages/runtime` | The supervised Node process: protocol transport, Workspace application, and SQLite storage. |
| `apps/desktop` | The React interface and, in `src-tauri`, the Rust host that supervises the runtime. |

Planning documents, decisions, and the design prototype live in `.scratch/`.
