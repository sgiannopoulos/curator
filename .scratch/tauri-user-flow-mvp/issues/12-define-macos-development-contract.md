Type: grilling
Status: resolved
Blocked by: 11

## Question

What exact macOS prerequisites, OpenRouter `.env` setup, development workflow and commands, permissions, failure diagnostics, and locally runnable build checks must the implementation satisfy before it is ready for continued feature development?

Use [Choose application architecture](11-choose-application-architecture.md) as the fixed architecture: React/TypeScript/Vite, Tauri-supervised Node with LangChain and application-owned SQLite persistence, one app instance, and stdin/stdout process communication. Decide the supported local runtime/toolchain versions and how Node and the chosen SQLite binding are provisioned for development and the locally runnable build; account for any native dependencies. Define launch and shutdown supervision, explicit application-root `.env` resolution, app-data location and unsupported-schema diagnostics, runtime failure/restart instructions, and a reproducible build/run check. Signing and distribution remain out of scope.

## Comments

### Development contract discussion opened — 2026-09-07

Claimed for this wayfinder session. Two independent scope choices are pending the user's response:

- Q1: Validate the MVP on the user's current Mac, leaving broader macOS and Intel/Apple Silicon support for later, or require both architectures now. Recommendation: the current Mac only.
- Q2: Require a compiled local application launched by a documented command from this checkout with its installed Node runtime and application-root `.env`, or additionally require independent Finder launch with bundled Node. Recommendation: checkout-based development and compiled launch.

A read-only investigation is checking installed tooling and official runtime/prerequisite documentation. Exact version pins, SQLite provision, launch/build commands, permissions, diagnostics, and verification remain open. No application scaffolding or implementation has begun.

### Supported machine and launch scope accepted — 2026-09-07

The user accepted both first-round recommendations (Q1–Q2):

- Validate this MVP on the user's current Mac. Broader macOS-version and Intel/Apple Silicon support are not requirements of this effort.
- Launch both development and the compiled local application through documented commands from this checkout, using an installed Node runtime and the explicit application-root `.env`. Independent Finder launch and bundling Node are not requirements.

These supersede the pending status of Q1–Q2 above. Toolchain, SQLite provision, command contracts, permissions, diagnostics, and reproducible verification remain open.

### Local facts and second-round proposals — pending

Read-only inspection found macOS 26.4 (25E246), arm64, Node 22.23.2, npm 10.9.8, pnpm 10.33.2, Rust/Cargo 1.84.1, and Xcode Command Line Tools/SDK 26.2. No application manifests or toolchain lockfiles exist yet. An in-memory `node:sqlite` query works on installed Node, with an experimental warning; this is not application persistence verification.

Proposals for the user's next round:

- Q3 — Toolchain and SQLite: start with Node 24.20.0 LTS, pnpm 10.33.2, Rust 1.98.1, and existing Command Line Tools 26.2, targeting `aarch64-apple-darwin` on this Mac. Pin tools and dependencies in the implementation and verify the whole dependency graph. Use Node's built-in `node:sqlite`, with short synchronous transactions, avoiding a separately compiled SQLite addon. The API is release-candidate, not fully stable. These are proposed starting pins, not a claim that the application builds already; any compatibility-driven pin adjustment must be recorded with the validated versions.
- Q4 — Commands and lifecycle: provide `pnpm install --frozen-lockfile`, `pnpm doctor`, `pnpm dev`, `pnpm check`, `pnpm build`, and `pnpm start`. Build compiles frontend, Node runtime, and the native executable; start runs the compiled application without Vite. Launchers derive absolute application paths from their own checkout, resolve the selected Node executable once, and pass both through Tauri to its supervised runtime. Read only the explicit application-root `.env` for OpenRouter Configuration, overriding inherited values for those two keys; copy `.env.example` once and never overwrite existing configuration. Frontend changes may hot-reload; Node/Rust changes restart the app and interrupt active work. Closing the last window, Quit, or Ctrl-C shuts down all owned processes; allow five seconds for graceful shutdown before terminating remaining owned processes. This cleanup grace is not an Agent Execution timeout.
- Q5 — Development data: development and compiled launch share one stable app identifier and the same app-private database under macOS Application Support. Tests use isolated temporary data. Normal rebuilds preserve data; unsupported schema errors retain the existing non-destructive behavior. No reset command runs automatically.
- Q6 — Diagnostics and verification: a local-only doctor checks tool versions, paths, configuration presence without printing values, and SQLite availability, with no provider request. Runtime/storage/permission failures identify the affected operation and path and give corrective steps in the UI/terminal, with startup stderr in the launching terminal; no separate diagnostic dashboard. Use ordinary macOS permissions and document access-denied recovery without requiring blanket Full Disk Access. Require offline type/lint/tests, native build, development and compiled smoke checks, and one explicitly invoked real OpenRouter Scan with Stop and restart/persistence checks. Deterministic tests cover the existing architecture failure contracts. Never make paid requests part of install, doctor, build, or default checks.

