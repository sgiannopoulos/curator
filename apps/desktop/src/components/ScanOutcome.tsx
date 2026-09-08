import { describeScanPhase, type AgentExecution, type ReviewJudgment } from "@curator/shared";
import { describeMoment } from "../format";

export function ScanOutcome({ execution, acceptedCount }: { execution: AgentExecution; acceptedCount: number }) {
  const scan = execution.scan;
  if (!scan) return null;
  const inputs = scan.reviewInputs.length;
  const judged = (judgment: ReviewJudgment) =>
    scan.reviewed.filter((entry) => entry.judgment === judgment).length;
  const phase = describeScanPhase(scan.phase);
  return (
    <div className="scan-outcome">
      <p className="label">Scan · {scan.effort} · {execution.status}</p>
      <p>{phase}{" · "}{acceptedCount} accepted {acceptedCount === 1 ? "discovery" : "discoveries"}</p>
      {inputs === 0
        ? <p className="small muted">Review Pass skipped: the catalog was empty at Scan start.</p>
        : <p className="small muted">
            Reviewed {scan.reviewed.length} of {inputs} User Flows the catalog held at Scan start
            {" · "}{judged("supported")} Supported · {judged("contradicted")} Contradicted
            {" · "}{judged("indeterminate")} Indeterminate.
            {scan.phase === "review" && " Discovery starts once every one is accounted for."}
          </p>}
      {scan.applicationDescription && <p>{scan.applicationDescription}</p>}
      <details>
        <summary>Scan progress and remaining work</summary>
        <p className="small muted">Started {describeMoment(execution.startedAt)}
          {execution.endedAt ? ` · Ended ${describeMoment(execution.endedAt)}` : ""}</p>
        {scan.actorsAndInterfaces.length > 0 && <>
          <p>Identified actors and interfaces</p>
          <ul>{scan.actorsAndInterfaces.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </>}
        <p>Gap check: {scan.gapCheck ?? "Not yet recorded after the latest discovery."}</p>
        <p>Last recorded unfinished work</p>
        {scan.unfinishedWork.length > 0
          ? <ul>{scan.unfinishedWork.map((item, index) => <li key={index}>{item}</li>)}</ul>
          : <p>None recorded. This does not establish complete Repository coverage.</p>}
        {execution.status !== "running" && <p>{execution.reason}</p>}
        {execution.status !== "running" && execution.status !== "completed" &&
          <p>The attempt ended in {phase}. Committed {scan.phase === "review" ? "review judgments" : "discoveries"} remain; unreported work may remain too.</p>}
      </details>
    </div>
  );
}
