import { useState } from "react";
import { scanningEfforts, type ScanningEffort } from "@curator/shared";
import type { CuratorSession } from "../useCuratorSession";

export function ScanControls({ session }: { session: CuratorSession }) {
  const [effort, setEffort] = useState<ScanningEffort>("standard");
  const disabled = !session.ready || session.working || session.chat === null ||
    session.chat.blockedReason !== null;
  const existing = session.flows.length;
  const guidance = existing === 0 ? null
    : `A Scan reviews ${existing === 1 ? "the existing User Flow" : `all ${existing} existing User Flows`} against the source before discovering more. It never rewrites titles or descriptions you curated.`;
  return (
    <section className="scan-controls" aria-label="Scan Repository">
      <div className="scan-actions">
        <label htmlFor="scanning-effort">Scanning Effort</label>
        <select id="scanning-effort" value={effort} disabled={disabled}
          aria-describedby={guidance ? "scan-guidance" : undefined}
          onChange={(event) => {
            const selected = scanningEfforts.find((value) => value === event.target.value);
            if (selected) setEffort(selected);
          }}>
          {scanningEfforts.map((value) => <option key={value} value={value}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </option>)}
        </select>
        <button className="primary" disabled={disabled}
          aria-describedby={guidance ? "scan-guidance" : undefined}
          onClick={() => session.startScan(effort)}>Scan</button>
      </div>
      {guidance && <p className="small muted" id="scan-guidance">{guidance}</p>}
    </section>
  );
}
