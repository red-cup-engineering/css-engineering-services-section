// The tables Discord admission kept in D1 before its journal store (src/admission/discord-store.mjs),
// as the forward-only migrations that created them. Retired from src/: only tests use it, to write
// a legacy-format database for the read-once import (src/admission/import-sql-discord-admission.mjs).
export const ADMISSION_MIGRATIONS = Object.freeze([
    Object.freeze({
        name: '0001_discord_oauth_sessions',
        sql: `CREATE TABLE IF NOT EXISTS discord_oauth_sessions (
  session_hash TEXT PRIMARY KEY,
  subject_hash TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  authorization_ciphertext TEXT NOT NULL,
  authorization_version INTEGER NOT NULL DEFAULT 0,
  token_expires_at INTEGER NOT NULL,
  session_expires_at INTEGER NOT NULL,
  retry_after INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS discord_oauth_sessions_subject ON discord_oauth_sessions(subject_hash);
CREATE INDEX IF NOT EXISTS discord_oauth_sessions_expiry ON discord_oauth_sessions(session_expires_at);`,
    }),
    Object.freeze({
        name: '0002_discord_command_login',
        sql: `CREATE TABLE IF NOT EXISTS discord_command_login_challenges (
  challenge_hash TEXT PRIMARY KEY,
  verifier_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  approved_at INTEGER,
  consumed_at INTEGER,
  subject_hash TEXT,
  discord_user_ciphertext TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS discord_command_login_challenges_expiry ON discord_command_login_challenges(expires_at);
CREATE TABLE IF NOT EXISTS discord_interaction_sessions (
  session_hash TEXT PRIMARY KEY,
  subject_hash TEXT NOT NULL,
  discord_user_ciphertext TEXT NOT NULL,
  session_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS discord_interaction_sessions_expiry ON discord_interaction_sessions(session_expires_at);
CREATE TABLE IF NOT EXISTS discord_command_login_rate_limits (
  rate_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);`,
    }),
]);
/** The schema as one SQL text, for a store that applies it directly. */
export const ADMISSION_SCHEMA_SQL = ADMISSION_MIGRATIONS.map((migration) => migration.sql).join('\n');
