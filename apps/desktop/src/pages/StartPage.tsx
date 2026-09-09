import { useState } from "react";
import type { Workspace } from "@curator/shared";
import { Dialog } from "../components/Dialog";
import { describeWhen } from "../format";

/**
 * Where every session begins: choose a Repository, or return to a Workspace
 * that was opened before. Recent entries come from the persisted store, so the
 * same Workspace reopens across restarts and rebuilds.
 */
export function StartPage({
  workspaces,
  working,
  runtimeReady,
  onChooseRepository,
  onOpenWorkspace,
}: {
  workspaces: Workspace[];
  working: boolean;
  runtimeReady: boolean;
  onChooseRepository: () => void;
  onOpenWorkspace: (workspaceId: string) => void;
}) {
  const [showingCloneDialog, setShowingCloneDialog] = useState(false);
  const blocked = working || !runtimeReady;

  return (
    <div className="start-body">
      <section className="welcome">
        <div className="welcome-copy">
          <h1>Open a Repository</h1>
          <div className="welcome-actions">
            <button className="primary" onClick={onChooseRepository} disabled={blocked}>
              Choose a folder…
            </button>
            <button onClick={() => setShowingCloneDialog(true)}>
              Clone from Git… <span className="future-tag">Preview</span>
            </button>
          </div>
        </div>
      </section>

      <aside className="recents">
        <div className="section-heading">
          <h2>Recent</h2>
          <div className="rule" />
          <span className="mono muted">{workspaces.length}</span>
        </div>
        {workspaces.length === 0 ? (
          <p className="recent-empty">
            No recent Workspaces.
          </p>
        ) : (
          workspaces.map((workspace) => (
            <button
              key={workspace.id}
              className="recent"
              disabled={blocked}
              onClick={() => onOpenWorkspace(workspace.id)}
            >
              <div className="row between">
                <strong className="ellipsis">{workspace.displayName}</strong>
                <span className="mono muted">{describeWhen(workspace.lastOpenedAt)}</span>
              </div>
              <div className="path mono ellipsis" title={workspace.repositoryLocator}>
                {workspace.repositoryLocator}
              </div>
            </button>
          ))
        )}
      </aside>

      <Dialog
        title="Clone from Git"
        subtitle="Preview"
        open={showingCloneDialog}
        onClose={() => setShowingCloneDialog(false)}
      >
        <p>
          Clone the Repository locally, then choose its folder.
        </p>
      </Dialog>
    </div>
  );
}
