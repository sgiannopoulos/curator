import type { UserFlow } from "@curator/shared";
import { Dialog } from "./Dialog";

/**
 * Removal is permanent and has to say so. There is no trash and no undo, and
 * a mention of this flow in retained history cannot bring it back.
 */
export function RemoveFlowDialog({
  flow,
  working,
  onConfirm,
  onClose,
}: {
  flow: UserFlow | null;
  working: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      title="Remove this User Flow?"
      subtitle={flow?.title}
      open={flow !== null}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancel</button>
          <button className="destructive" disabled={working} onClick={onConfirm}>
            Remove permanently
          </button>
        </>
      }
    >
      <p>
        This deletes the flow and its Source Citations from the catalog for good.
        There is no undo, no trash, and no way to restore it.
      </p>
      <p style={{ marginTop: 12 }}>
        Records that already mention it stay as they are, but they cannot bring it
        back. A later Scan that finds this behavior again will create a new User
        Flow with a new identity, so removing it is not a rule that keeps it out.
      </p>
    </Dialog>
  );
}
