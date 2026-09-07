import type { UserFlow } from "@curator/shared";

/**
 * Evidence for the agent's judgment, shown beside the behavior it supports.
 * Citations are display-only: nothing here opens a source viewer or an editor,
 * and a citation never establishes that hand-edited wording was reviewed.
 */
export function Citations({ flow }: { flow: UserFlow }) {
  if (flow.citations.length === 0) {
    return (
      <p className="small muted">
        {flow.createdBy === "manual"
          ? "This flow was added by hand and has no Source Citations."
          : "This flow has no Source Citations."}
      </p>
    );
  }

  return (
    <>
      {flow.citations.map((citation) => (
        <div className="citation" key={citation.id}>
          <span className="citation-location">
            {citation.path}:{citation.startLine}
            {citation.endLine === citation.startLine ? "" : `–${citation.endLine}`}
          </span>
          <p>{citation.explanation}</p>
        </div>
      ))}
    </>
  );
}
