import { useState } from "react";
import type { ApplicationError, Workspace } from "@curator/shared";
import { asCuratorError, chooseRepositoryDirectory } from "../bridge";
import type { CuratorSession } from "../useCuratorSession";
import { Dialog } from "./Dialog";
import { Notice } from "./Notice";

/** Selecting a folder only prepares a Relink; confirmation submits the change. */
export function RelinkDialog({ workspace, session, onClose }: {
  workspace: Workspace;
  session: CuratorSession;
  onClose: () => void;
}) {
  const [locator, setLocator] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [problem, setProblem] = useState<ApplicationError | null>(null);
  const [failed, setFailed] = useState(false);
  const disabled = choosing || session.working || !session.ready || session.chat === null;

  const choose = async () => {
    setChoosing(true);
    setProblem(null);
    setFailed(false);
    try {
      const selected = await chooseRepositoryDirectory();
      if (selected !== null) setLocator(selected);
    } catch (cause) {
      setProblem(asCuratorError(cause).toApplicationError());
    } finally {
      setChoosing(false);
    }
  };

  const error = problem ?? (failed ? session.notice : null);
  return (
    <Dialog open title="Relink Repository" subtitle={workspace.displayName} onClose={onClose}
      footer={<>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={disabled || locator === null}
          onClick={() => {
            if (locator === null) return;
            setFailed(false);
            void session.relinkRepository(locator).then((committed) => {
              if (committed) onClose();
              else setFailed(true);
            });
          }}>Confirm same Repository and Relink</button>
      </>}>
      <p>Choose the new location, then confirm it is the same Repository.
        This Workspace keeps its User Flows, Source Citations, Agent Chat, and Scan history.</p>
      <dl className="details">
        <dt>Current location</dt><dd className="mono">{workspace.repositoryLocator}</dd>
        <dt>Replacement</dt><dd className="mono">{locator ?? "No folder selected"}</dd>
      </dl>
      <button disabled={disabled} onClick={() => void choose()}>
        {choosing ? "Choosing…" : locator === null ? "Choose folder…" : "Choose another folder…"}
      </button>
      <p className="small muted" style={{ marginTop: 14 }}>
        If the selected location already belongs to another Workspace, Curator opens
        that Workspace and leaves this one unchanged. Workspaces are never merged.
      </p>
      {error && <Notice error={error} />}
    </Dialog>
  );
}
