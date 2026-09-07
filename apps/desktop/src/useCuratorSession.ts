import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PROTOCOL_VERSION,
  eventContracts,
  type ApplicationError,
  type RuntimeStatus,
  type UserFlow,
  type UserFlowDraft,
  type Workspace,
} from "@curator/shared";
import {
  asCuratorError,
  chooseRepositoryDirectory,
  onRuntimeEvent,
  onRuntimeStatus,
  readRuntimeStatus,
  sendCommand,
} from "./bridge";

/**
 * Everything the window knows, and every way it can act. State here is a
 * projection of what the runtime has persisted: commands go out, ordered events
 * and reads come back, and nothing is treated as true until the runtime says so.
 */
export interface CuratorSession {
  ready: boolean;
  working: boolean;
  notice: ApplicationError | null;
  dismissNotice: (() => void) | undefined;
  workspaces: Workspace[];
  workspace: Workspace | null;
  flows: UserFlow[];
  selectedFlow: UserFlow | null;
  selectFlow: (flowId: string) => void;
  chooseRepository: () => void;
  openWorkspace: (workspaceId: string) => void;
  closeWorkspace: () => void;
  /** Each resolves true only once the runtime has committed the change. */
  addFlow: (draft: UserFlowDraft) => Promise<boolean>;
  saveFlow: (flowId: string, draft: UserFlowDraft) => Promise<boolean>;
  reactivateFlow: (flowId: string) => Promise<boolean>;
  removeFlow: (flowId: string) => Promise<boolean>;
}

