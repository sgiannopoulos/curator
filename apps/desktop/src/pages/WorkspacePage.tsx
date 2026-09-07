import { useState } from "react";
import type { Workspace } from "@curator/shared";
import { Dialog } from "../components/Dialog";
import { describeMoment } from "../format";

/**
 * A Workspace with nothing in it yet. Curating User Flows, the Agent Chat, and
 * Scans arrive in later work; what exists here is the persisted Workspace
 * itself and the options attached to it.
 */
export function WorkspacePage({
  workspace,
  onClose,
}: {
  workspace: Workspace;
  onClose: () => void;
}) {
  const [showingOptions, setShowingOptions] = useState(false);

  return (
    <div className="workspace-body">
      <aside className="sidebar">
        <header className="workspace-heading">
          <button
            className="monogram"
            onClick={onClose}
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

        <section className="catalog">
          <div className="row catalog-meta">
            <span className="label grow">0 User Flows</span>
          </div>
          <div className="catalog-list">
            <p className="preview-note">No User Flows yet.</p>
          </div>
        </section>
      </aside>

      <section className="main">
        <div className="empty">
          <h2>This Workspace is ready</h2>
          <p>
            Curator remembers this Repository. Its User Flows, Agent Chat, and Scan
            history are stored in Curator's own data, outside the Repository, and reopen
            with this Workspace.
          </p>
        </div>
      </section>

      <Dialog
        title="Workspace options"
        subtitle={workspace.displayName}
        open={showingOptions}
        onClose={() => setShowingOptions(false)}
      >
        <dl className="details">
          <dt>Repository</dt>
          <dd className="mono">{workspace.repositoryLocator}</dd>
          <dt>First opened</dt>
          <dd>{describeMoment(workspace.createdAt)}</dd>
          <dt>Last opened</dt>
          <dd>{describeMoment(workspace.lastOpenedAt)}</dd>
        </dl>
        <p className="small muted">
          Choosing this same folder again reopens this Workspace rather than starting
          another one.
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
