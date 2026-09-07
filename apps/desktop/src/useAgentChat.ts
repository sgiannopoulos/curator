import { useEffect, useState } from "react";
import { eventContracts, type ApplicationError, type ChatSnapshot } from "@curator/shared";
import { asCuratorError, onRuntimeEvent, sendCommand } from "./bridge";

/** Serialized snapshot reads coalesce invalidations without losing live updates. */
export function useAgentChat(workspaceId: string | null, ready: boolean, recovery: number) {
  const [state, setState] = useState<{ workspaceId: string; chat: ChatSnapshot } | null>(null);
  const [error, setError] = useState<ApplicationError | null>(null);
  useEffect(() => {
    if (!ready || workspaceId === null) return;
    let listening = true;
    let reading = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setError(null);

    const read = async (): Promise<void> => {
      if (reading || !listening) return;
      reading = true;
      dirty = false;
      try {
        const chat = await sendCommand("chat.read", { workspaceId });
        if (listening) { setState({ workspaceId, chat }); setError(null); }
      } catch (cause) {
        if (listening) setError(asCuratorError(cause).toApplicationError());
      } finally {
        reading = false;
        if (dirty && listening) timer = setTimeout(() => { timer = undefined; void read(); }, 50);
      }
    };
    const subscription = onRuntimeEvent((name, payload) => {
      if (!listening) return;
      if (name !== "chat.changed" || eventContracts["chat.changed"].parse(payload).workspaceId !== workspaceId) return;
      dirty = true;
      if (!reading && timer === undefined) {
        timer = setTimeout(() => { timer = undefined; void read(); }, 50);
      }
    });
    void subscription.then(() => read()).catch((cause: unknown) => {
      if (listening) setError(asCuratorError(cause).toApplicationError());
    });
    // Re-check source availability on focus; the authoritative start checks too.
    const focus = (): void => { dirty = true; void read(); };
    window.addEventListener("focus", focus);
    return () => {
      listening = false;
      clearTimeout(timer);
      window.removeEventListener("focus", focus);
      void subscription.then((stop) => stop());
    };
  }, [workspaceId, ready, recovery]);
  return { chat: state?.workspaceId === workspaceId ? state.chat : null, error };
}
