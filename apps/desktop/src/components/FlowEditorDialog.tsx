import { useEffect, useRef, useState } from "react";
import { userFlowDraftSchema, type UserFlow, type UserFlowDraft } from "@curator/shared";
import { Dialog } from "./Dialog";

/**
 * Writing a User Flow by hand: a title and a free-text description of what a
 * person does and what they expect. Save commits it, with no second
 * confirmation and no source review.
 */
export function FlowEditorDialog({
  open,
  flow,
  working,
  onSave,
  onClose,
}: {
  open: boolean;
  flow: UserFlow | null;
  working: boolean;
  onSave: (draft: UserFlowDraft) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const flowRef = useRef(flow);
  flowRef.current = flow;

  // Keyed on identity, not object reference: the catalog is replaced wholesale
  // whenever it changes, and reloading it must not overwrite live typing.
  const editingId = flow?.id ?? null;
  useEffect(() => {
    if (open) {
      setTitle(flowRef.current?.title ?? "");
      setDescription(flowRef.current?.description ?? "");
    }
  }, [open, editingId]);

  const draft = userFlowDraftSchema.safeParse({ title, description });

  return (
    <Dialog
      title={flow === null ? "Add User Flow" : "Edit User Flow"}
      subtitle="Describe user actions and expected outcomes in your own words."
      open={open}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            disabled={!draft.success || working}
            onClick={() => {
              if (draft.success) {
                onSave(draft.data);
              }
            }}
          >
            Save
          </button>
        </>
      }
    >
      <div className="stack">
        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="A returning customer applies a promo code at checkout"
          />
        </label>
        <label>
          Description
          <textarea
            rows={7}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What the person does, and what they expect to happen."
          />
        </label>
        <p className="small muted">
          {flow === null
            ? "A flow you write yourself starts Active and needs no Source Citations."
            : "Save keeps this flow's identity, its Active or Outdated status, and any Source Citations already attached. Those citations do not certify that your edited wording has been reviewed."}
        </p>
      </div>
    </Dialog>
  );
}
