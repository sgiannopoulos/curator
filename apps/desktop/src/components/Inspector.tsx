import type { UserFlow } from "@curator/shared";
import { Citations } from "./Citations";
import type { FlowTab } from "./FlowDetail";
import { StatusBadge } from "./StatusBadge";

/**
 * The evidence column. On the future testing views it says what will appear
 * there rather than showing sample numbers, so nothing here can be mistaken
 * for a test that ran.
 */
export function Inspector({ flow, tab }: { flow: UserFlow; tab: FlowTab }) {
  if (tab === "steps" || tab === "screenshots") {
    return (
      <aside className="inspector">
        <section className="inspector-section">
          <div className="row between">
            <h3 className="label">Run history</h3>
            <span className="future-tag">Preview</span>
          </div>
          <p className="small muted">
            Test runs, timings, and inferred assertions will appear here when test
            execution is added. Curator has not run anything.
          </p>
        </section>
        <section className="inspector-section">
          <h3 className="label">User Flow</h3>
          <StatusBadge status={flow.status} />
          <p className="small muted">
            This status comes from source evidence and your own judgment, separately
            from anything the testing previews will show.
          </p>
        </section>
      </aside>
    );
  }

  return (
    <aside className="inspector" aria-label="Source evidence">
      <section className="inspector-section">
        <h3 className="label">Source Citations</h3>
        <Citations flow={flow} />
        <p className="small muted">
          Citations support the agent's judgment. Editing the wording yourself does
          not establish a new source review.
        </p>
      </section>
      <section className="inspector-section">
        <h3 className="label">User Flow</h3>
        <StatusBadge status={flow.status} />
        <p className="small muted">
          Evidence that has changed, and future test results, do not change this
          status on their own.
        </p>
      </section>
    </aside>
  );
}
