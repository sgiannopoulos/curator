import type { UserFlow, UserFlowStatus } from "@curator/shared";

const GROUPS: { status: UserFlowStatus; label: string }[] = [
  { status: "active", label: "Active" },
  { status: "outdated", label: "Outdated" },
];

/**
 * The catalog, grouped by the only distinction that matters here: behavior
 * currently treated as possible, and behavior retained after evidence said
 * otherwise. Nothing about test results or citation freshness groups this list.
 */
export function FlowList({
  flows,
  selectedFlowId,
  disabled,
  onSelect,
  onAdd,
}: {
  flows: UserFlow[];
  selectedFlowId: string | null;
  disabled: boolean;
  onSelect: (flowId: string) => void;
  onAdd: () => void;
}) {
  return (
    <section className="catalog">
      <div className="row catalog-meta">
        <span className="label grow">
          {flows.length === 1 ? "1 User Flow" : `${flows.length} User Flows`}
        </span>
      </div>
      <div className="catalog-list">
        {flows.length === 0 && (
          <p className="preview-note">No User Flows yet. Add one to get started.</p>
        )}
        {GROUPS.map(({ status, label }) => {
          const group = flows.filter((flow) => flow.status === status);
          if (group.length === 0) {
            return null;
          }
          return (
            <div key={status}>
              <div className={`group-heading ${status}`}>
                <h2>{label}</h2>
                <div className="rule" />
                <span className="mono muted">{group.length}</span>
              </div>
              {group.map((flow) => (
                <button
                  key={flow.id}
                  className={`flow-row ${flow.id === selectedFlowId ? "selected" : ""}`}
                  onClick={() => onSelect(flow.id)}
                >
                  <span className={`flow-marker ${status}`} />
                  <span className="grow ellipsis">{flow.title}</span>
                  <span className="mono muted">{describeSources(flow)}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <button className="add-flow" onClick={onAdd} disabled={disabled}>
        + Add User Flow
      </button>
    </section>
  );
}

function describeSources(flow: UserFlow): string {
  return flow.citations.length === 1 ? "1 source" : `${flow.citations.length} sources`;
}
