/**
 * The initial schema. It is created once, when the store is new, and there is
 * no migration, backup, downgrade, or recovery framework: a store written by
 * any other schema version is reported to the user and left untouched. A slice
 * that changes these tables raises the version, and existing stores then report
 * as unsupported rather than being upgraded in place.
 */
export const SUPPORTED_SCHEMA_VERSION = 1;

export const SCHEMA_STATEMENTS = `
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  repository_locator TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_opened_at TEXT NOT NULL
) STRICT;

CREATE INDEX workspaces_last_opened_at
  ON workspaces (last_opened_at DESC);
`;
