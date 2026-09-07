# Prototype MVP information architecture

The current design is the [Curator prototype](curator/README.md), based on the user’s Claude Design handoff. Open `/curator/?page=start` using the server below. This parent page retains the earlier three-variant layout study for reference.

Throwaway, planning-only prototype. Three structural variations of the entire Workspace, on one standalone route using `?variant=A`, `B`, or `C`. This repository has no application route or task runner yet.

Run from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory .scratch/tauri-user-flow-mvp/prototype
```

Open http://127.0.0.1:8765/?variant=A, or open `index.html` directly. All data is fictional and held in memory; reloading resets it. No Repository, filesystem, provider, or persistence integration exists. Chat responses, Scan events, source previews, directory selection, and failures are simulated. The scenario controls and bottom variant switcher are prototype-only and have no production build.

- **A — Catalog first:** persistent flow list, reading pane, and Agent Chat beside each other.
- **B — Conversation first:** Agent Chat takes the main stage, with a compact catalog and flow inspector alongside it.
- **C — Focused tabs:** User Flows, Agent Chat, and Scan history occupy separate views; an activity strip keeps work visible across tabs.

Try selecting an Outdated flow, editing a description, opening a Stale citation, starting and stopping a Scan, and switching the scenario to Repository unavailable. Compare the same state across all three variants.

Design plan: slate `#e8ecf1` navigation, paper `#ffffff` reading surfaces, ink `#243349`, blue `#215bc4` selection, green `#246347` Active status, and amber `#805c12` caution. Use macOS system type for controls and prose, monospace only for source locations and tool output. Left-aligned text, compact flow rows, and a reading measure under 80 characters. Shared source-grounded sample content keeps the comparison about workspace structure rather than decoration.

Verdict pending a live user review. Keep the decision ticket claimed. This directory is not a Git repository, so no throwaway branch can be captured here yet; this local asset is the reviewable primary source.
