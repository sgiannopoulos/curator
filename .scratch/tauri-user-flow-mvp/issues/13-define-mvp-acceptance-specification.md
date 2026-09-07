Type: grilling
Status: claimed
Blocked by: 06, 08, 09, 10, 11, 12

## Question

What functional, safety, persistence, failure-recovery, usability, and human-reviewed inference outcomes define the locally runnable MVP while avoiding an unsupported guarantee of exhaustive flow discovery? Carry forward the atomic-result, interruption, citation, retention, deletion, and Repository-locator behavior resolved in [Define Workspace persistence](08-define-workspace-persistence.md).

Include the shared Agent Chat, explicit Scan action, busy-state behavior, chat-driven citation rules, and prompt-governed authority from [Define agent-assisted curation](09-define-agent-assisted-curation.md); distinguish observable application enforcement from best-effort prompt adherence.

With [Choose application architecture](11-choose-application-architecture.md) settled, what final specification structure and implementation decomposition make the MVP ready to build? Organize the handoff around the accepted module interfaces and shared contracts, and link to the canonical decision tickets rather than duplicating their full answers. This graduates the map's former fog about specification structure and implementation decomposition into this question.

The user deferred diagnostics and verification in [Define macOS development contract](12-define-macos-development-contract.md#toolchain-commands-shared-data-and-deferrals--2026-09-07). Do not add diagnostic tooling, a verification suite, or mandatory verification gates in this phase. Keep the intended provider, execution, concurrency, and persistence contracts in the specification for ordinary chat and Scans; retain the earlier probe lists only as linked deferred context. Do not present the research's source-inferred runtime behavior as already tested.

## Comments

### Final handoff discussion opened — 2026-09-07

Claimed for this wayfinder session. Read the map, glossary, architecture and development contracts; a read-only supporting investigation reviewed the settled product journey and lifecycle decisions. No application implementation has begun.

Two handoff proposals await the user's choices:

- Q1 — Specification structure: create a compact `../spec.md` containing the end-to-end user journey, observable behavior and failure outcomes, module ownership/shared contracts, local launch contract, and explicit deferrals. Link canonical decision answers and the accepted Curator assets instead of copying their full detail. Keep human judgment of inference quality and the existing precision-first/source-citation requirements; introduce no discovery-count target, reference-repository gate, diagnostic tooling, or verification suite.
- Q2 — Implementation decomposition: create separate implementation issues, distinct from wayfinding decision tickets, ordered as desktop/runtime foundation; Workspace persistence and manual curation; shared Agent Execution, tools, and ordinary Agent Chat; Scan Review/Discovery; and complete Curator integration. Each issue names its owned interfaces, prerequisites, and expected application behavior. Deliver the plan only; implementation starts after wayfinding ends.

These are proposals, not accepted decisions. The ticket remains claimed pending live discussion under the wayfinder and grilling skills.

### Workflow correction — 2026-09-07

The user challenged whether the preceding questions belong in `/to-spec`. Reading `/ask-matt`, `/to-spec`, and `/to-tickets` confirms the boundary: wayfinder settles unresolved decisions; `/to-spec` synthesizes the linked decisions into the specification; `/to-tickets` proposes and discusses implementation slices and their dependencies.

Withdraw Q1 and Q2 above as wayfinder questions. They do not require user answers here and were not accepted. The proposed compact specification is not a replacement for the `/to-spec` template, and the proposed module-oriented build order is not an approved breakdown; `/to-tickets` calls for independently demonstrable end-to-end slices. No new unresolved product decision was identified in this session. The next workflow step is `/to-spec` with the map and its linked decisions, preserving the user's diagnostics and verification deferral. No specification or implementation tickets have been produced by this correction.
