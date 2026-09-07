import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CuratorError } from "@curator/shared";
import { describeCause, log } from "../logging.js";
import { SCHEMA_STATEMENTS, SUPPORTED_SCHEMA_VERSION } from "./schema.js";

/**
 * Opens the one app-private store that holds every Workspace. Failures here are
 * reported and never repaired automatically: an unreadable file or a store from
 * an unsupported schema version leaves the existing data exactly as it is, and
 * names its location so the user can act on it.
 */
export function openDatabase(databasePath: string): DatabaseSync {
  try {
    mkdirSync(dirname(databasePath), { recursive: true });
  } catch (cause) {
    throw new CuratorError(
      "storage_unreadable",
      `Curator could not create its data directory at ${dirname(databasePath)}.`,
      describeCause(cause),
    );
  }

  let database: DatabaseSync;
  let storedVersion: number;
  try {
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON");
    storedVersion = readSchemaVersion(database);
  } catch (cause) {
    throw new CuratorError(
      "storage_unreadable",
      `Curator could not read its data store at ${databasePath}.`,
      describeCause(cause),
    );
  }

  if (storedVersion === 0) {
    initializeSchema(database, databasePath);
    log(`initialized schema version ${SUPPORTED_SCHEMA_VERSION} at ${databasePath}`);
    return database;
  }

  if (storedVersion !== SUPPORTED_SCHEMA_VERSION) {
    // A store from another version is left alone. There is no migration to run
    // and no partial upgrade to attempt, in either direction.
    database.close();
    throw new CuratorError(
      "storage_unsupported",
      `The data store at ${databasePath} uses schema version ${storedVersion}, and this build of Curator supports version ${SUPPORTED_SCHEMA_VERSION}. Nothing was changed or reset.`,
      "Curator has no schema migration, downgrade, or recovery path. Run a build that supports this version, or move the file aside to start a new store.",
    );
  }

  return database;
}

function readSchemaVersion(database: DatabaseSync): number {
  const row = database.prepare("PRAGMA user_version").get() as
    | { user_version?: number }
    | undefined;
  return typeof row?.user_version === "number" ? row.user_version : 0;
}

function initializeSchema(database: DatabaseSync, databasePath: string): void {
  try {
    database.exec("BEGIN IMMEDIATE");
    database.exec(SCHEMA_STATEMENTS);
    database.exec(`PRAGMA user_version = ${SUPPORTED_SCHEMA_VERSION}`);
    database.exec("COMMIT");
  } catch (cause) {
    rollbackQuietly(database);
    database.close();
    throw new CuratorError(
      "storage_unreadable",
      `Curator could not initialize its data store at ${databasePath}.`,
      describeCause(cause),
    );
  }
}

function rollbackQuietly(database: DatabaseSync): void {
  try {
    database.exec("ROLLBACK");
  } catch {
    // The transaction was never opened, or the store is already unusable.
  }
}
