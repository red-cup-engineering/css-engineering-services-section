// Typed data-access layer over a Cloudflare D1Database. Every exported
// method validates its inputs and throws a specific, greppable
// TypeError/Error before touching the database. Column names are
// snake_case on disk (see migrations/0001_init.sql); every method maps
// rows to camelCase objects at the boundary so callers never see raw SQL
// shapes. Runs unmodified in Node 24 and Cloudflare Workers: no imports
// beyond the D1Database instance passed in.

function requireD1(d1) {
  if (!d1 || typeof d1.prepare !== "function") {
    throw new TypeError("createStore requires a D1Database with a prepare(sql) method");
  }
  return d1;
}

function requirePositiveInt(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer, got ${JSON.stringify(value)}`);
  }
  return value;
}

function requireInt(value, label) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer, got ${JSON.stringify(value)}`);
  }
  return value;
}

function requireIntOrNull(value, label) {
  if (value !== null && !Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer or null, got ${JSON.stringify(value)}`);
  }
  return value;
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string, got ${JSON.stringify(value)}`);
  }
  return value;
}

function requireStringOrNull(value, label) {
  if (value !== null && (typeof value !== "string" || value.length === 0)) {
    throw new TypeError(`${label} must be a non-empty string or null, got ${JSON.stringify(value)}`);
  }
  return value;
}

