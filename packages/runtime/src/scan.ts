import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  CuratorError, describeScanPhase, scanReportSchema,
  type AgentExecution, type ResultEvent, type ReviewAccount,
  type ScanningEffort, type ScanProgress, type ScanReport,
} from "@curator/shared";
import { renderPrompt } from "./prompts.js";
import type { ChatApplication } from "./chat-application.js";

export function initialScan(effort: ScanningEffort, reviewInputs: string[]): ScanProgress {
  return {
    effort, phase: "orientation", reviewInputs, reviewed: [],
    applicationDescription: null, actorsAndInterfaces: [], gapCheck: null,
    unfinishedWork: [reviewInputs.length === 0
      ? "Repository orientation, discovery, and the final gap check have not finished."
      : `Repository orientation, the Review Pass over ${reviewInputs.length} existing User Flows, discovery, and the final gap check have not finished.`],
  };
}

export function advanceScan(scan: ScanProgress, report: ScanReport): ScanProgress {
  switch (report.kind) {
    case "orientation":
      if (scan.phase !== "orientation") {
        throw new CuratorError("invalid_request", "Orientation is already recorded. Report progress or the gap check instead.");
      }
      // Nothing to review is not a review that was skipped over: the pass has
      // no input identities, so orientation leads straight into discovery.
      return { ...scan, phase: scan.reviewInputs.length === 0 ? "discovery" : "review",
        applicationDescription: report.applicationDescription,
        actorsAndInterfaces: report.actorsAndInterfaces, unfinishedWork: report.unfinishedWork };
    case "review-complete": {
      if (scan.phase !== "review") {
        throw new CuratorError("invalid_request", scan.phase === "orientation"
          ? "Record Repository orientation before completing the Review Pass."
          : "The Review Pass is already complete and this Scan is in its Discovery Pass.");
      }
      const disagreements = accountingGaps(scan, report.reviewed);
      if (disagreements.length > 0) {
        throw new CuratorError("invalid_request", [
          `This Review Pass has not accounted for every User Flow the catalog held when the Scan started. ${scan.reviewed.length} of ${scan.reviewInputs.length} identities have an accepted judgment. Discovery cannot start until each one does.`,
          ...disagreements,
        ].join("\n"));
      }
      return { ...scan, phase: "discovery", unfinishedWork: report.unfinishedWork };
    }
    case "progress":
      return { ...scan, unfinishedWork: report.unfinishedWork, gapCheck: null };
    case "gap-check":
      if (scan.phase !== "discovery") {
        throw new CuratorError("invalid_request", scan.phase === "orientation"
          ? "Record Repository orientation before the discovery gap check."
          : "Complete the Review Pass before the discovery gap check.");
      }
      return { ...scan, gapCheck: report.summary, unfinishedWork: report.unfinishedWork };
  }
}

/**
 * Where the claimed accounting and the accepted judgments disagree. The
 * application's own record decides; the manifest is a claim to check against
 * it, so an identity nobody reviewed cannot be waved through by listing it.
 */
function accountingGaps(scan: ScanProgress, claimed: ReviewAccount[]): string[] {
  const accepted = new Map(scan.reviewed.map((entry) => [entry.flowId, entry.judgment]));
  const manifest = new Map(claimed.map((entry) => [entry.flowId, entry.judgment]));
  const gaps: string[] = [];
  for (const flowId of scan.reviewInputs) {
    const judgment = accepted.get(flowId);
    const claim = manifest.get(flowId);
    if (judgment === undefined) {
      gaps.push(`${flowId}: no accepted review. Submit a review-flow result for it.`);
    } else if (claim === undefined) {
      gaps.push(`${flowId}: accepted as ${judgment} but missing from this manifest.`);
    } else if (claim !== judgment) {
      gaps.push(`${flowId}: accepted as ${judgment}, manifest claims ${claim}.`);
    }
  }
  for (const flowId of manifest.keys()) {
    if (!scan.reviewInputs.includes(flowId)) {
      gaps.push(`${flowId}: not one of this Scan's input identities.`);
    }
  }
  return gaps;
}

/**
 * What one accepted result means for this Scan's own accounting. A result that
 * changed the catalog leaves any recorded gap check describing a catalog that
 * no longer exists, so that check must be taken again.
 *
 * The Review Pass accounts for each input identity once. Later evidence may
 * correct that judgment during discovery; the correction is accepted and
 * retained as its own result, and this keeps recording what the pass concluded.
 */
