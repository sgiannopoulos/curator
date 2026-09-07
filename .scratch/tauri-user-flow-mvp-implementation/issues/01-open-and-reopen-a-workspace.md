# 01: Open and reopen a Workspace

**What to build:** Launch the local macOS application, select a Repository, and reopen the same persisted Workspace from the Curator start page after restarting or rebuilding the application.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The app runs from its checkout on the accepted Apple Silicon Mac using pinned Node 24.20.0, pnpm 10.33.2, Rust 1.98.1, and the existing macOS 26.4 / Command Line Tools 26.2 target. Application dependencies are pinned when selected and JavaScript and Cargo lockfiles are retained.
- [ ] After ordinary dependency installation and application configuration setup, pnpm dev runs the React/TypeScript/Vite frontend in Tauri with a supervised Node runtime; pnpm build compiles frontend, runtime, and native executable; pnpm start launches the compiled app without Vite. Document these commands and prerequisites without adding doctor/check commands or verification gates.
- [ ] The Curator start page provides native directory selection and recent Workspaces. Selecting a directory creates a stable Workspace identity, normalized absolute Repository Locator, and timestamps; its display name comes from the directory.
- [ ] Selecting an exactly matching normalized Repository Locator reopens the existing Workspace. Git metadata, directory contents, names, and filesystem identities do not infer another identity or silently create a duplicate.
- [ ] Workspace creation and reopening traverse the frontend, typed Tauri command/event bridge, Node Workspace application, and application-owned SQLite store. Node owns database access through its built-in SQLite interface; the frontend is a projection of persisted state.
- [ ] Validate shared message schemas at runtime, correlate requests and replies, and provide ordered state updates. Node process communication uses stdin/stdout while process logs use stderr.
- [ ] Development and compiled launch share one stable application identifier and app-private Application Support store outside the Repository. Rebuilds preserve supported storage; version the initial schema and show a non-destructive error identifying unsupported or unreadable storage without automatic reset.
- [ ] One application instance supervises one Node runtime; a second launch focuses the existing window. Host shutdown and parent-connection loss stop owned work, and runtime loss is visible with a restart requirement. Later execution/tool slices extend this same supervision contract.
- [ ] Use the accepted Curator start-page design and an empty Workspace destination with a Workspace-options cog. Git cloning is explicitly a future placeholder. Do not ship mock Repository data or prototype scenario controls.

## Scope and sources

This establishes a working selection-to-persistence path. Catalog editing, hosted conversation, and Relink arrive in their own slices; do not implement a second persistence or transport authority for them.

Source: [MVP specification](../../tauri-user-flow-mvp/spec.md) — User Stories 1–4, 10, 72–74; Implementation Decisions 2–5, 25–26, 30. Use the [decision map](../../tauri-user-flow-mvp/map.md) for canonical decision detail and the [domain glossary](../../../CONTEXT.md) for terminology.

Diagnostics and verification remain deferred. These checkboxes describe required application behavior; they do not add an automated verification suite, diagnostic commands, mandatory smoke checks, or required paid-model runs. Preserve normal compilation and existing product error reporting. Later decisions in the canonical spec supersede older research/probe proposals.

