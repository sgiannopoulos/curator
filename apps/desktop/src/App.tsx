import { useCallback, useEffect, useRef, useState } from "react";
import {
  PROTOCOL_VERSION,
  eventContracts,
  type ApplicationError,
  type RuntimeStatus,
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
import { Notice } from "./components/Notice";
import { TitleBar } from "./components/TitleBar";
import { StartPage } from "./pages/StartPage";
import { WorkspacePage } from "./pages/WorkspacePage";

export function App() {
  const [status, setStatus] = useState<RuntimeStatus>({ state: "starting" });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [openedWorkspace, setOpenedWorkspace] = useState<Workspace | null>(null);
  const [problem, setProblem] = useState<ApplicationError | null>(null);
  const [working, setWorking] = useState(false);

  // Live updates and the reads that recover current state arrive on separate
  // channels, so a read that started earlier must never overwrite an update
  // that landed while it was in flight.
  const lastEventSequence = useRef(0);
  const hostReportedStatus = useRef(false);
  const catalogRevision = useRef(0);

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
        lastEventSequence.current = sequence;
        if (name === "workspaces.changed") {
          catalogRevision.current += 1;
          setWorkspaces(eventContracts["workspaces.changed"].parse(payload).workspaces);
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

  useEffect(() => {
    if (status.state !== "ready") {
      return;
    }
    let listening = true;
    const revisionWhenRead = catalogRevision.current;
    sendCommand("workspace.list", {})
      .then((listed) => {
        if (listening && catalogRevision.current === revisionWhenRead) {
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
  }, [status.state, report]);

  const run = useCallback(
    async (work: () => Promise<void>) => {
      setWorking(true);
      setProblem(null);
      try {
        await work();
      } catch (cause) {
        report(cause);
      } finally {
        setWorking(false);
      }
    },
    [report],
  );

  const chooseRepository = useCallback(() => {
    void run(async () => {
      const chosen = await chooseRepositoryDirectory();
      if (chosen === null) {
        return;
      }
      const opened = await sendCommand("workspace.open", { repositoryLocator: chosen });
      setOpenedWorkspace(opened.workspace);
    });
  }, [run]);

  const openWorkspace = useCallback(
    (workspaceId: string) => {
      void run(async () => {
        setOpenedWorkspace(await sendCommand("workspace.reopen", { workspaceId }));
      });
    },
    [run],
  );

  const mismatch = describeContractMismatch(status);
  const notice =
    problem ?? mismatch ?? (status.state === "unavailable" ? status.error : null);

  return (
    <>
      <TitleBar title={openedWorkspace === null ? "Curator" : openedWorkspace.displayName} />
      {notice && (
        <Notice error={notice} onDismiss={problem ? () => setProblem(null) : undefined} />
      )}
      {openedWorkspace === null ? (
        <StartPage
          workspaces={workspaces}
          working={working}
          runtimeReady={status.state === "ready" && mismatch === null}
          onChooseRepository={chooseRepository}
          onOpenWorkspace={openWorkspace}
        />
      ) : (
        <WorkspacePage workspace={openedWorkspace} onClose={() => setOpenedWorkspace(null)} />
      )}
    </>
  );
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
