import { describeFreshness, type UserFlow } from "@curator/shared";
import type { EvidenceReadingState } from "./EvidenceReading";

/**
 * Evidence for the agent's judgment, shown beside the behavior it supports.
 * Citations are display-only: nothing here opens a source viewer or an editor,
 * and a citation never establishes that hand-edited wording was reviewed.
 *
 * Freshness beside a citation describes its source file, not the behavior. A
 * Stale or Unavailable location keeps its record and leaves the flow's Active
 * or Outdated status exactly where it was.
 */
export function Citations({ flow, reading }: { flow: UserFlow; reading: EvidenceReadingState }) {
  if (flow.citations.length === 0) {
    return (
      <p className="small muted">
        No Source Citations.
      </p>
    );
  }

  const found = new Map(reading.freshness?.citations.map((entry) => [entry.citationId, entry]));

  return (
    <>
      {flow.citations.map((citation) => {
        const freshness = found.get(citation.id);
        return (
          <div className="citation" key={citation.id}>
            <div className="row between">
              <span className="citation-location">
                {citation.path}:{citation.startLine}
                {citation.endLine === citation.startLine ? "" : `–${citation.endLine}`}
              </span>
              {freshness && (
                <span className={`freshness ${freshness.state}`} title={freshness.detail}>
                  {describeFreshness(freshness.state)}
                </span>
              )}
            </div>
            <p>{citation.explanation}</p>
            {freshness && freshness.state !== "unchanged" && (
              <p className="citation-freshness">{freshness.detail}</p>
            )}
          </div>
        );
      })}
    </>
  );
}
