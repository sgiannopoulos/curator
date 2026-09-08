import { z } from "zod";
import { reviewJudgmentSchema } from "./result.js";

export const scanningEfforts = ["quick", "standard", "maximum"] as const;
export const scanningEffortSchema = z.enum(scanningEfforts);
export type ScanningEffort = z.infer<typeof scanningEffortSchema>;

/**
 * Where a Scan has reached. Orientation reads the Repository, the Review Pass
 * accounts for every User Flow the catalog held when the Scan started, and
 * discovery looks for more. The phase is persisted application state rather
 * than the agent's belief: it is what permits a result to be accepted.
 */
export const scanPhases = ["orientation", "review", "discovery"] as const;
export const scanPhaseSchema = z.enum(scanPhases);
export type ScanPhase = z.infer<typeof scanPhaseSchema>;

/** What to call the pass a Scan is in, wherever a reader is shown it. */
export function describeScanPhase(phase: ScanPhase): string {
  return phase === "orientation" ? "Repository orientation"
    : phase === "review" ? "Review Pass" : "Discovery Pass";
}

/** One input identity's initial Review Pass judgment. */
export const reviewAccountSchema = z.object({
  flowId: z.string().min(1),
  judgment: reviewJudgmentSchema,
});
export type ReviewAccount = z.infer<typeof reviewAccountSchema>;

/**
 * The Scan-specific part of its durable Agent Execution. Lifecycle, model,
 * usage, chat, activity, and accepted results are associated by execution id;
 * they retain their existing authorities rather than being copied here.
 *
 * reviewInputs is the catalog as it stood when this Scan claimed the Workspace,
 * and reviewed is what the Review Pass has accounted for since. An empty
 * reviewInputs means there was nothing to review, so the Scan skips that pass.
 */
export const scanProgressSchema = z.object({
  effort: scanningEffortSchema,
  phase: scanPhaseSchema,
  reviewInputs: z.array(z.string().min(1)),
  reviewed: z.array(reviewAccountSchema),
  applicationDescription: z.string().nullable(),
  actorsAndInterfaces: z.array(z.string()),
  gapCheck: z.string().nullable(),
  unfinishedWork: z.array(z.string()),
});
export type ScanProgress = z.infer<typeof scanProgressSchema>;

const text = z.string().trim().min(1);
export const scanReportSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("orientation"), applicationDescription: text,
    actorsAndInterfaces: z.array(text), unfinishedWork: z.array(text),
  }).strict(),
  // The Review Pass ends by accounting for its input identities. The claim is
  // checked against the judgments the application actually accepted, so a Scan
  // cannot reach discovery by asserting work it never submitted.
  z.object({
    kind: z.literal("review-complete"),
    reviewed: z.array(reviewAccountSchema).min(1), unfinishedWork: z.array(text),
  }).strict(),
  z.object({ kind: z.literal("progress"), unfinishedWork: z.array(text) }).strict(),
  z.object({ kind: z.literal("gap-check"), summary: text, unfinishedWork: z.array(text) }).strict(),
]);
export type ScanReport = z.infer<typeof scanReportSchema>;
