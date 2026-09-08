import { z } from "zod";

export const scanningEfforts = ["quick", "standard", "maximum"] as const;
export const scanningEffortSchema = z.enum(scanningEfforts);
export type ScanningEffort = z.infer<typeof scanningEffortSchema>;

export const scanningEffortDescriptions: Record<ScanningEffort, string> = {
  quick: "Principal goals and happy paths, combining minor variants.",
  standard: "Main paths, alternatives, validation failures, permission differences, and state changes.",
  maximum: "Detailed paths, uncommon cases, edges, recovery, and materially distinct outcomes.",
};

/**
 * The Scan-specific part of its durable Agent Execution. Lifecycle, model,
 * usage, chat, activity, and accepted results are associated by execution id;
 * they retain their existing authorities rather than being copied here.
 */
export const scanProgressSchema = z.object({
  effort: scanningEffortSchema,
  phase: z.enum(["orientation", "discovery"]),
  initialCatalogCount: z.literal(0),
  reviewSkipped: z.literal(true),
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
  z.object({ kind: z.literal("progress"), unfinishedWork: z.array(text) }).strict(),
  z.object({ kind: z.literal("gap-check"), summary: text, unfinishedWork: z.array(text) }).strict(),
]);
export type ScanReport = z.infer<typeof scanReportSchema>;
