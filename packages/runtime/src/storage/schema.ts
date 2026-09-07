/**
 * The application's schema. It is created once, when the store is new, and
 * there is no migration, backup, downgrade, or recovery framework: a store
 * written by any other schema version is reported to the user and left
 * untouched. A change to these tables raises the version, and existing stores
 * then report as unsupported rather than being upgraded in place.
 */
export const SUPPORTED_SCHEMA_VERSION = 4;

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

CREATE TABLE user_flows (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL
) STRICT;

CREATE INDEX user_flows_workspace
  ON user_flows (workspace_id, title);

CREATE TABLE source_citations (
  id TEXT PRIMARY KEY NOT NULL,
  user_flow_id TEXT NOT NULL REFERENCES user_flows (id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  position INTEGER NOT NULL
) STRICT;

CREATE INDEX source_citations_flow
  ON source_citations (user_flow_id, position);

CREATE TABLE agent_executions (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  data TEXT NOT NULL
) STRICT;
CREATE UNIQUE INDEX one_running_execution
  ON agent_executions (workspace_id) WHERE status = 'running';

CREATE TABLE chat_entries (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  execution_id TEXT NOT NULL REFERENCES agent_executions (id) ON DELETE CASCADE,
  data TEXT NOT NULL
) STRICT;
CREATE INDEX chat_workspace ON chat_entries (workspace_id, sequence);

CREATE TABLE file_activity (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  execution_id TEXT NOT NULL REFERENCES agent_executions (id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT,
  grouped_count INTEGER,
  created_at TEXT NOT NULL
) STRICT;
CREATE UNIQUE INDEX file_activity_path ON file_activity (execution_id, path);
CREATE INDEX file_activity_workspace ON file_activity (workspace_id);

CREATE TABLE provider_frames (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id TEXT NOT NULL REFERENCES agent_executions (id) ON DELETE CASCADE,
  data TEXT NOT NULL
) STRICT;
CREATE INDEX provider_execution ON provider_frames (execution_id, sequence);
`;