export function useCuratorSession(): CuratorSession {
  const [status, setStatus] = useState<RuntimeStatus>({ state: "starting" });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [flows, setFlows] = useState<UserFlow[]>([]);
  const [problem, setProblem] = useState<ApplicationError | null>(null);
  const [inFlight, setInFlight] = useState(0);

  // Selection follows the user around the session but is not persisted: it is
  // immediate context, not stored work, so a restart starts clean.
  const [selectionByWorkspace, setSelectionByWorkspace] = useState<
    Record<string, string>
  >({});

  // Live updates and the reads that recover current state arrive on separate
  // channels, so a read that started earlier must never overwrite an update
  // that landed while it was in flight. A gap in the sequence means an update
  // was missed, and the answer is to read current state rather than guess it.
  const lastEventSequence = useRef(0);
  const hostReportedStatus = useRef(false);
  const workspacesRevision = useRef(0);
  const catalogRevision = useRef(0);
  const [catchUp, setCatchUp] = useState(0);

  // Read during render so an event arriving before the next commit still sees
  // the Workspace the window is actually showing.
  const openedWorkspaceId = workspace?.id ?? null;
  const openedWorkspaceIdRef = useRef(openedWorkspaceId);
  openedWorkspaceIdRef.current = openedWorkspaceId;

  const report = useCallback((cause: unknown) => {
    setProblem(asCuratorError(cause).toApplicationError());
  }, []);

  useEffect(() => {
    let listening = true;
    const subscriptions = [
      onRuntimeStatus((next) => {
        if (!listening) {
          return;
        }
        hostReportedStatus.current = true;
        setStatus(next);
      }),
      onRuntimeEvent((name, payload, sequence) => {
        if (!listening || sequence <= lastEventSequence.current) {
          return;
        }
        const previous = lastEventSequence.current;
        lastEventSequence.current = sequence;
        if (previous !== 0 && sequence > previous + 1) {
          setCatchUp((count) => count + 1);
        }

        if (name === "workspaces.changed") {
          workspacesRevision.current += 1;
          setWorkspaces(eventContracts["workspaces.changed"].parse(payload).workspaces);
          return;
        }
        if (name === "catalog.changed") {
          const changed = eventContracts["catalog.changed"].parse(payload);
          if (changed.workspaceId !== openedWorkspaceIdRef.current) {
            return;
          }
          catalogRevision.current += 1;
          setFlows(changed.flows);
        }
      }),
    ];

    // Read the host's view after subscribing. A reloaded window recovers the
    // current state instead of assuming it observed every event.
    readRuntimeStatus()
      .then((next) => {
        if (listening && !hostReportedStatus.current) {
          setStatus(next);
        }
      })
      .catch((cause: unknown) => {
        if (listening) {
          report(cause);
        }
      });

    return () => {
      listening = false;
      for (const subscription of subscriptions) {
        void subscription.then((stop) => stop());
      }
    };
  }, [report]);

  const mismatch = useMemo(() => describeContractMismatch(status), [status]);
  const ready = status.state === "ready" && mismatch === null;

  useEffect(() => {
    if (!ready) {
      return;
    }
    let listening = true;
    const revisionWhenRead = workspacesRevision.current;
    sendCommand("workspace.list", {})
      .then((listed) => {
        if (listening && workspacesRevision.current === revisionWhenRead) {
          setWorkspaces(listed.workspaces);
        }
      })
      .catch((cause: unknown) => {
        if (listening) {
          report(cause);
        }
      });
    return () => {
      listening = false;
    };
  }, [ready, catchUp, report]);

  useEffect(() => {
    if (!ready || openedWorkspaceId === null) {
      setFlows([]);
      return;
    }
    let listening = true;
    const revisionWhenRead = catalogRevision.current;
    sendCommand("catalog.list", { workspaceId: openedWorkspaceId })
      .then((listed) => {
        if (listening && catalogRevision.current === revisionWhenRead) {
          setFlows(listed.flows);
        }
      })
      .catch((cause: unknown) => {
        if (listening) {
          report(cause);
        }
      });
    return () => {
      listening = false;
    };
  }, [ready, openedWorkspaceId, catchUp, report]);

  /**
   * Runs one operation, reporting whether the runtime committed it. Operations
   * are counted rather than flagged, so one settling early does not present the
   * window as idle while another is still running.
   */
  const run = useCallback(
    async (work: () => Promise<void>): Promise<boolean> => {
      setInFlight((count) => count + 1);
      setProblem(null);
      try {
        await work();
        return true;
      } catch (cause) {
        report(cause);
        return false;
      } finally {
        setInFlight((count) => count - 1);
      }
    },
    [report],
  );

  const selectFlow = useCallback(
    (flowId: string) => {
      const workspaceId = openedWorkspaceIdRef.current;
      if (workspaceId !== null) {
        setSelectionByWorkspace((current) => ({ ...current, [workspaceId]: flowId }));
      }
    },
    [],
  );

  const chooseRepository = useCallback(() => {
    void run(async () => {
      const chosen = await chooseRepositoryDirectory();
      if (chosen === null) {
        return;
      }
      const opened = await sendCommand("workspace.open", { repositoryLocator: chosen });
      setWorkspace(opened.workspace);
    });
  }, [run]);

  const openWorkspace = useCallback(
    (workspaceId: string) => {
      void run(async () => {
        setWorkspace(await sendCommand("workspace.reopen", { workspaceId }));
      });
    },
    [run],
  );

  const mutate = useCallback(
    async (work: (workspaceId: string) => Promise<void>): Promise<boolean> => {
      const workspaceId = openedWorkspaceIdRef.current;
      if (workspaceId === null) {
        return false;
      }
      return run(() => work(workspaceId));
    },
    [run],
  );

  const addFlow = useCallback(
    (draft: UserFlowDraft) =>
      mutate(async (workspaceId) => {
        const added = await sendCommand("catalog.add", { workspaceId, draft });
        setSelectionByWorkspace((current) => ({ ...current, [workspaceId]: added.id }));
      }),
    [mutate],
  );

  const saveFlow = useCallback(
    (flowId: string, draft: UserFlowDraft) =>
      mutate(async (workspaceId) => {
        await sendCommand("catalog.save", { workspaceId, flowId, draft });
      }),
    [mutate],
  );

  const reactivateFlow = useCallback(
    (flowId: string) =>
      mutate(async (workspaceId) => {
        await sendCommand("catalog.reactivate", { workspaceId, flowId });
      }),
    [mutate],
  );

  const removeFlow = useCallback(
    (flowId: string) =>
      mutate(async (workspaceId) => {
        await sendCommand("catalog.remove", { workspaceId, flowId });
        // Only the removed flow loses its selection; whatever the user chose
        // while the removal was in flight stays chosen.
        setSelectionByWorkspace((current) => {
          if (current[workspaceId] !== flowId) {
            return current;
          }
          const next = { ...current };
          delete next[workspaceId];
          return next;
        });
      }),
    [mutate],
  );

  const selectedFlowId = openedWorkspaceId
    ? selectionByWorkspace[openedWorkspaceId]
    : undefined;

  return {
    ready,
    working: inFlight > 0,
    notice: problem ?? mismatch ?? (status.state === "unavailable" ? status.error : null),
    dismissNotice: problem ? () => setProblem(null) : undefined,
    workspaces,
    workspace,
    flows,
    selectedFlow: flows.find((flow) => flow.id === selectedFlowId) ?? null,
    selectFlow,
    chooseRepository,
    openWorkspace,
    closeWorkspace: () => setWorkspace(null),
    addFlow,
    saveFlow,
    reactivateFlow,
    removeFlow,
  };
}

/**
 * The interface and the runtime are compiled from the same contracts, so a
 * disagreement means one of them is stale — a compiled runtime left over from
 * an earlier build. Say so rather than failing later on a message neither side
 * can read.
 */
function describeContractMismatch(status: RuntimeStatus): ApplicationError | null {
  if (status.state !== "ready" || status.description.protocolVersion === PROTOCOL_VERSION) {
    return null;
  }
  return {
    code: "protocol_mismatch",
    message:
      "Curator's interface and its application runtime were built from different contracts.",
    detail: `The interface speaks protocol ${PROTOCOL_VERSION} and the runtime speaks ${status.description.protocolVersion}. Run pnpm build, or pnpm dev, from the checkout root.`,
  };
}
