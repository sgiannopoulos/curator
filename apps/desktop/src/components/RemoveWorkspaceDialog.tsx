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
      <p>Permanently delete this Workspace and all its data, including User Flows,
        Source Citations, Agent Chat, and Scan history. This cannot be undone.</p>
      <p>Repository files are kept. Opening this Repository again creates an empty Workspace.</p>
      <p className="small mono">{workspace.repositoryLocator}</p>
      {session.chat?.executions.some((execution) => execution.status === "running") &&
        <p className="small muted">Stop the agent or wait for it to finish before deleting.</p>}
      {failed && session.notice && <Notice error={session.notice} />}
    </Dialog>
  );
}
