import type { UserFlow } from "@curator/shared";
import { Citations } from "./Citations";
import { EvidenceReading, type EvidenceReadingState } from "./EvidenceReading";
import type { FlowTab } from "./FlowDetail";
import { StatusBadge } from "./StatusBadge";

/**
 * The evidence column. On the future testing views it says what will appear
 * there rather than showing sample numbers, so nothing here can be mistaken
 * for a test that ran.
 */
export function Inspector({
  flow,
  tab,
  reading,
}: {
  flow: UserFlow;
  tab: FlowTab;
  reading: EvidenceReadingState;
}) {
  if (tab === "steps" || tab === "screenshots") {
    return (
      <aside className="inspector">
        <section className="inspector-section">
          <div className="row between">
            <h3 className="label">Run history</h3>
            <span className="future-tag">Preview</span>
          </div>
          <p className="small muted">Not available yet.</p>
        </section>
        <section className="inspector-section">
          <h3 className="label">User Flow</h3>
          <StatusBadge status={flow.status} />
        </section>
      </aside>
    );
  }

  return (
    <aside className="inspector" aria-label="Source evidence">
      <section className="inspector-section">
        <h3 className="label">Source Citations</h3>
        <Citations flow={flow} reading={reading} />
        <EvidenceReading flow={flow} reading={reading} />
      </section>
      <section className="inspector-section">
        <h3 className="label">User Flow</h3>
        <StatusBadge status={flow.status} />
      </section>
    </aside>
  );
}
