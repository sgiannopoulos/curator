import { describeStatus, type MutationOrigin, type UserFlow } from "@curator/shared";
import { Citations } from "./Citations";
import { Inspector } from "./Inspector";
import { Menu } from "./Menu";
import { StatusBadge } from "./StatusBadge";

export type FlowTab = "description" | "steps" | "screenshots" | "sources";

const TABS: { key: FlowTab; label: string }[] = [
  { key: "description", label: "Description" },
  { key: "steps", label: "Steps" },
  { key: "screenshots", label: "Screenshots" },
  { key: "sources", label: "Sources" },
];

/**
 * One User Flow, read description first. Steps and Screenshots belong to test
 * execution, which Curator does not do: they stay here as clearly marked
 * previews rather than showing sample runs as though they happened.
 */
export function FlowDetail({
  flow,
  tab,
  working,
  onSelectTab,
  onEdit,
  onReactivate,
  onRemove,
  onFuturePreview,
}: {
  flow: UserFlow;
  tab: FlowTab;
  working: boolean;
  onSelectTab: (tab: FlowTab) => void;
  onEdit: () => void;
  onReactivate: () => void;
  onRemove: () => void;
  onFuturePreview: (subject: string) => void;
}) {
  return (
    <>
      <header className="detail-header">
        <i className={`dot ${flow.status}`} />
        <div className="grow">
          <h2 className="ellipsis">{flow.title}</h2>
          <div className="meta mono">
            {flow.id.slice(0, 8)} · {describeStatus(flow.status)} · edited by{" "}
            {describeOrigin(flow.updatedBy)}
          </div>
        </div>
        <div className="actions">
          <button className="primary" onClick={onEdit} disabled={working}>
            Edit flow
          </button>
          <button onClick={() => onFuturePreview("Test execution")}>
            Run <span className="future-tag">Preview</span>
          </button>
        </div>
      </header>

      <div className="content-columns">
        <section className="reading-pane">
          <nav className="tabs" aria-label="User Flow views">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                className={`tab ${tab === key ? "selected" : ""}`}
                aria-current={tab === key ? "page" : "false"}
                onClick={() => onSelectTab(key)}
              >
                {label}
                {key === "sources" && <span className="muted"> {flow.citations.length}</span>}
              </button>
            ))}
          </nav>

          {tab === "description" && (
            <article className="document">
              <div className="row between" style={{ marginBottom: 22 }}>
                <StatusBadge status={flow.status} />
                <Menu
                  label="···"
                  items={[
                    { label: "Edit flow", onSelect: onEdit },
                    ...(flow.status === "outdated"
                      ? [{ label: "Mark Active", onSelect: onReactivate }]
                      : []),
                    { label: "Remove permanently", onSelect: onRemove, destructive: true },
                  ]}
                />
              </div>
              <p className="description">{flow.description}</p>
              {flow.status === "outdated" && (
                <div className="outdated-note">
                  <p>
                    Evidence indicated this behavior is no longer current. Rewording it
                    leaves it Outdated; marking it Active is your own judgment.
                  </p>
                  <button onClick={onReactivate} disabled={working}>
                    Mark Active
                  </button>
                </div>
              )}
              <p className="evidence-note">
                Edits you make keep this flow's Source Citations. Those citations do not
                certify that the edited text has been reviewed.
              </p>
            </article>
          )}

          {tab === "sources" && (
            <article className="document">
              <h3>Source Citations</h3>
              <p className="small muted" style={{ marginBottom: 22 }}>
                Evidence supporting the agent's judgment. Source that has changed or
                cannot be read does not change this flow's status.
              </p>
              <Citations flow={flow} />
            </article>
          )}

          {tab === "steps" && (
            <FuturePreview
              subject="Test steps"
              body="Executable steps will appear here when test execution is added. They are separate from the free-text description, which is what Curator curates today."
            />
          )}

          {tab === "screenshots" && (
            <FuturePreview
              subject="Screenshots from a test run"
              body="Screenshots will appear here when test execution is added. Curator does not run the product or capture screenshots."
            />
          )}
        </section>
        <Inspector flow={flow} tab={tab} />
      </div>
    </>
  );
}

function FuturePreview({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="empty">
      <span className="label">Future testing feature</span>
      <h2>{subject}</h2>
      <p>{body}</p>
    </div>
  );
}

function describeOrigin(origin: MutationOrigin): string {
  if (origin === "manual") {
    return "you";
  }
  return origin === "scan" ? "a Scan" : "the agent";
}