export function accountForResult(scan: ScanProgress, event: ResultEvent): ScanProgress {
  const reviewed = event.kind === "review-flow" && scan.phase === "review" &&
    !scan.reviewed.some((entry) => entry.flowId === event.flowId)
    ? { ...scan, reviewed: [...scan.reviewed, { flowId: event.flowId, judgment: event.judgment }] }
    : scan;
  return event.kind === "review-flow" && event.judgment === "indeterminate"
    ? reviewed : { ...reviewed, gapCheck: null };
}

/** What one progress report means for the reader of this conversation. */
export function describeReport(report: ScanReport, scan: ScanProgress): string {
  switch (report.kind) {
    case "orientation":
      return `${describeScanPhase(scan.phase)} · ${scan.reviewInputs.length === 0
        ? "Review Pass skipped for an empty catalog"
        : `${scan.reviewInputs.length} existing User Flows to account for before discovery`}. ${scan.applicationDescription}`;
    case "review-complete":
      return `${describeScanPhase(scan.phase)} · Review Pass accounted for ${scan.reviewed.length} existing User Flows.`;
    case "gap-check":
      return `Gap check recorded: ${report.summary}`;
    case "progress":
      return `Recorded unfinished work: ${report.unfinishedWork.join("; ") || "None recorded"}`;
  }
}

/**
 * What a Scan may submit right now. This is the discovery barrier: it reads the
 * persisted phase and accounting rather than trusting that the agent followed
 * its instructions, and it is checked again inside the acceptance transaction.
 */
export function requireScanResult(scan: ScanProgress | null, event: ResultEvent): void {
  if (!scan) throw new CuratorError("invalid_result", "This Scan is missing its progress record.");
  if (event.kind === "edit-wording" || event.kind === "edit-behavior" || event.kind === "delete-flow") {
    throw new CuratorError("invalid_result", "A Scan never rewrites or deletes an existing User Flow. Submit a review-flow judgment, and create a new flow for materially changed behavior.");
  }
  if (scan.phase === "orientation") {
    throw new CuratorError("invalid_result", "Record Repository orientation with report_scan_progress before submitting results.");
  }
  if (scan.phase === "discovery") return;
  if (event.kind !== "review-flow") {
    throw new CuratorError("invalid_result", `The Review Pass is still open: ${scan.reviewed.length} of ${scan.reviewInputs.length} existing User Flows have an accepted judgment. Review the rest, then report review-complete; discovery starts only after that.`);
  }
  if (!scan.reviewInputs.includes(event.flowId)) {
    throw new CuratorError("invalid_result", `flowId ${event.flowId} is not one of this Scan's input identities. The Review Pass covers only the User Flows the catalog held when the Scan started.`);
  }
  if (scan.reviewed.some((entry) => entry.flowId === event.flowId)) {
    throw new CuratorError("invalid_result", `flowId ${event.flowId} already has its Review Pass judgment. If later evidence overturns it, submit the correction during the Discovery Pass.`);
  }
}

export function scanProgressTool(execution: AgentExecution, chat: ChatApplication,
  signal: AbortSignal, changed: () => void) {
  return tool(({ report }) => {
    signal.throwIfAborted();
    const scan = chat.reportScan(execution, report);
    changed();
    return JSON.stringify(scan);
  }, {
    name: "report_scan_progress",
    description: renderPrompt("tools/report-scan-progress"),
    schema: z.object({ report: scanReportSchema }).strict(),
  });
}

export function scanInstructions(execution: AgentExecution): string {
  const scan = execution.scan;
  if (!scan) throw new Error("A Scan is missing its progress record.");
  return renderPrompt("scan", {
    effort: scan.effort, effortInstructions: renderPrompt(`effort/${scan.effort}`),
    executionId: execution.id, workspaceId: execution.workspaceId,
    reviewInstructions: scan.reviewInputs.length === 0 ? renderPrompt("scan-review-skipped")
      : renderPrompt("scan-review", {
        reviewCount: scan.reviewInputs.length,
        reviewExample: JSON.stringify({
          executionId: execution.id, workspaceId: execution.workspaceId,
          eventId: "a-unique-id-for-this-result", kind: "review-flow",
          flowId: scan.reviewInputs[0] ?? "an-identity-from-reviewInputs", judgment: "supported",
          citations: [{ path: "src/example.ts", startLine: 1, endLine: 3,
            explanation: "How these lines show this behavior is still reachable" }],
        }),
        indeterminateExample: JSON.stringify({
          executionId: execution.id, workspaceId: execution.workspaceId,
          eventId: "a-unique-id-for-this-result", kind: "review-flow",
          flowId: scan.reviewInputs[0] ?? "an-identity-from-reviewInputs",
          judgment: "indeterminate", explanation: "What inspection could not settle",
        }),
      }),
    scanState: JSON.stringify(scan),
  });
}
