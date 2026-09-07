import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import {
  CuratorError,
  PROTOCOL_VERSION,
  applicationErrorSchema,
  commandNames,
  type ApplicationError,
  type CommandName,
  type RuntimeDescription,
} from "@curator/shared";
import { describeCause, log } from "./logging.js";
import { openDatabase } from "./storage/database.js";
import { SUPPORTED_SCHEMA_VERSION } from "./storage/schema.js";
import { Transport } from "./transport.js";
import { WorkspaceApplication } from "./workspace-application.js";

/**
 * The supervised runtime. It owns every read and write of the application's
 * data store; the desktop host only relays typed commands to it and forwards
 * the ordered events it publishes.
 *
 * A store that cannot be opened does not stop the process. The runtime reports
 * the failure, keeps answering with it, and changes nothing on disk.
 */
function main(): void {
  const dataDirectory = requireOption("--data-dir");
  const databasePath = join(dataDirectory, "curator.db");
  const transport = new Transport();

  let database: DatabaseSync | undefined;
  try {
    database = openDatabase(databasePath);
  } catch (cause) {
    const error = toApplicationError(cause);
    log(`storage unavailable: ${error.message}`);
    registerUnavailableStorage(transport, error);
    transport.listen(() => shutdown(undefined));
    transport.publish("runtime.failed", { error });
    return;
  }

  const workspaces = new WorkspaceApplication(database);
  const description: RuntimeDescription = {
    protocolVersion: PROTOCOL_VERSION,
    nodeVersion: process.version,
    storage: { databasePath, schemaVersion: SUPPORTED_SCHEMA_VERSION },
  };

  transport.handle("workspace.list", () => ({ workspaces: workspaces.list() }));
  transport.handle("workspace.open", ({ repositoryLocator }) => {
    const opened = workspaces.open(repositoryLocator);
    transport.publish("workspaces.changed", { workspaces: workspaces.list() });
    return opened;
  });
  transport.handle("workspace.reopen", ({ workspaceId }) => {
    const workspace = workspaces.reopen(workspaceId);
    transport.publish("workspaces.changed", { workspaces: workspaces.list() });
    return workspace;
  });

  const catalog = workspaces.catalog;
  const publishCatalog = (workspaceId: string): void => {
    transport.publish("catalog.changed", {
      workspaceId,
      flows: catalog.list(workspaceId),
    });
  };

  transport.handle("catalog.list", ({ workspaceId }) => ({
    flows: catalog.list(workspaceId),
  }));
  transport.handle("catalog.add", ({ workspaceId, draft }) => {
    const flow = catalog.add(workspaceId, draft);
    publishCatalog(workspaceId);
    return flow;
  });
  transport.handle("catalog.save", ({ workspaceId, flowId, draft }) => {
    const flow = catalog.save(workspaceId, flowId, draft);
    publishCatalog(workspaceId);
    return flow;
  });
  transport.handle("catalog.reactivate", ({ workspaceId, flowId }) => {
    const flow = catalog.reactivate(workspaceId, flowId);
    publishCatalog(workspaceId);
    return flow;
  });
  transport.handle("catalog.remove", ({ workspaceId, flowId }) => {
    const removed = catalog.remove(workspaceId, flowId);
    publishCatalog(workspaceId);
    return { flowId: removed };
  });

  const openDatabaseHandle = database;
  transport.listen(() => shutdown(openDatabaseHandle));
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => shutdown(openDatabaseHandle));
  }

  log(`ready on Node ${process.version} with ${databasePath}`);
  transport.publish("runtime.ready", description);
}

/** Answers every command with the storage failure instead of hiding it. */
function registerUnavailableStorage(transport: Transport, error: ApplicationError): void {
  for (const name of commandNames) {
    transport.handle(name as CommandName, (() => {
      throw new CuratorError(error.code, error.message, error.detail);
    }) as never);
  }
}

/** The host closing its end of the pipe means this runtime stops too. */
function shutdown(database: DatabaseSync | undefined): void {
  log("shutting down");
  try {
    database?.close();
  } catch (cause) {
    log(`could not close the data store cleanly: ${describeCause(cause)}`);
  }
  process.exit(0);
}

function requireOption(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) {
    log(`missing required option ${name}`);
    process.exit(2);
  }
  return value;
}

function toApplicationError(cause: unknown): ApplicationError {
  if (cause instanceof CuratorError) {
    return cause.toApplicationError();
  }
  return applicationErrorSchema.parse({
    code: "internal",
    message: "Curator could not start its runtime.",
    detail: describeCause(cause),
  });
}

main();
