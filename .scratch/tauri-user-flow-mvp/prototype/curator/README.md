# Curator design prototype

The current visual direction for [Prototype MVP information architecture](../../issues/10-prototype-mvp-information-architecture.md), based on the user’s Claude Design handoff in `First Design/project/`. This is a throwaway planning artifact, with plain HTML, CSS, and JavaScript separated so it is easy to change. It does not select the eventual Tauri application architecture.

## Open the prototype

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory .scratch/tauri-user-flow-mvp/prototype
```

- Start page: http://127.0.0.1:8765/curator/?page=start
- App page: http://127.0.0.1:8765/curator/?page=app

You can also open `index.html` directly. The only external resources are the handoff’s Instrument Sans and IBM Plex Mono fonts from Google Fonts; local fallbacks are provided. No JavaScript runtime or build-tool installation is needed. No backend, provider, native directory picker, persistence, or test runner is connected. All mutations affect mock data in memory, and reload or Reset discards them.

## Files to change

- `index.html`: page entry point and font imports.
- `styles.css`: design tokens, layout, components, and responsive rules.
- `mock-data.js`: fictional Workspaces, User Flows, citations, chat, Scan history, and future test previews.
- `app.js`: page rendering and small local interactions, including dialogs and resizing.

The Claude Design source files are preserved. Both primary HTML files and their shared `support.js` were read. The handoff runtime translates custom templates into React and loads CDN scripts; the new prototype recreates the design directly and does not require that export runtime. The upload image is not referenced by either design page and is not used. The source design files were not rendered or screenshotted.

## Accepted direction

The user chose the following during this session:

- Use **Curator** as the prototype’s name.
- Retain the testing UI and Git cloning as **future placeholders**. These do not expand the source-analysis MVP into test execution.
- **Generate a flow** composes a creation request in the existing Workspace Agent Chat. The modal does not create a separate task or immediately create a User Flow.

The layout preserves the cream and sand surfaces, sage and tan accents, 340px sidebar, 312px inspector, 1240×846 desktop frame, 372px recent-Workspace panel, and 620px generation modal. The Agent Chat begins at the handoff’s 152px height and can be resized by dragging or with arrow keys on its separator. Smaller windows adapt the layout; the inspector is hidden below 900px and the panes stack below 640px.

## What you can try

- Navigate between recent Workspaces and the app page.
- Browse the test-preview grouping or switch to Active/Outdated grouping with the control above the flow list.
- Opening a Workspace or selecting a User Flow opens Description by default, with Source Citations in the right-hand inspector. Steps and Screenshots retain the future testing inspector. The cog beside the Workspace name opens Workspace options.
- Open Description and edit a flow’s title and free-text description; its status and citations remain unchanged.
- Open Generate a flow, choose an example, and compose it in Agent Chat. Sending shows the message and a clearly identified mock response; it never interprets the request or changes the catalog.
- Drag the chat separator or expand the same conversation into the reading pane.
- Minimize either the flow list or Agent Chat with its header’s minus button; restore it with the plus button. The other panel takes the available space. Both can be minimized independently. Restoring the split keeps its previous size, selected flow, and unsent chat draft. Composing a generation request restores Agent Chat automatically.
- Read Source Citations and their freshness states. Citations are display-only for now; clicking them does not open a dialog, source viewer, or external editor.
- Use Workspace options for manual addition, Scan history, simulated Relink, and deletion dialogs.
- Use the prototype scenario selector for empty, unavailable Repository, missing configuration, running, failed, and interrupted states. Changing scenarios resets the sample data.
- Open Run, trace, assertion, and cloning controls to see their future-feature explanation. Screenshots has a future-feature empty state.

Testing status and source-based lifecycle are deliberately separate: the checkout test preview is Failing while the User Flow is Active. Historical test metrics and assertions are fictional layout samples; they are not quality, confidence, or source-coverage measures. The authoritative MVP flow remains a title and free-text description with Source Citations, not a structured test-step object.

## Verification and limits

JavaScript syntax checks passed. Browser interaction checks covered start-to-app navigation, modal example selection, composing into chat without adding a flow, free-text Save retaining citations, and busy-state exclusion of edits and messages. The new prototype was inspected through browser accessibility/DOM state; no screenshots of the source design were taken.

This is the resolved working design baseline for architecture planning; visual refinements may continue without blocking that work. Scan outcomes, test previews, source metadata, and filesystem operations remain simulated. The existing three-variant layout study is still available at the parent `index.html`. No production implementation or automated test suite was added.
