import { Notice } from "./components/Notice";
import { TitleBar } from "./components/TitleBar";
import { StartPage } from "./pages/StartPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { useCuratorSession } from "./useCuratorSession";

export function App() {
  const session = useCuratorSession();

  return (
    <>
      <TitleBar title={session.workspace?.displayName ?? "Curator"} />
      {session.notice && (
        <Notice error={session.notice} onDismiss={session.dismissNotice} />
      )}
      {session.workspace === null ? (
        <StartPage
          workspaces={session.workspaces}
          working={session.working}
          runtimeReady={session.ready}
          onChooseRepository={session.chooseRepository}
          onOpenWorkspace={session.openWorkspace}
        />
      ) : (
        <WorkspacePage key={session.workspace.id} workspace={session.workspace} session={session} />
      )}
    </>
  );
}
