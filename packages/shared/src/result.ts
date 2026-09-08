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

const resultIdentity = {
  executionId: z.string().min(1),
  workspaceId: z.string().min(1),
  eventId: z.string().trim().min(1),
};
const flowIdentity = { ...resultIdentity, flowId: z.string().min(1) };
const supportingCitations = z.array(citationDraftSchema).min(1);

/**
 * What a source review concluded about a User Flow. Supported and contradicted
 * are positive readings of the source and carry the evidence for it;
 * indeterminate is the honest answer when inspection could not settle it.
 */
export const reviewJudgments = ["supported", "contradicted", "indeterminate"] as const;
export const reviewJudgmentSchema = z.enum(reviewJudgments);
export type ReviewJudgment = z.infer<typeof reviewJudgmentSchema>;

/** Wording and indeterminate review cannot smuggle in evidence/status changes. */
export const existingFlowResultSchema = z.discriminatedUnion("kind", [
  z.object({ ...flowIdentity, kind: z.literal("edit-wording"), ...userFlowDraftSchema.shape }).strict(),
  z.object({ ...flowIdentity, kind: z.literal("edit-behavior"), ...userFlowDraftSchema.shape,
    citations: supportingCitations }).strict(),
  z.discriminatedUnion("judgment", [
    z.object({ ...flowIdentity, kind: z.literal("review-flow"), judgment: z.enum(["supported", "contradicted"]),
      citations: supportingCitations }).strict(),
    z.object({ ...flowIdentity, kind: z.literal("review-flow"), judgment: z.literal("indeterminate"),
      explanation: z.string().trim().min(1) }).strict(),
  ]),
  z.object({ ...flowIdentity, kind: z.literal("delete-flow") }).strict(),
]);

/** One event in an execution-owned outbox; the application owns durable state. */
export const resultEventSchema = z.discriminatedUnion("kind", [
  z.object({ ...resultIdentity, kind: z.literal("create-flow"), ...userFlowDraftSchema.shape,
    citations: supportingCitations }).strict(),
  existingFlowResultSchema,
]);

export const resultOutcomeSchema = z.object({
  executionId: z.string().min(1),
  eventId: z.string().min(1),
  kind: z.enum(["create-flow", "edit-wording", "edit-behavior", "review-flow", "delete-flow"]),
  flowId: z.string().min(1),
  acceptedAt: z.string().min(1),
});

/**
 * History records acceptance; it never rebuilds or restores current state.
 * flow is the accepted snapshot, or the last current snapshot for deletion.
 */
export const acceptedResultSchema = z.object({
  event: resultEventSchema,
  outcome: resultOutcomeSchema,
  flow: userFlowSchema,
});

export type CitationDraft = z.infer<typeof citationDraftSchema>;
export type ResultEvent = z.infer<typeof resultEventSchema>;
export type ExistingFlowResult = z.infer<typeof existingFlowResultSchema>;
export type ResultOutcome = z.infer<typeof resultOutcomeSchema>;
export type AcceptedResult = z.infer<typeof acceptedResultSchema>;
