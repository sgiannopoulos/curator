import { randomUUID } from "node:crypto";
import { statSync } from "node:fs";
import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import { CuratorError, type Workspace, type WorkspaceOpen } from "@curator/shared";
import { deriveDisplayName, normalizeRepositoryLocator } from "./locator.js";
import { describeCause } from "./logging.js";

type StoredRow = Record<string, SQLOutputValue>;

const WORKSPACE_COLUMNS =
  "id, repository_locator, display_name, created_at, last_opened_at";

/**
 * Owns Workspaces and the store they live in. A Workspace is recognized only by
 * exact Repository Locator equality: Git metadata, directory contents, names,
 * and filesystem identities never imply that two locations are the same
 * Repository, and they never create a second catalog for one location.
 */
export class WorkspaceApplication {
  readonly #database: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.#database = database;
  }

  list(): Workspace[] {
    const rows = this.#database
      .prepare(
        `SELECT ${WORKSPACE_COLUMNS} FROM workspaces
          ORDER BY last_opened_at DESC, display_name ASC`,
      )
      .all();
    return rows.map(toWorkspace);
  }

  /**
   * Opens the Workspace for a selected directory, creating one the first time
   * that locator is seen. Reopening an already recognized locator returns the
   * existing Workspace with its identity and history intact.
   */
  open(repositoryLocator: string): WorkspaceOpen {
    const locator = normalizeRepositoryLocator(repositoryLocator);
    requireDirectory(locator);

    const now = new Date().toISOString();
    return this.#inTransaction(() => {
      const existing = this.#findByLocator(locator);
      if (existing) {
        this.#touch(existing.id, now);
        return { workspace: { ...existing, lastOpenedAt: now }, recognized: true };
      }

      const workspace: Workspace = {
        id: randomUUID(),
        repositoryLocator: locator,
        displayName: deriveDisplayName(locator),
        createdAt: now,
        lastOpenedAt: now,
      };
      this.#database
        .prepare(
          `INSERT INTO workspaces (id, repository_locator, display_name, created_at, last_opened_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          workspace.id,
          workspace.repositoryLocator,
          workspace.displayName,
          workspace.createdAt,
          workspace.lastOpenedAt,
        );
      return { workspace, recognized: false };
    });
  }

  /**
   * Reopens a Workspace already listed in Recent. Stored data stays reachable
   * whether or not the Repository is still at its locator; reporting and
   * repairing an unavailable Repository belongs to a later slice.
   */
  reopen(workspaceId: string): Workspace {
    const now = new Date().toISOString();
    return this.#inTransaction(() => {
      const row = this.#database
        .prepare(`SELECT ${WORKSPACE_COLUMNS} FROM workspaces WHERE id = ?`)
        .get(workspaceId);
      if (!row) {
        throw new CuratorError(
          "workspace_not_found",
          "That Workspace is no longer in this Curator data store.",
        );
      }
      const workspace = toWorkspace(row);
      this.#touch(workspace.id, now);
      return { ...workspace, lastOpenedAt: now };
    });
  }

  #findByLocator(locator: string): Workspace | undefined {
    const row = this.#database
      .prepare(`SELECT ${WORKSPACE_COLUMNS} FROM workspaces WHERE repository_locator = ?`)
      .get(locator);
    return row === undefined ? undefined : toWorkspace(row);
  }

  #touch(workspaceId: string, at: string): void {
    this.#database
      .prepare("UPDATE workspaces SET last_opened_at = ? WHERE id = ?")
      .run(at, workspaceId);
  }

  #inTransaction<T>(work: () => T): T {
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.#database.exec("COMMIT");
      return result;
    } catch (cause) {
      try {
        this.#database.exec("ROLLBACK");
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
}

function toWorkspace(row: StoredRow): Workspace {
  return {
    id: readText(row, "id"),
    repositoryLocator: readText(row, "repository_locator"),
    displayName: readText(row, "display_name"),
    createdAt: readText(row, "created_at"),
    lastOpenedAt: readText(row, "last_opened_at"),
  };
}

function readText(row: StoredRow, column: string): string {
  const value = row[column];
  if (typeof value !== "string") {
    throw new CuratorError(
      "storage_unreadable",
      "Curator read a Workspace record it could not interpret.",
      `Column ${column} did not hold text.`,
    );
  }
  return value;
}

function requireDirectory(locator: string): void {
  let isDirectory: boolean;
  try {
    isDirectory = statSync(locator).isDirectory();
  } catch (cause) {
    throw new CuratorError(
      "repository_not_a_directory",
      `Curator could not read ${locator} as a directory.`,
      describeCause(cause),
    );
  }
  if (!isDirectory) {
    throw new CuratorError(
      "repository_not_a_directory",
      `${locator} is not a directory, so it cannot be a Repository.`,
    );
  }
}