Sources: [Node release status](https://nodejs.org/en/about/previous-releases), [Node 24 SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html), [Rust 1.98.1 release](https://blog.rust-lang.org/2026/09/03/Rust-1.98.1/), and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Node 24 SQLite reached release-candidate status in 24.15.0; Tauri desktop supports Command Line Tools without full Xcode. No toolchain upgrades, application scaffolding, or application tests were performed in this planning session. Q3–Q6 remain unaccepted.

### Toolchain, commands, shared data, and deferrals — 2026-09-07

The user accepted the updated toolchain pins: Node 24.20.0, Rust 1.98.1, pnpm 10.33.2, with existing Command Line Tools 26.2. Application dependency versions must also be pinned when selected; these runtime/toolchain versions do not specify as-yet-unselected React, Tauri, or LangChain package versions. No tools have been upgraded by this planning decision.

The user narrowed the application command surface to `pnpm dev`, `pnpm build`, and `pnpm start`, and accepted shared app-private data between development and compiled launch. The more detailed lifecycle proposals in Q4, including the five-second shutdown grace, were not explicitly accepted by the command-only response; existing architecture supervision requirements remain authoritative.

The user explicitly deferred diagnostics and verification for now. Do not add `doctor`, `check`, diagnostic tooling, a verification suite, or mandatory implementation-verification gates to this development contract. This supersedes the earlier Q6 proposal and the architecture ticket's requirement to sequence verification before implementation. Preserve earlier research/probe ideas as deferred context without treating them as performed or as current blockers. Existing application behavior such as reporting failed executions and preserving unsupported storage is not replaced by this tooling deferral.

Database selection remains open in this discussion: the user asked about alternatives such as PostgreSQL and what contemporary startups use. The earlier SQLite architecture choice has not yet been replaced. A recommendation and evidence will be discussed before resolving this ticket.

### Database comparison — recommendation pending

Recommend retaining SQLite for one app-private catalog/chat/history store accessed by one local Node process. It provides relational queries and atomic transactions without another running service. PostgreSQL is suitable for shared server-side data and multiple concurrent clients, but its client/server model adds a local database service to install, configure, and start, or introduces a hosted backend outside the current destination. Sharing data among future users would warrant revisiting that architecture; it is not a current requirement. SQLite itself is mature; the release-candidate caveat concerns Node's `node:sqlite` API, a separate binding decision.

Contemporary examples span multiple choices rather than one universal startup database: Lovable's Supabase integration uses PostgreSQL; Linear has documented PostgreSQL in its backend; MongoDB's published Super AI case study describes adoption of MongoDB Atlas. These examples establish use, not a market-share ranking or a reason to copy a hosted backend into a desktop app.

Evidence: [SQLite application storage](https://www.sqlite.org/appfileformat.html), [PostgreSQL client/server architecture](https://www.postgresql.org/docs/17/tutorial-arch.html), [Lovable's Supabase integration](https://docs.lovable.dev/integrations/supabase), [Linear engineering incident report](https://linear.app/now/linear-incident-on-jan-24th-2024), [Super AI case study](https://www.mongodb.com/solutions/customer-case-studies/super-ai). The database discussion remains open pending the user's choice.

### Conductor comparison — 2026-09-07

The user asked what Conductor uses, interpreted as the conductor.build macOS coding-agent app. Read-only file-type inspection of the installed app's `~/Library/Application Support/com.conductor.app/conductor.db` confirmed a SQLite 3 database; no records were queried. A [published Conductor development setup script](https://gist.github.com/cbh123/2754b0f3594fa7a8207d6a908a3a1b81) also accesses that database using `sqlite3`. This establishes local SQLite use, not the app's complete cloud architecture or its runtime binding. The user's database choice remains pending.

### Database accepted — 2026-09-07

The user chose to retain SQLite after discussing PostgreSQL and Conductor's local storage. This settles the remaining database choice and retains the recommended built-in interface in the pinned Node runtime. The answer below consolidates the accepted choices and supersedes historical pending proposals above.

## Answer

### Supported machine and pinned tools

Target the user's current Mac: Apple Silicon (`aarch64-apple-darwin`), macOS 26.4, with Xcode Command Line Tools/SDK 26.2. Broader macOS-version coverage, Intel builds, and universal binaries are outside this effort. Full Xcode is not required for the desktop target.

Pin Node 24.20.0, pnpm 10.33.2, and Rust 1.98.1 in the implementation's version metadata and toolchain files. Pin application dependencies when selected and retain JavaScript and Cargo lockfiles. These toolchain choices do not invent versions for unselected React, Tauri, or LangChain packages. Install Node locally; Tauri launches it as the supervised runtime. No bundled Node, database server, Docker dependency, or independent Finder launch is required.

### Database and shared local data

Retain SQLite through Node's built-in `node:sqlite` interface. SQLite arrives with the pinned Node installation, so there is no additional native SQLite addon to provision. The Node interface's release-candidate status is an accepted tradeoff, distinct from SQLite's maturity. Keep synchronous database operations short within the application-owned persistence module and preserve the atomic-result contract from [Choose application architecture](11-choose-application-architecture.md).

Development and compiled launch use the same stable application identifier and app-private database under `~/Library/Application Support/<application-identifier>/`, outside the analyzed Repository. Rebuilds preserve Workspaces, flows, chat, and history. Keep the unsupported-storage and deletion behavior from [Define Workspace persistence](08-define-workspace-persistence.md), including no automatic reset. No separate development database is required. If tests are introduced later, their temporary data must be isolated from this store.

### Three application commands

After ordinary dependency installation and `.env` setup, expose only these application workflow commands:

| Command | Behavior |
| --- | --- |
| `pnpm dev` | Run the React/Vite frontend in the Tauri desktop host with its supervised Node runtime. |
| `pnpm build` | Compile the frontend, Node application code, and local native executable for this Mac. |
| `pnpm start` | Launch the compiled desktop application from the checkout, using installed Node without the Vite development server. |

Use the explicit checkout root for application resources and OpenRouter Configuration. Preserve [Define model and cost controls](07-define-model-and-cost-controls.md): committed `.env.example`, ignored root `.env`, required `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, restart after configuration changes, no provider preflight, and continued access to stored data when configuration is missing. The selected Repository and tool working directories never supply application configuration. Keep the credential out of frontend configuration and execution metadata.

Retain the single-instance, process communication, parent-loss cleanup, cancellation, and interruption behavior from [Choose application architecture](11-choose-application-architecture.md). Runtime loss requires restarting through the applicable launch command; no automatic execution resumption is added. This decision does not introduce a specific shutdown grace period or new window-close behavior; the unaccepted five-second proposal above is not a requirement.

### Diagnostics and verification deferred

The user explicitly chose no diagnostics or verification for now. Do not add `pnpm doctor`, `pnpm check`, diagnostic tooling, a verification suite, required smoke/paid-model runs, or mandatory verification gates in this phase. Earlier research and architecture probe lists remain deferred context, not work required before implementation may proceed. Normal compilation is part of `pnpm build`; successful compilation must not be described as proving the behavioral contracts.

Existing product behavior for failed Agent Executions, runtime failure, and non-destructive storage errors remains as previously decided. This tooling deferral adds no new permission or diagnostic workflow.

This was a planning decision: no application was scaffolded, no installed toolchain was changed, and no application behavior was verified. [Define MVP acceptance specification](13-define-mvp-acceptance-specification.md) is now unblocked to settle the final specification and implementation decomposition under these reduced requirements.
