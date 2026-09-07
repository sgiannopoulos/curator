import { useEffect, useState } from "react";
import type { UserFlow, UserFlowDraft, Workspace } from "@curator/shared";
import { Dialog } from "../components/Dialog";
import { FlowDetail, type FlowTab } from "../components/FlowDetail";
import { FlowEditorDialog } from "../components/FlowEditorDialog";
import { FlowList } from "../components/FlowList";
import { RemoveFlowDialog } from "../components/RemoveFlowDialog";
import { describeMoment } from "../format";
import type { CuratorSession } from "../useCuratorSession";

/**
 * A Workspace and its catalog. Everything here works from stored data alone:
 * reading and curating User Flows never needs the Repository to be readable.
 */
export function WorkspacePage({
  workspace,
  session,
}: {
  workspace: Workspace;
  session: CuratorSession;
}) {
  const { selectedFlow, working } = session;
  const [tab, setTab] = useState<FlowTab>("description");
  const [showingOptions, setShowingOptions] = useState(false);
  const [editing, setEditing] = useState<"none" | "add" | "existing">("none");
  const [removing, setRemoving] = useState<UserFlow | null>(null);
  const [futurePreview, setFuturePreview] = useState<string | null>(null);

  // Selecting a flow opens its Description, so behavior is what you read first.
  useEffect(() => {
    setTab("description");
  }, [selectedFlow?.id]);

  // The editor stays open when a save fails, so the typed wording is still
  // there to correct rather than lost behind the failure notice.
  const save = (draft: UserFlowDraft) => {
    if (editing === "existing" && selectedFlow === null) {
      return;
    }
    const pending =
      editing === "add" || selectedFlow === null
        ? session.addFlow(draft)
        : session.saveFlow(selectedFlow.id, draft);
    void pending.then((committed) => {
      if (committed) {
        setEditing("none");
      }
    });
  };

  return (
    <div className="workspace-body">
      <aside className="sidebar">
        <header className="workspace-heading">
          <button
            className="monogram"
            onClick={session.closeWorkspace}
            aria-label="Back to Workspaces"
            title="Back to Workspaces"
          >
            C
          </button>
          <div className="grow">
            <h1 className="ellipsis">{workspace.displayName}</h1>
            <div className="path mono ellipsis" title={workspace.repositoryLocator}>
              {workspace.repositoryLocator}
            </div>
          </div>
          <button
            className="plain icon-button"
            onClick={() => setShowingOptions(true)}
            aria-label="Workspace options"
            title="Workspace options"
          >
            <CogIcon />
          </button>
        </header>

        <FlowList
          flows={session.flows}
          selectedFlowId={selectedFlow?.id ?? null}
          disabled={working}
          onSelect={session.selectFlow}
          onAdd={() => setEditing("add")}
        />
      </aside>

      <section className="main">
        {selectedFlow === null ? (
          <div className="empty">
            <h2>{session.flows.length === 0 ? "Start with a User Flow" : "Choose a User Flow"}</h2>
            <p>
              {session.flows.length === 0
                ? "Describe behavior you already know, in your own words. A title and a description are all it takes."
                : "Pick one from the list to read its description and the evidence behind it."}
            </p>
            {session.flows.length === 0 && (
              <button
                className="primary"
                onClick={() => setEditing("add")}
                disabled={working}
                style={{ marginTop: 20 }}
              >
                Add User Flow
              </button>
            )}
          </div>
        ) : (
          <FlowDetail
            flow={selectedFlow}
            tab={tab}
            working={working}
            onSelectTab={setTab}
            onEdit={() => setEditing("existing")}
            onReactivate={() => void session.reactivateFlow(selectedFlow.id)}
            onRemove={() => setRemoving(selectedFlow)}
            onFuturePreview={setFuturePreview}
          />
        )}
      </section>

      <FlowEditorDialog
        open={editing !== "none"}
        flow={editing === "existing" ? selectedFlow : null}
        working={working}
        onSave={save}
        onClose={() => setEditing("none")}
      />

      <RemoveFlowDialog
        flow={removing}
        working={working}
        onConfirm={() => {
          const flow = removing;
          setRemoving(null);
          if (flow) {
            void session.removeFlow(flow.id);
          }
        }}
        onClose={() => setRemoving(null)}
      />

      <Dialog
        title={futurePreview ?? ""}
        subtitle="Future testing feature"
        open={futurePreview !== null}
        onClose={() => setFuturePreview(null)}
      >
        <p>
          Curator analyzes source to describe behavior; it does not run the product.
          Test execution is a later feature, and this control is a placeholder for it.
        </p>
        <p className="small muted" style={{ marginTop: 14 }}>
          Nothing has been run, and nothing has changed.
        </p>
      </Dialog>

      <Dialog
        title="Workspace options"
        subtitle={workspace.displayName}
        open={showingOptions}
        onClose={() => setShowingOptions(false)}
      >
        <dl className="details">
          <dt>Repository</dt>
          <dd className="mono">{workspace.repositoryLocator}</dd>
          <dt>User Flows</dt>
          <dd>{session.flows.length}</dd>
          <dt>First opened</dt>
          <dd>{describeMoment(workspace.createdAt)}</dd>
          <dt>Last opened</dt>
          <dd>{describeMoment(workspace.lastOpenedAt)}</dd>
        </dl>
        <p className="small muted">
          Choosing this same folder again reopens this Workspace rather than starting
          another one. Its catalog is stored in Curator's own data, outside the
          Repository.
        </p>
        <p style={{ marginTop: 18 }}>
          <button
            disabled={working}
            onClick={() => {
              setShowingOptions(false);
              setEditing("add");
            }}
          >
            Add User Flow manually
          </button>
        </p>
      </Dialog>
    </div>
  );
}

function CogIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18.76 10.19 L20.86 10.44 L20.86 13.56 L18.76 13.81 L18.06 15.50 L19.37 17.16 L17.16 19.37 L15.50 18.06 L13.81 18.76 L13.56 20.86 L10.44 20.86 L10.19 18.76 L8.50 18.06 L6.84 19.37 L4.63 17.16 L5.94 15.50 L5.24 13.81 L3.14 13.56 L3.14 10.44 L5.24 10.19 L5.94 8.50 L4.63 6.84 L6.84 4.63 L8.50 5.94 L10.19 5.24 L10.44 3.14 L13.56 3.14 L13.81 5.24 L15.50 5.94 L17.16 4.63 L19.37 6.84 L18.06 8.50 Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
