# Agent prompts

Edit the Markdown files here to change what Curator tells the model. The runtime
loads them directly from this checkout in both `pnpm dev` and compiled
`pnpm start` launches. Restart Curator's runtime after editing; prompt files are
cached until restart. Markdown-only changes do not need a rebuild.

| File | What to edit |
| --- | --- |
| [system.md](system.md) | Shared source-inspection rules, citation requirements, result submission, and where current execution state is inserted. |
| [scan.md](scan.md) | Scan orientation, discovery, semantic comparison, progress reporting, and final gap check. |
| [scan-review.md](scan-review.md), [scan-review-skipped.md](scan-review-skipped.md) | The Review Pass over the flows a Scan started with, or the note that there were none. |
| [effort/quick.md](effort/quick.md), [effort/standard.md](effort/standard.md), [effort/maximum.md](effort/maximum.md) | The model's requested detail for each Scanning Effort. |
| [scan-request.md](scan-request.md) | The explicit Scan request recorded in Agent Chat. |
| [chat-authorization.md](chat-authorization.md) | What an ordinary chat request authorizes. |
| [chat-curation.md](chat-curation.md) | Ordinary-chat editing, source review, status changes, and deletion rules. |
| [chat-execution.md](chat-execution.md) | Identity and phase explanation for ordinary chat. |
| [compaction.md](compaction.md) | Instructions used to summarize earlier exchanges. |
| [compaction-context.md](compaction-context.md) | How a completed summary is introduced in later requests. |
| [tools/report-scan-progress.md](tools/report-scan-progress.md) | The Scan progress tool description shown to the model. |
| [tools/submit-result-scan.md](tools/submit-result-scan.md), [tools/submit-result-chat.md](tools/submit-result-chat.md) | Result-submission tool descriptions for each execution kind. |

Repository tool descriptions remain beside their input
schemas in `packages/runtime/src/repository-access.ts`.

## Placeholders

`{{name}}` inserts a value supplied by the runtime. Keep placeholder names intact;
there are no template expressions, includes, or executable code. Values are
inserted literally in one pass, so a Repository path or catalog description
containing braces or dollar signs is not interpreted as another placeholder.

| Template | Available placeholders |
| --- | --- |
| `system.md` | `repositoryLocator`, `chatAuthorization`, `chatCuration`, `outboxFile`, `creationExample`, `executionInstructions`, `currentCatalog`, `acceptedResults` |
| `scan.md` | `effort`, `effortInstructions`, `reviewInstructions`, `executionId`, `workspaceId`, `scanState` |
| `scan-review.md` | `reviewCount`, `reviewExample`, `indeterminateExample` |
| `scan-request.md` | `effort` |
| `chat-execution.md` | `executionId`, `workspaceId` |
| `compaction-context.md` | `replaced`, `summary` |
| `tools/submit-result-*.md` | `outboxFile` |

All other templates contain plain instructions. Their Markdown is sent directly
to the model; this README is not part of any prompt. The runtime chooses the
execution-specific files and supplies current state on every request, keeping
catalog state, Scan phase, and accepted-event accounting outside lossy summaries.

Missing or empty files and unknown placeholders report an actionable error when
the affected prompt is used. They do not silently use an older hard-coded prompt
or prevent access to stored Workspace data. Editing prose does not change tool
schemas, result validation, or execution lifecycle gates; those remain in code.
