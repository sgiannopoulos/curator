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
          <h1>Understand what people can do</h1>
          <p>Open a local Repository to start a Workspace</p>
          <div className="welcome-actions">
            <button className="primary" onClick={onChooseRepository} disabled={blocked}>
              Choose a folder…
            </button>
            <button onClick={() => setShowingCloneDialog(true)}>Clone from Git…</button>
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
            Workspaces you open appear here. Choose a folder to get started.
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
        subtitle="Future feature"
        open={showingCloneDialog}
        onClose={() => setShowingCloneDialog(false)}
      >
        <p>
          Curator will be able to clone a Repository here. For now, clone it yourself and
          choose the folder.
        </p>
        <p className="small muted" style={{ marginTop: 14 }}>
          Nothing has been downloaded, cloned, or changed.
        </p>
      </Dialog>
    </div>
  );
}
