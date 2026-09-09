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
        Permanently delete this flow and its Source Citations. This cannot be undone.
      </p>
      <p>
        A later Scan may rediscover this behavior as a new User Flow.
      </p>
    </Dialog>
  );
}
