import { useState } from "react";
import { scanningEfforts, type ScanningEffort } from "@curator/shared";
import type { CuratorSession } from "../useCuratorSession";

export function ScanControls({ session }: { session: CuratorSession }) {
  const [effort, setEffort] = useState<ScanningEffort>("standard");
  const disabled = session.agentBlocked;
  return (
    <section className="scan-controls" aria-label="Scan Repository">
      <div className="scan-actions">
        <label htmlFor="scanning-effort">Scanning Effort</label>
        <select id="scanning-effort" value={effort} disabled={disabled}
          onChange={(event) => {
            const selected = scanningEfforts.find((value) => value === event.target.value);
            if (selected) setEffort(selected);
          }}>
          {scanningEfforts.map((value) => <option key={value} value={value}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </option>)}
        </select>
        <button className="primary" disabled={disabled}
          onClick={() => session.startScan(effort)}>Scan</button>
      </div>
    </section>
  );
}