function requireObject(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object, got ${JSON.stringify(value)}`);
  }
  return value;
}

function requireScopes(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((s) => typeof s !== "string" || s.length === 0)) {
    throw new TypeError(`${label} must be a non-empty array of non-empty strings`);
  }
  return value;
}

function mapUserRow(row) {
  return {
    id: row.id,
    characterId: row.character_id,
    characterName: row.character_name,
    createdAt: row.created_at,
  };
}

function mapEsiTokensRow(row) {
  return {
    userId: row.user_id,
    accessTokenSealed: row.access_token_sealed,
    refreshTokenSealed: row.refresh_token_sealed,
    expiresAt: row.expires_at,
    scopes: JSON.parse(row.scopes),
  };
}

function mapSettingsRow(row) {
  return {
    userId: row.user_id,
    // aiKeySealed mirrors the historical gemini_key_sealed column (see
    // migrations/0002_ai_provider.sql's comment: the column name predates
    // provider-agnosticism and is not renamed). geminiKeySealed/geminiModel
    // are kept alongside the new names so existing callers (worker.mjs's
    // apiMe, the Gemini-only code paths that haven't been touched yet)
    // don't have to change in lockstep with this store.
    geminiKeySealed: row.gemini_key_sealed ?? null,
    geminiModel: row.gemini_model,
    aiKeySealed: row.gemini_key_sealed ?? null,
    aiProvider: row.ai_provider ?? "gemini",
    aiBaseUrl: row.ai_base_url ?? null,
    // Falls back to the legacy gemini_model column when ai_model was never
    // set (e.g. a row written by saveGeminiKey before this migration ran).
    aiModel: row.ai_model ?? row.gemini_model ?? null,
  };
}

function mapMcpTokenRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    label: row.label,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? null,
  };
}

function mapMcpTokenListRow(row) {
  // Deliberately omits token_hash: it's a SHA-256 digest, not the raw
  // secret, but the settings page has no need to see it and dumb data
  // layers shouldn't hand back more than callers asked for.
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? null,
  };
}

function mapObservationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    path: row.path,
    paramsJson: row.params_json,
    status: row.status,
    bodyJson: row.body_json,
    expiresAt: row.expires_at ?? null,
    recordedAt: row.recorded_at,
  };
}

function mapChatMessageRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    threadId: row.thread_id,
    role: row.role,
    contentJson: row.content_json,
    createdAt: row.created_at,
  };
}

export function createStore(d1) {
  requireD1(d1);

  async function getUserByCharacterId(characterId) {
    requirePositiveInt(characterId, "characterId");
    const row = await d1
      .prepare("SELECT id, character_id, character_name, created_at FROM users WHERE character_id = ?")
      .bind(characterId)
      .first();
    return row ? mapUserRow(row) : null;
  }

  async function createUser(params) {
    requireObject(params, "createUser argument");
    const { characterId, characterName } = params;
    requirePositiveInt(characterId, "characterId");
    requireNonEmptyString(characterName, "characterName");
    // RETURNING hands back the server-assigned id and default created_at
    // in one round trip instead of insert-then-select.
    const row = await d1
      .prepare(
        "INSERT INTO users (character_id, character_name) VALUES (?, ?) RETURNING id, character_id, character_name, created_at"
      )
      .bind(characterId, characterName)
      .first();
    if (!row) throw new Error("createUser: insert did not return the created row");
    return mapUserRow(row);
  }

  async function saveEsiTokens(params) {
    requireObject(params, "saveEsiTokens argument");
    const { userId, accessTokenSealed, refreshTokenSealed, expiresAt, scopes } = params;
    requirePositiveInt(userId, "userId");
    requireNonEmptyString(accessTokenSealed, "accessTokenSealed");
    requireNonEmptyString(refreshTokenSealed, "refreshTokenSealed");
    requireInt(expiresAt, "expiresAt");
    requireScopes(scopes, "scopes");
    // scopes stored as JSON text rather than a space-joined string so the
    // exact list round-trips without depending on ESI's delimiter choice.
    await d1
      .prepare(
        `INSERT INTO esi_tokens (user_id, access_token_sealed, refresh_token_sealed, expires_at, scopes)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           access_token_sealed = excluded.access_token_sealed,
           refresh_token_sealed = excluded.refresh_token_sealed,
           expires_at = excluded.expires_at,
           scopes = excluded.scopes`
      )
      .bind(userId, accessTokenSealed, refreshTokenSealed, expiresAt, JSON.stringify(scopes))
      .run();
  }

  async function getEsiTokens(userId) {
    requirePositiveInt(userId, "userId");
    const row = await d1
      .prepare(
        "SELECT user_id, access_token_sealed, refresh_token_sealed, expires_at, scopes FROM esi_tokens WHERE user_id = ?"
      )
      .bind(userId)
      .first();
    return row ? mapEsiTokensRow(row) : null;
  }

  // saveAiSettings — provider-agnostic settings save (ROADMAP.md, 2026-08-05
  // "provider-agnostic analyst" decision). gemini_key_sealed keeps holding
  // the sealed key regardless of provider (see migrations/0002_ai_provider.sql's
  // comment: historical name, not a Gemini-only claim); gemini_model is kept
  // non-null (its NOT NULL constraint predates this migration and isn't
  // being dropped) while ai_model becomes the provider-agnostic source of
  // truth that getSettings prefers.
  async function saveAiSettings(params) {
    requireObject(params, "saveAiSettings argument");
    const { userId, aiKeySealed, aiProvider = "gemini", aiBaseUrl = null, aiModel = null } = params;
    requirePositiveInt(userId, "userId");
    requireStringOrNull(aiKeySealed, "aiKeySealed");
    requireNonEmptyString(aiProvider, "aiProvider");
    requireStringOrNull(aiBaseUrl, "aiBaseUrl");
    requireStringOrNull(aiModel, "aiModel");
    const legacyModel = aiModel ?? "gemini-2.5-flash";
    await d1
      .prepare(
        `INSERT INTO user_settings (user_id, gemini_key_sealed, gemini_model, ai_provider, ai_base_url, ai_model)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           gemini_key_sealed = excluded.gemini_key_sealed,
           gemini_model = excluded.gemini_model,
           ai_provider = excluded.ai_provider,
           ai_base_url = excluded.ai_base_url,
           ai_model = excluded.ai_model`
      )
      .bind(userId, aiKeySealed, legacyModel, aiProvider, aiBaseUrl, aiModel)
      .run();
  }

  // saveGeminiKey — kept as a thin delegate to saveAiSettings (same upsert
  // path) so callers written before provider-agnosticism keep working
  // unmodified; new code should prefer saveAiSettings directly.
  async function saveGeminiKey(params) {
    requireObject(params, "saveGeminiKey argument");
    const { userId, geminiKeySealed, geminiModel = "gemini-2.5-flash" } = params;
    requireNonEmptyString(geminiModel, "geminiModel");
    return saveAiSettings({
      userId,
      aiKeySealed: geminiKeySealed,
      aiProvider: "gemini",
      aiBaseUrl: null,
      aiModel: geminiModel,
    });
  }

  async function getSettings(userId) {
    requirePositiveInt(userId, "userId");
    const row = await d1
      .prepare(
        "SELECT user_id, gemini_key_sealed, gemini_model, ai_provider, ai_base_url, ai_model FROM user_settings WHERE user_id = ?"
      )
      .bind(userId)
      .first();
    // No settings row exists until saveGeminiKey/saveAiSettings is called
    // once; callers that want defaulted values apply their own default over
    // null.
    return row ? mapSettingsRow(row) : null;
  }

  async function mintMcpToken(params) {
    requireObject(params, "mintMcpToken argument");
    const { userId, tokenHash, label } = params;
    requirePositiveInt(userId, "userId");
    requireNonEmptyString(tokenHash, "tokenHash");
    requireNonEmptyString(label, "label");
    const row = await d1
      .prepare(
        "INSERT INTO mcp_tokens (user_id, token_hash, label) VALUES (?, ?, ?) RETURNING id, user_id, token_hash, label, created_at, revoked_at"
      )
      .bind(userId, tokenHash, label)
      .first();
    if (!row) throw new Error("mintMcpToken: insert did not return the created row");
    return mapMcpTokenRow(row);
  }

  async function findUserByMcpTokenHash(tokenHash) {
    requireNonEmptyString(tokenHash, "tokenHash");
    const tokenRow = await d1
      .prepare("SELECT user_id FROM mcp_tokens WHERE token_hash = ? AND revoked_at IS NULL")
      .bind(tokenHash)
      .first();
    if (!tokenRow) return null;
    const userRow = await d1
      .prepare("SELECT id, character_id, character_name, created_at FROM users WHERE id = ?")
      .bind(tokenRow.user_id)
      .first();
    return userRow ? mapUserRow(userRow) : null;
  }

  async function revokeMcpToken(params) {
    requireObject(params, "revokeMcpToken argument");
    const { userId, id } = params;
    requirePositiveInt(userId, "userId");
    requirePositiveInt(id, "id");
    const row = await d1
      .prepare(
        "UPDATE mcp_tokens SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL RETURNING id"
      )
      .bind(new Date().toISOString(), id, userId)
      .first();
    return row !== null;
  }

  async function listMcpTokens(userId) {
    requirePositiveInt(userId, "userId");
    const result = await d1
      .prepare(
        "SELECT id, user_id, label, created_at, revoked_at FROM mcp_tokens WHERE user_id = ? ORDER BY created_at DESC"
      )
      .bind(userId)
      .all();
    return (result.results ?? []).map(mapMcpTokenListRow);
  }

  async function saveObservation(params) {
    requireObject(params, "saveObservation argument");
    const { userId, kind, path, paramsJson, status, bodyJson, expiresAt, recordedAt } = params;
    requirePositiveInt(userId, "userId");
    requireNonEmptyString(kind, "kind");
    requireNonEmptyString(path, "path");
    requireNonEmptyString(paramsJson, "paramsJson");
    requireInt(status, "status");
    requireNonEmptyString(bodyJson, "bodyJson");
    requireIntOrNull(expiresAt, "expiresAt");
    requireInt(recordedAt, "recordedAt");
    const row = await d1
      .prepare(
        `INSERT INTO observations (user_id, kind, path, params_json, status, body_json, expires_at, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id, user_id, kind, path, params_json, status, body_json, expires_at, recorded_at`
      )
      .bind(userId, kind, path, paramsJson, status, bodyJson, expiresAt, recordedAt)
      .first();
    if (!row) throw new Error("saveObservation: insert did not return the created row");
    return mapObservationRow(row);
  }

  async function getFreshObservation(params) {
    requireObject(params, "getFreshObservation argument");
    const { userId, kind, path, paramsJson, now } = params;
    requirePositiveInt(userId, "userId");
    requireNonEmptyString(kind, "kind");
    requireNonEmptyString(path, "path");
    requireNonEmptyString(paramsJson, "paramsJson");
    requireInt(now, "now");
    const row = await d1
      .prepare(
        `SELECT id, user_id, kind, path, params_json, status, body_json, expires_at, recorded_at
         FROM observations
         WHERE user_id = ? AND kind = ? AND path = ? AND params_json = ?
         ORDER BY recorded_at DESC
         LIMIT 1`
      )
      .bind(userId, kind, path, paramsJson)
      .first();
    if (!row) return null;
    if (row.expires_at !== null && row.expires_at !== undefined && row.expires_at < now) return null;
    return mapObservationRow(row);
  }

  async function appendChatMessage(params) {
    requireObject(params, "appendChatMessage argument");
    const { userId, threadId, role, contentJson } = params;
    requirePositiveInt(userId, "userId");
    requireNonEmptyString(threadId, "threadId");
    requireNonEmptyString(role, "role");
    requireNonEmptyString(contentJson, "contentJson");
    const row = await d1
      .prepare(
        "INSERT INTO chat_messages (user_id, thread_id, role, content_json) VALUES (?, ?, ?, ?) RETURNING id, user_id, thread_id, role, content_json, created_at"
      )
      .bind(userId, threadId, role, contentJson)
      .first();
    if (!row) throw new Error("appendChatMessage: insert did not return the created row");
    return mapChatMessageRow(row);
  }

  async function getChatMessages(params) {
    requireObject(params, "getChatMessages argument");
    const { userId, threadId, limit = 50 } = params;
    requirePositiveInt(userId, "userId");
    requireNonEmptyString(threadId, "threadId");
    requirePositiveInt(limit, "limit");
    // Fetch the most recent `limit` rows newest-first, then reverse to
    // chronological order for display/replay into the analyst loop.
    const result = await d1
      .prepare(
        "SELECT id, user_id, thread_id, role, content_json, created_at FROM chat_messages WHERE user_id = ? AND thread_id = ? ORDER BY id DESC LIMIT ?"
      )
      .bind(userId, threadId, limit)
      .all();
    return (result.results ?? []).map(mapChatMessageRow).reverse();
  }

  return {
    getUserByCharacterId,
    createUser,
    saveEsiTokens,
    getEsiTokens,
    saveGeminiKey,
    saveAiSettings,
    getSettings,
    mintMcpToken,
    findUserByMcpTokenHash,
    revokeMcpToken,
    listMcpTokens,
    saveObservation,
    getFreshObservation,
    appendChatMessage,
    getChatMessages,
  };
}
