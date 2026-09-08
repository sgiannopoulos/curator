import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  CuratorError, scanReportSchema,
  type AgentExecution, type ScanningEffort, type ScanProgress, type ScanReport,
} from "@curator/shared";
import { renderPrompt } from "./prompts.js";
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
    scanState: JSON.stringify(scan),
  });
}
