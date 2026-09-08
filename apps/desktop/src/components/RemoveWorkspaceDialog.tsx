import { useState } from "react";
import type { Workspace } from "@curator/shared";
import type { CuratorSession } from "../useCuratorSession";
import { Dialog } from "./Dialog";
import { Notice } from "./Notice";

export function RemoveWorkspaceDialog({ workspace, session, onClose }: {
  workspace: Workspace;
  session: CuratorSession;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const disabled = submitting || session.working || !session.ready || session.chat === null;
  const close = () => { if (!submitting) onClose(); };

  return (
    <Dialog open title="Delete this Workspace permanently?" subtitle={workspace.displayName}
      onClose={close} footer={<>
        <button disabled={submitting} onClick={close}>Cancel</button>
        <button className="destructive" disabled={disabled} onClick={() => {
          setSubmitting(true);
          setFailed(false);
          void session.removeWorkspace().then((committed) => {
            setSubmitting(false);
            if (committed) onClose();
            else setFailed(true);
          });
        }}>{submitting ? "Deleting…" : "Delete Workspace permanently"}</button>
      </>}>
      <p>This permanently deletes this Workspace's current User Flows and Source Citations,
        entire Agent Chat, Scan history, associated Agent Executions and results,
        and application-owned working files.</p>
      <p style={{ marginTop: 12 }}>There is no trash, undo, or automatic restoration.
        Opening this Repository again creates a new, empty Workspace.</p>
      <p style={{ marginTop: 12 }}>The Repository, application-wide configuration, and
        other Workspaces are kept.</p>
      <p className="small mono" style={{ marginTop: 12 }}>{workspace.repositoryLocator}</p>
      {session.chat?.executions.some((execution) => execution.status === "running") &&
        <p className="small muted">Stop the active Agent Execution or wait for it to finish before deleting.</p>}
      {failed && session.notice && <Notice error={session.notice} />}
    </Dialog>
  );
}
