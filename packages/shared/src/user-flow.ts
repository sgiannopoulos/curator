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

/**
 * How a Source Citation's referenced location reads against the Repository
 * now, compared with the file content recorded when the evidence was accepted.
 *
 * Freshness describes the source, not the behavior. Stale evidence and a
 * location that cannot be read are observations about a file; neither is proof
 * that the User Flow's behavior changed, and neither moves it between Active
 * and Outdated.
 */
export const citationFreshnessStates = ["unchanged", "stale", "unavailable"] as const;
export const citationFreshnessStateSchema = z.enum(citationFreshnessStates);
export type CitationFreshnessState = z.infer<typeof citationFreshnessStateSchema>;

/**
 * Unchanged, rather than current: Active and Outdated are the words for a
 * User Flow's own state, and a file is not either of those.
 */
export function describeFreshness(state: CitationFreshnessState): string {
  return state === "unchanged" ? "Unchanged" : state === "stale" ? "Stale" : "Unavailable";
}

export const citationFreshnessSchema = z.object({
  citationId: z.string().min(1),
  state: citationFreshnessStateSchema,
  detail: z.string().min(1),
});

export type CitationFreshness = z.infer<typeof citationFreshnessSchema>;

/**
 * One reading of a User Flow's evidence. It is recalculated from the current
 * Repository Locator every time evidence is inspected or refreshed and is
 * never stored, so a location that becomes readable again simply reads as
 * unchanged again.
 */
export const evidenceFreshnessSchema = z.object({
  flowId: z.string().min(1),
  checkedAt: z.string().min(1),
  repositoryAvailable: z.boolean(),
  citations: z.array(citationFreshnessSchema),
});

export type EvidenceFreshness = z.infer<typeof evidenceFreshnessSchema>;
