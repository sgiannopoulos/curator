import { useState } from "react";
import { scanningEfforts, scanningEffortDescriptions, type ScanningEffort } from "@curator/shared";
import type { CuratorSession } from "../useCuratorSession";

export function ScanControls({ session }: { session: CuratorSession }) {
  const [effort, setEffort] = useState<ScanningEffort>("standard");
  const populated = session.flows.length > 0;
  const disabled = !session.ready || session.working || session.chat === null ||
    session.chat.blockedReason !== null || populated;
  return (
    <section className="scan-controls" aria-label="Scan Repository">
      <div className="scan-actions">
        <label htmlFor="scanning-effort">Scanning Effort</label>
        <select id="scanning-effort" value={effort} disabled={disabled}
          aria-describedby="scan-guidance"
          onChange={(event) => {
            const selected = scanningEfforts.find((value) => value === event.target.value);
            if (selected) setEffort(selected);
          }}>
          {scanningEfforts.map((value) => <option key={value} value={value}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </option>)}
        </select>
        <button className="primary" disabled={disabled} aria-describedby="scan-guidance"
          onClick={() => session.startScan(effort)}>Scan</button>
      </div>
      <p className="small muted" id="scan-guidance">
        {populated ? "Scanning existing flows requires the Review Pass, coming next. Use Agent Chat to curate them."
          : `${scanningEffortDescriptions[effort]} Requested detail, with no promise of complete coverage.`}
      </p>
    </section>
  );
}
