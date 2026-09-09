import { useState } from "react";
import { Dialog } from "./Dialog";

/** Composes a request for review; only Send starts an Agent Execution. */
export function GenerateFlowDialog({ open, disabled, onCompose, onClose }: {
  open: boolean;
  disabled: boolean;
  onCompose: (request: string) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState("");
  return (
    <Dialog title="Generate a flow"
      open={open} onClose={onClose}
      footer={<>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={disabled || !description.trim()} onClick={() => {
          if (disabled || !description.trim()) return;
          onCompose(`Create a source-cited User Flow for: ${description.trim()}`);
          setDescription("");
        }}>Compose in Agent Chat</button>
      </>}>
      <div className="stack"><label>
        Describe the User Flow
        <textarea rows={6} value={description} autoFocus
          onChange={(event) => setDescription(event.target.value)}
          placeholder="A customer applies a promo code at checkout." />
      </label></div>
    </Dialog>
  );
}
