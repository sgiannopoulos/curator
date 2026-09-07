import { z } from "zod";
import { userFlowDraftSchema, userFlowSchema } from "./user-flow.js";

/** Agent-supplied evidence; acceptance assigns citation identities and dates. */
export const citationDraftSchema = z.object({
  path: z.string().trim().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  explanation: z.string().trim().min(1),
}).strict().refine((citation) => citation.endLine >= citation.startLine, {
  path: ["endLine"], message: "endLine must be at least startLine",
});

/** One event in an execution-owned outbox. Other mutations arrive separately. */
export const resultEventSchema = z.object({
  executionId: z.string().min(1),
  workspaceId: z.string().min(1),
  eventId: z.string().trim().min(1),
  kind: z.literal("create-flow"),
  ...userFlowDraftSchema.shape,
  citations: z.array(citationDraftSchema).min(1),
}).strict();

export const resultOutcomeSchema = z.object({
  executionId: z.string().min(1),
  eventId: z.string().min(1),
  kind: z.literal("create-flow"),
  flowId: z.string().min(1),
  acceptedAt: z.string().min(1),
});

/** History records acceptance; it never rebuilds or restores current state. */
export const acceptedResultSchema = z.object({
  event: resultEventSchema,
  outcome: resultOutcomeSchema,
  flow: userFlowSchema,
});

export type CitationDraft = z.infer<typeof citationDraftSchema>;
export type ResultEvent = z.infer<typeof resultEventSchema>;
export type ResultOutcome = z.infer<typeof resultOutcomeSchema>;
export type AcceptedResult = z.infer<typeof acceptedResultSchema>;
