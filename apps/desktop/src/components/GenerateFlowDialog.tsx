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
      subtitle="Describe it the way you would to a teammate. Review and send your request in Agent Chat."
      open={open} onClose={onClose}
      footer={<>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={disabled || !description.trim()} onClick={() => {
          if (disabled || !description.trim()) return;
          onCompose(`Create a source-cited User Flow for: ${description.trim()}`);
          setDescription("");
        }}>Compose in Agent Chat</button>
      </>}>
      <label>
        Describe the User Flow
        <textarea rows={6} value={description} autoFocus
          onChange={(event) => setDescription(event.target.value)}
          placeholder="A returning customer applies a promo code at checkout and sees the discount on the confirmation page." />
      </label>
      <p className="small muted" style={{ marginTop: 16 }}>
        Curator will inspect the implementation and create a flow with supporting sources when you send the request.
      </p>
    </Dialog>
  );
}
