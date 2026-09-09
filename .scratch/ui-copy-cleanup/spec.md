# Interface copy cleanup

Status: ready-for-agent
Implementation: complete

## Problem

The app has too much static explanatory text. Repeated explanations and conversational filler make the interface cluttered and harder to read.

## Confirmed decisions

Confirmed by the user on 2026-09-09:

- Scope this pass to interface text. Agent replies, generated User Flow descriptions, and model prompts require separate rules and are outside this pass.
- Delete explanatory text unless it helps the user make a decision, understand an unexpected state, or recover from an error.
- Delete repeated explanations and conversational filler outright. Keep short, specific instructions where the next action is unclear.
- Remove entire unnecessary notes, subtitles, and explanatory blocks, and close the space they occupied. Do not merely shorten every paragraph.
- Keep Run, Steps, Screenshots, and Clone controls as future-feature previews. Use brief unavailable-state copy where needed and remove paragraphs explaining future functionality.
- Start accepted-result cards in Agent Chat collapsed. Keep the result summary visible and make the recorded description and details available on expansion, without rewriting generated content.

## Evidence

- `FlowDetail.tsx` and `Inspector.tsx` repeat explanations of citations, manual edits, and status during ordinary reading.
- `GenerateFlowDialog.tsx` explains request composition in its subtitle and repeats what happens after sending below the field.
- `ScanHistory.tsx` repeatedly explains retained history and new execution on retry.
- `AgentChat.tsx` adds explanatory wrappers around generated results and initially expands result descriptions already available in the catalog.
- Future testing controls and panels contain repeated explanations that testing is unavailable.

## Copy rules and concrete examples

- Prefer direct labels and short factual sentences. Remove conversational invitations, narration of obvious actions, repeated definitions, and descriptions of internal mechanics that do not help the current decision.
- Delete the persistent manual-edit/citation explanation beneath a User Flow description and the repeated explanation in the Inspector. Preserve actual citation content and evidence states.
- Remove the Generate a flow subtitle and footer explanations. Keep the field label and the action label "Compose in Agent Chat", which communicates that the request is composed before it is sent.
- Replace future-feature explanatory paragraphs with "Not available yet." Keep a visible Preview or equivalent unavailable indicator. For Clone, retain actionable guidance such as "Clone the repository locally, then choose its folder."
- Reduce the empty Recent panel to "No recent workspaces." Avoid repeating the adjacent folder-selection instruction.
- Remove the general Scan history introduction. Convey new execution on the retry control, for example "Start a new Scan", instead of repeating a paragraph beneath every record.
- Keep deletion consequences at confirmation time. A concise Workspace example is: "Permanently delete this workspace, its flows, chat, and scan history? This cannot be undone. Repository files are kept." A flow confirmation must still convey permanent removal and that a later Scan can rediscover the behavior.
- Preserve the meaning of recovery instructions, relink confirmation, incomplete usage, unavailable evidence, and unexpected states while shortening their wording.

Examples establish direction; final wording may be adjusted for the surrounding controls under these rules.

## Implementation scope

Audit rendered static copy across the start page, Workspace, flow list and detail, evidence Inspector, Agent Chat wrappers, Scan controls and history, and dialogs. Include application-authored status and error text where applicable, preserving its actionable meaning. Preserve stored chat entries and generated titles, descriptions, and citation explanations.

Remove unused styling and accessibility references associated with deleted blocks. Adjust local spacing to close gaps. Preserve accessible control names, field labels, and the functioning controls.

## Acceptance criteria

1. Ordinary reading views no longer show repeated explanations of citations, edits, status semantics, or internal execution rules.
2. Each remaining explanatory sentence serves a decision, an unclear next action, an unexpected state, or error recovery.
3. Preview controls remain visible and clearly unavailable, with concise copy.
4. Accepted-result cards start collapsed, retain a useful summary, and reveal their original content when expanded.
5. Confirmation and recovery flows still communicate consequences and the action required.
6. Deleted text leaves no empty explanatory containers, unused spacing rules, or dangling accessibility references.
7. Generated content, prompts, stored history, and application behavior remain intact apart from the agreed default result-card collapse and removal of explanatory UI blocks.
8. Run the relevant existing build/type checks and visually inspect representative populated and empty views and dialogs. Do not add tests that merely assert replacement wording.

## Decision state

All five interview decisions are settled. The user confirmed shared understanding and authorized implementation on 2026-09-09.

## Design boundaries

Product implementation is complete.

No domain terminology has changed. These reversible copy and presentation changes do not currently warrant an ADR.

## Verification

Completed on 2026-09-09:

- `pnpm build` passed for shared contracts, runtime, frontend type checking, production frontend assets, and the native macOS app bundle.
- `git diff --check` passed.
- Rendered the actual React components with temporary in-memory fixtures at the app's default 1240 × 846 window size. Inspected the start page, empty and populated Workspaces, outdated and unavailable-source states, Scan history, testing previews, Generate a flow, the flow editor, Relink, and Workspace deletion confirmation.
- Confirmed accepted-result cards start collapsed and expand to reveal the original description and recorded details.
- Browser console reported no warnings or errors during the inspected flows.
- Removed the preview fixtures and stopped the temporary server. No live Workspace data was used or changed.

The UI checks verify presentation and disclosure behavior. Native folder selection, provider requests, and destructive operations were not exercised; their handlers are unchanged. Existing stored chat and generated content were not rewritten.
