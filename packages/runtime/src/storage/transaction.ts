import type { DatabaseSync } from "node:sqlite";
import { CuratorError } from "@curator/shared";
import { describeCause } from "../logging.js";

/**
 * Runs one short synchronous transaction. Every mutation the application
 * accepts goes through here, so reads inside it see a consistent catalog and a
 * failure leaves the store exactly as it was.
 */
export function inTransaction<T>(database: DatabaseSync, work: () => T): T {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    database.exec("COMMIT");
    return result;
  } catch (cause) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // The transaction already ended; the original failure is the useful one.
    }
    if (cause instanceof CuratorError) {
      throw cause;
    }
    throw new CuratorError(
      "storage_unreadable",
      "Curator could not complete a change to its data store.",
      describeCause(cause),
    );
  }
}
