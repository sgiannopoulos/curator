import type { EvidenceFreshness, UserFlow } from "@curator/shared";
import { describeWhen } from "../format";

/**
 * What one reading of a flow's evidence found, and the way to ask for another.
 * A reading is never stored, so the components that show it are handed one
 * rather than each fetching their own.
 */
export interface EvidenceReadingState {
  freshness: EvidenceFreshness | null;
  checking: boolean;
  recheck: () => void;
}

/**
 * What the last reading of this flow's evidence found, and the way to ask for
 * another one. Freshness is never stored and Curator does not watch the
 * filesystem, so reading again is the only way it changes — including when a
 * location becomes readable again.
 */
export function EvidenceReading({ flow, reading }: { flow: UserFlow; reading: EvidenceReadingState }) {
  if (flow.citations.length === 0) {
    return null;
  }

  return (
    <div className="evidence-reading">
      <p className="small muted">{describeReading(reading.freshness, reading.checking)}</p>
      <button className="small" onClick={reading.recheck} disabled={reading.checking}>
        {reading.checking ? "Checking…" : "Check again"}
      </button>
    </div>
  );
}

function describeReading(freshness: EvidenceFreshness | null, checking: boolean): string {
  if (freshness === null) {
    return checking
      ? "Reading these locations in the Repository…"
      : "These locations have not been read yet.";
  }
  if (!freshness.repositoryAvailable) {
    return "The Repository could not be read at its recorded location, so none of these locations could be checked. The evidence and this flow's status are unchanged.";
  }
  const when = describeWhen(freshness.checkedAt);
  const read = when === "" ? "when last read" : `when read ${when}`;
  const changed = freshness.citations.filter((entry) => entry.state !== "unchanged").length;
  return changed === 0
    ? `Every cited file was unchanged ${read}.`
    : `${changed} of ${freshness.citations.length} cited locations were changed or unreadable ${read}. This flow's status is unaffected.`;
}
