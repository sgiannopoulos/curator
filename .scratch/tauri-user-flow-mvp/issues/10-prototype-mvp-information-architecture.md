Type: prototype
Status: resolved
Blocked by: 01, 02, 07, 08, 09

## Question

What concrete screen and interaction design best supports Workspace selection, unavailable Repositories and Relink, Scanning Effort selection, persistent full-fidelity Agent Chat, Source Citation inspection and freshness, User Flow browsing and free-text editing, agent-assisted curation, Active and Outdated review, deletion warnings, and operational error feedback without overwhelming the user, given that OpenRouter Configuration has no in-app UI and [Define Workspace persistence](08-define-workspace-persistence.md) fixes the persistence and recovery scope?

Use the shared conversation and interaction contract from [Define agent-assisted curation](09-define-agent-assisted-curation.md), including the explicit Scan action, busy-state behavior, and absence of separate curation tasks or selected-flow attachments.

## Comments

### Prototype prepared — 2026-09-06

Claimed for the current wayfinder session. Built [Workspace layout prototype](../prototype/index.html) with [run instructions and comparison notes](../prototype/README.md). The standalone route supports `?variant=A`, `B`, and `C`: Catalog first, Conversation first, and Focused tabs. Use the bottom switcher to compare the same in-memory catalog across layouts.

The prototype includes flow browsing, search and status filters, free-text editing, citation inspection, Workspace selection, Relink confirmation, deletion boundaries, Scan history, explicit Scanning Effort selection, busy states, and simulated failure and interruption scenarios. All source, model output, progress, filesystem selection, and persistence are mocked; it is a discussion artifact, not application scaffolding.

Browser review covered all three desktop layouts, switching variants, Scan exclusion of edits and messages, Stop returning to idle, unavailable Repository behavior, and manual Save retaining the status and citation. No production tests or integration claims are made.

Initial recommendation: Catalog first keeps the current User Flow, evidence, and Agent Chat visible together. The user has not yet selected or accepted a layout. Keep this ticket claimed and unresolved until the live prototype discussion settles the design. No domain terms changed and no application implementation was started.

This workspace has no Git repository, so the prototype cannot yet be captured on a throwaway branch; the linked local files retain the review asset.

### User-provided Curator design — 2026-09-06

The user supplied `First Design/` with a start page, app page, and flow-generation modal, and requested a workable prototype based on that design and the established discussion, without backend wiring.

The user explicitly chose to retain the testing UI and Git cloning as future placeholders, use **Curator** as the prototype name, and make the generation modal compose a request into the existing Workspace Agent Chat. These choices supersede the earlier agent recommendation of the Catalog first layout. They do not bring test execution into the MVP destination or create a separate agent task concept.

The [Curator prototype](../prototype/curator/index.html) and [run instructions and design notes](../prototype/curator/README.md) are the current review assets. The original handoff and earlier layout study are preserved. The new prototype uses the design’s palette, fonts, sidebar with resizable chat, detail area, inspector, and modal. It also exposes the MVP’s free-text description, Active/Outdated status, Source Citations, Workspace Scan history, manual-edit and deletion dialogs, and operational state previews. All data and effects remain simulated.

The user has selected a design direction; final interaction acceptance is still pending review of the adapted artifact. Keep the ticket claimed and unresolved, with no application implementation or further ticket resolution in this session.

### Shared column and independent minimization

The user accepts the flow list and Agent Chat sharing the left column for now and requests the ability to minimize either panel. The prototype now provides independent minimize/restore buttons in both headers. Minimized panels retain their headers; the other expanded panel takes the available space. Both may be minimized, and restoring them retains the selected flow, unsent chat draft, and previous split height. Explicitly composing a generation request restores the chat composer.

Browser checks verified each panel, both minimized together, restoration, preserved draft, and restored split height. This records the agreed shared-column direction and its requested refinement; it does not constitute acceptance of the whole prototype.

