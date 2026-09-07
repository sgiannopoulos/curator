import { z } from "zod";

/**
 * A User Flow is Active while it is treated as describing behavior that is
 * possible and current, and Outdated once evidence indicates otherwise. It is
 * a current state, not a history: there is no revision list behind it.
 */
export const userFlowStatuses = ["active", "outdated"] as const;
export const userFlowStatusSchema = z.enum(userFlowStatuses);
export type UserFlowStatus = z.infer<typeof userFlowStatusSchema>;

export function describeStatus(status: UserFlowStatus): string {
  return status === "active" ? "Active" : "Outdated";
}

/**
 * Who made a change. Origins distinguish the user's own curation from a Scan's
 * or the agent's without recording what the flow said before.
 */
export const mutationOrigins = ["manual", "scan", "agent"] as const;
export const mutationOriginSchema = z.enum(mutationOrigins);
export type MutationOrigin = z.infer<typeof mutationOriginSchema>;

/**
 * Evidence for a judgment about a User Flow: a Repository-relative location
 * with a one-based line or tight range and an explanation, never a copied
 * excerpt or a confidence score. Citations are display-only in this MVP, and
 * only a Scan or the agent creates them.
 */
export const sourceCitationSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  explanation: z.string(),
  acceptedAt: z.string().min(1),
});

export type SourceCitation = z.infer<typeof sourceCitationSchema>;

export const userFlowSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: userFlowStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  createdBy: mutationOriginSchema,
  updatedBy: mutationOriginSchema,
  citations: z.array(sourceCitationSchema),
});

export type UserFlow = z.infer<typeof userFlowSchema>;

/** What a person may type when writing a flow themselves. */
export const userFlowDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
});

export type UserFlowDraft = z.infer<typeof userFlowDraftSchema>;
