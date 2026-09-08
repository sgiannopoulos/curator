import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  CuratorError, scanReportSchema, scanningEffortDescriptions,
  type AgentExecution, type ScanningEffort, type ScanProgress, type ScanReport,
} from "@curator/shared";
import type { ChatApplication } from "./chat-application.js";

export function initialScan(effort: ScanningEffort): ScanProgress {
  return {
    effort, phase: "orientation", initialCatalogCount: 0, reviewSkipped: true,
    applicationDescription: null, actorsAndInterfaces: [], gapCheck: null,
    unfinishedWork: ["Repository orientation, discovery, and the final gap check have not finished."],
  };
}

export function advanceScan(scan: ScanProgress, report: ScanReport): ScanProgress {
  switch (report.kind) {
    case "orientation":
      if (scan.phase !== "orientation") {
        throw new CuratorError("invalid_request", "Orientation is already recorded. Report progress or the gap check instead.");
      }
      return { ...scan, phase: "discovery", applicationDescription: report.applicationDescription,
        actorsAndInterfaces: report.actorsAndInterfaces, unfinishedWork: report.unfinishedWork };
    case "progress":
      return { ...scan, unfinishedWork: report.unfinishedWork, gapCheck: null };
    case "gap-check":
      if (scan.phase !== "discovery") {
        throw new CuratorError("invalid_request", "Record Repository orientation before the discovery gap check.");
      }
      return { ...scan, gapCheck: report.summary, unfinishedWork: report.unfinishedWork };
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
    description: "Pass a report object to checkpoint this Scan's orientation, remaining work, or final gap check. After broad path inventory and reading relevant implementation artifacts, record orientation with a short application description and identified actors/interfaces to enter discovery. Keep unfinishedWork current. Before finishing, revisit those actors/interfaces and report the gap check, including remaining gaps or unreadable areas. This report does not prove coverage.",
    schema: z.object({ report: scanReportSchema }).strict(),
  });
}

export function scanInstructions(execution: AgentExecution): string {
  const scan = execution.scan;
  if (!scan) throw new Error("A Scan is missing its progress record.");
  return [
    `This is an explicitly requested Scan at ${scan.effort} Scanning Effort: ${scanningEffortDescriptions[scan.effort]}`,
    "Use the same inspection and result tools at every effort. Effort changes requested detail only; it is not a resource budget or a completeness promise.",
    "First orient: build a broad tool-driven path inventory and inspect relevant manifests, entry points, routes, interfaces, and implementation artifacts. Record a short application description and identified human actors/interfaces with report_scan_progress and report.kind orientation. No existing flows were present at Scan start, so skip the Review Pass and enter Discovery Pass. An empty actorsAndInterfaces list is appropriate only when no human interface could be established; explain that in the description.",
    "Discover source-grounded User Flows across the identified human interfaces. Compare each candidate semantically against the CURRENT catalog and discoveries already accepted in this Scan. Consolidate overlapping behavior at the selected effort and avoid duplicate flows. Omit unsupported speculation and confidence scores. Submit each cited discovery immediately as create-flow; do not wait for all discovery to finish. This Scan authorizes creation only, never editing or deleting flows. Never claim a catalog change until submit_result returns accepted.",
    "Keep unfinishedWork checkpointed using report_scan_progress and report.kind progress as inspection proceeds, including unexplored actors/interfaces, unresolved candidates, and unreadable areas. Report considered/read/excluded paths through inspection tools and explicit reports, with reasons and available grouped counts for exclusions. Unread does not mean excluded.",
    "Before normal completion, revisit all identified actors/interfaces for missing materially distinct actions or outcomes at this effort. Inspect any gaps and submit supported discoveries, then call report_scan_progress with report.kind gap-check with a short account and remaining unfinishedWork (an empty list means none recorded, not complete coverage). Any later accepted discovery requires another gap check. Finish with the accepted changes and remaining limitations. A terminal attempt never resumes and committed flows are never rolled back.",
    `Agent Execution ${execution.id} in Workspace ${execution.workspaceId} retains this identity through tool turns and compaction. The following Scan state is authoritative and stays outside summaries:`,
    JSON.stringify(scan),
  ].join("\n\n");
}