### Default User Flow view and Workspace options

The user accepted Description as the default when selecting a User Flow, with Source Citations alongside it in the right-hand inspector. Steps, Screenshots, and test-run history remain accessible as future previews. The prototype opens Description on initial load, Workspace opening, and flow selection; testing tabs retain their preview inspector.

The user also requested a cog icon for Workspace options. The button now uses an inline SVG cog with the existing accessible name and a matching tooltip. Its menu behavior is unchanged. Browser checks verified the default view, flow selection, and opening the menu from the cog.


### Citation interaction deferred

The user requests no action when a citation is clicked for now. Keep paths, line ranges, explanations, and freshness visible as display-only content. The prototype’s citation dialog has been removed; neither an inline source viewer nor an external-editor action is introduced. This defers the interaction rather than accepting either proposed navigation design.


## Answer

The Curator prototype is the agreed working design baseline for the MVP. The live discussion settled the choices that affect application behavior; further visual polish is not a prerequisite for architecture planning. Earlier comments describing this ticket as pending are historical and superseded by this resolution.

### Screens and navigation

Use the user-provided Curator design: a start page with recent Workspaces and folder selection, followed by the app page with the User Flow list and Agent Chat sharing the left column, a main reading area, and a right-hand inspector. Use Curator as the prototype name and a cog icon for Workspace options.

The flow list and Agent Chat can each be minimized independently to their headers. The other expanded panel takes the available space. Restore controls remain accessible, and restoring the shared split preserves its previous size, selected flow, and unsent chat draft. Chat also remains resizable.

Selecting a User Flow opens Description by default, with Source Citations in the right-hand inspector. Keep the flow title and free-text description as the current catalog content, with Active/Outdated status separate from citation freshness or future test results.

### Creation, editing, and Agent Chat

The Generate a flow modal composes a creation request in the existing Workspace Agent Chat and restores the composer when needed. The user can review and send that request. This is not a separate curation task, selected-flow attachment, or direct mutation by the modal.

Manual addition and editing use title and description fields with Save. The existing citation-retention, lifecycle, permanent-deletion confirmation, and historical-retention rules remain in effect. The prototype exposes Workspace options, Relink, deletion dialogs, and Workspace Scan history using those established contracts.

Scans remain an explicit action with Quick, Standard, or Maximum effort, separate from ordinary chat and future test execution. Keep the agreed busy-state exclusion, Stop behavior, retained committed results, complete Agent Chat, and operational feedback. The prototype provides illustrative running, failed, interrupted, missing-configuration, empty-Workspace, and unavailable-Repository states; it does not implement or validate their backend behavior.

### Deliberately deferred behavior

Source Citations display paths, line ranges, supporting explanations, and freshness. Clicking a citation does nothing for now. No source viewer, citation dialog, or external-editor navigation is required by this design baseline. This narrows the source-navigation interaction anticipated by earlier tickets; evidence retention and freshness requirements still apply.

Retain the handoff’s Steps, Screenshots, Run, test-run history, inferred assertions, and Git cloning as clearly identified future UI placeholders. They do not extend the map’s destination to test generation, execution, or cloning. Testing previews remain accessible separately from the default Description and source-evidence view.

### Primary assets and handoff

- [Curator prototype](../prototype/curator/index.html) is the current working design.
- [Run instructions and design notes](../prototype/curator/README.md) describe its files, mock behavior, and limits.
- [Earlier layout study](../prototype/index.html) remains reference material, not the chosen design.

The original Claude Design handoff is preserved in `First Design/`. The prototype is local and throwaway; there is no Git repository here in which to capture a prototype branch. Syntax and focused browser checks covered the local interactions, including minimization, restoration, default flow selection, and the cog menu. All data, agent execution, persistence, and filesystem operations remain mocked.

Proceed to the existing runtime research and application-architecture decisions. No new design ticket is needed, and this resolution does not select a production frontend stack, storage engine, or agent runtime.
