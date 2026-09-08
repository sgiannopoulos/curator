import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  CuratorError,
  type EvidenceFreshness,
  type RepositoryAvailability,
  type Workspace,
  type WorkspaceOpen,
} from "@curator/shared";
import { CatalogApplication } from "./catalog-application.js";
import { ChatApplication } from "./chat-application.js";
import { ResultApplication } from "./result-application.js";
import { FileActivityLog } from "./file-activity-log.js";
import { deriveDisplayName, normalizeRepositoryLocator } from "./locator.js";
import { inspectCitationFreshness, repositoryAvailability } from "./repository-access.js";
import { readText, type StoredRow } from "./storage/rows.js";
import { inTransaction } from "./storage/transaction.js";
import { requireIdle } from "./storage/execution-state.js";

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

  /**
   * The catalog of each Workspace, reached through the Workspace application
   * rather than opened separately: this module owns the store, and every
   * manual mutation and every accepted agent result goes through it.
   */
  readonly catalog: CatalogApplication;
  readonly chat: ChatApplication;
  readonly activity: FileActivityLog;
  readonly results: ResultApplication;

  constructor(database: DatabaseSync) {
    this.#database = database;
    this.catalog = new CatalogApplication(database);
    this.chat = new ChatApplication(database, this.catalog);
    this.results = new ResultApplication(database, this.catalog, this.chat);
    this.activity = new FileActivityLog(database);
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
    const availability = repositoryAvailability(locator);
    const now = new Date().toISOString();
    return inTransaction(this.#database, () => {
      const existing = this.#findByLocator(locator);
      if (existing) {
        this.#touch(existing.id, now);
        return { workspace: { ...existing, lastOpenedAt: now }, recognized: true };
      }

      requireDirectory(availability);

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
   * whether or not the Repository is still at its locator.
   */
  reopen(workspaceId: string): Workspace {
    const now = new Date().toISOString();
    return inTransaction(this.#database, () => {
      const workspace = this.#require(workspaceId);
      this.#touch(workspace.id, now);
      return { ...workspace, lastOpenedAt: now };
    });
  }

  repositoryAvailability(workspaceId: string): RepositoryAvailability {
    return repositoryAvailability(this.#require(workspaceId).repositoryLocator);
  }

  /**
   * Called after explicit same-Repository confirmation. The locator and its
   * derived name change together; catalog, evidence and history are untouched.
   * The busy check shares the transaction authority used by execution start.
   */
  relink(workspaceId: string, repositoryLocator: string): Workspace {
    const locator = normalizeRepositoryLocator(repositoryLocator);
    const availability = repositoryAvailability(locator);
    return inTransaction(this.#database, () => {
      const workspace = this.#require(workspaceId);
      requireIdle(this.#database, workspaceId);
      const now = new Date().toISOString();
      const existing = this.#findByLocator(locator);
      if (existing) {
        // An occupied locator opens its owner. The original association is
        // never moved, merged, or even touched when the owner is different.
        this.#touch(existing.id, now);
        return { ...existing, lastOpenedAt: now };
      }
      requireDirectory(availability);
      const displayName = deriveDisplayName(locator);
      this.#database.prepare(`UPDATE workspaces
        SET repository_locator = ?, display_name = ?, last_opened_at = ? WHERE id = ?`)
        .run(locator, displayName, now, workspaceId);
      return { ...workspace, repositoryLocator: locator, displayName, lastOpenedAt: now };
    });
  }

  /**
   * Reads a User Flow's evidence against the Repository this Workspace analyzes
   * right now. It is a reading, not a judgment: nothing is stored, no flow
   * changes status, and an Agent Execution running in this Workspace neither
   * blocks it nor is affected by it.
   */
  async evidenceFreshness(workspaceId: string, flowId: string): Promise<EvidenceFreshness> {
    const workspace = this.#require(workspaceId);
    const accepted = this.catalog.evidence(workspaceId, flowId);
    const inspected = await inspectCitationFreshness(workspace.repositoryLocator, accepted);
    return { flowId, checkedAt: new Date().toISOString(), ...inspected };
  }

  #require(workspaceId: string): Workspace {
    const row = this.#database
      .prepare(`SELECT ${WORKSPACE_COLUMNS} FROM workspaces WHERE id = ?`)
      .get(workspaceId);
    if (!row) {
      throw new CuratorError(
        "workspace_not_found",
        "That Workspace is no longer in this Curator data store.",
      );
    }
    return toWorkspace(row);
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

function requireDirectory(availability: RepositoryAvailability): void {
  if (availability.problem !== null) {
    throw new CuratorError(
      "repository_not_a_directory",
      `Curator could not access ${availability.repositoryLocator} as a readable directory. Choose an available Repository directory.`,
    );
  }
}
