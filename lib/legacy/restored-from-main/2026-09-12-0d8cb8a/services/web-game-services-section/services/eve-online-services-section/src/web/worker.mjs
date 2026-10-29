// EVE Assist Worker entry: session-cookie-authed GUI/API, EVE SSO login,
// SSE chat, and a bearer-token MCP endpoint. createEveAssistWorker() takes
// no constructor args (pinned contract) — network calls go through the
// real global fetch/Date.now. Route handlers dispatch by plain
// (method, pathname) switch, no router framework.

import { buildAuthorizationUrl, exchangeAuthorizationCode, refreshAccessToken, decodeAccessToken, randomState } from "../sso/eve-sso.mjs";
import { sealSecret, openSecret, hashToken } from "@red-cup-engineering/personal-intelligence-systems-services-section/crypto";
import { createStore } from "../db/store.mjs";
import { createEsiClient } from "../esi/esi-client.mjs";
import { createNameResolver } from "../esi/name-resolver.mjs";
import { getTool, runTool as runRegistryTool, toolRegistry, ToolError } from "../tools/registry.mjs";
import { runAnalystTurn } from "@red-cup-engineering/personal-intelligence-systems-services-section/chat";
import { getProvider } from "@red-cup-engineering/personal-intelligence-systems-services-section/chat/providers";
import { buildSystemInstruction } from "../chat/system-instruction.mjs";
import { createSessionCookie, readSession, SESSION_COOKIE_NAME } from "@red-cup-engineering/personal-intelligence-systems-services-section/web/session";
import { renderLineChart, renderSparkline } from "../charting/charts.mjs";

// Pinned ESI scopes v1 (ROADMAP.md / cross-module contract) — order is not
// meaningful but is kept stable so authorization URLs are diff-stable.
const ESI_SCOPES = [
  "esi-wallet.read_character_wallet.v1",
  "esi-skills.read_skills.v1",
  "esi-skills.read_skillqueue.v1",
  "esi-location.read_location.v1",
  "esi-location.read_ship_type.v1",
  "esi-assets.read_assets.v1",
  "esi-markets.read_character_orders.v1",
  "esi-clones.read_clones.v1",
];

const STATE_COOKIE_NAME = "eve_assist_state";
const STATE_COOKIE_TTL_SECONDS = 600;

// Human-readable hint appended to the 400 body when a submitted key fails
// its provider's keyLooksValid check, so the settings-page error message
// names the expected shape without ever echoing what was actually typed.
function keyFormatHint(providerId) {
  switch (providerId) {
    case "gemini":
      return "an AIza... or AQ.... Google AI Studio key";
    case "anthropic":
      return "an sk-ant-... Anthropic key";
    case "openai-compatible":
      return "a provider API key (at least 20 characters, no whitespace)";
    default:
      return "a valid API key";
  }
}

// How many recent wallet-journal entries GET /api/charts/wallet-sparkline
// pulls (via the get_wallet_journal tool) to plot a balance trend from.
const WALLET_SPARKLINE_LIMIT = 100;

// Workers' free plan caps one invocation at 50 external subrequests; this
// soft budget throws before that hard cap, so a tool handler that fetches
// too much fails clean instead of the platform killing the invocation
// mid-stream. 40, not 50: headroom for non-tool subrequests (the AI
// provider's own HTTP call in apiChat is not funneled through this counter).
const SUBREQUEST_BUDGET = 40;

// Wraps fetchImpl with a per-ctx counter. Every tool-context fetch --
// ESI calls (via createEsiClient), the batch name resolver (also goes
// through the ESI client's fetchImpl), and ad hoc fetches tool handlers make
// directly off ctx.fetchImpl (e.g. market-tools.mjs's zKillboard lookup) --
// all share the one wrapped function returned from buildToolCtx, so they all
// count against the same budget. The thrown message is deliberately
// greppable (`grep -r "subrequest budget exhausted"`) for anyone debugging a
// truncated invocation later.
function createBudgetedFetch(fetchImpl, limit) {
  let count = 0;
  return async (...args) => {
    if (count >= limit) {
      throw new Error(`subrequest budget exhausted (${limit})`);
    }
    count += 1;
    return fetchImpl(...args);
  };
}

// Maps a thrown ToolError's `code` (the upstream tools package and every
// tool module's own codes) to an HTTP status for the generic
// POST /api/tools/{name} front door and the /api/charts, /api/ledger routes
// built on top of the same tool handlers. Only "unknown_tool" -> 404 and
// "invalid_args" -> 400 are pinned by the integration brief; every other
// code gets a defensible default below rather than falling through to a
// bare 500 for everything.
function statusForToolError(err) {
  switch (err.code) {
    case "unknown_tool":
    case "no_route":
      return 404;
    case "invalid_args":
    case "bad_args":
    case "invalid_argument":
      return 400;
    case "missing_scope":
      return 403; // character hasn't granted the ESI scope this tool needs
    case "tool_failed":
      return 502; // the underlying ESI/upstream call itself failed
    default:
      return 500;
  }
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function parseCookies(cookieHeader) {
  const out = {};
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) return out;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) out[name] = value;
  }
  return out;
}

function requireEnv(env, keys) {
  for (const key of keys) {
    if (typeof env?.[key] !== "string" || env[key].length === 0) {
      throw new Error(`worker: missing required env binding "${key}"`);
    }
  }
}

function json(body, status = 200, headersInit) {
  const headers = new Headers({ "content-type": "application/json" });
  if (headersInit) {
    for (const [key, value] of headersInit.entries()) headers.append(key, value);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function jsonRpcAuthError(status, message) {
  return json({ jsonrpc: "2.0", id: null, error: { code: -32001, message } }, status);
}

// store.mjs's pinned contract has no getUserById-style lookup, and readSession
// only carries userId — every /api/* and /mcp route still needs characterId.
// The users table columns are pinned in migrations/0001_init.sql, so this
// queries D1 directly rather than unilaterally widening store.mjs's surface.
// Flagged in the handoff report for the db agent to consider adding a real
// store method; switch to it once available.
async function getUserRow(env, userId) {
  const row = await env.DB.prepare(
    "SELECT id, character_id AS characterId, character_name AS characterName FROM users WHERE id = ?",
  ).bind(userId).first();
  return row ?? null;
}

/**
 * Ensure the user's ESI access token is fresh, refreshing (and resealing)
 * when it expires within 60s. Exported for direct testing; deps is an
 * injected {fetchImpl, now} pair used only by tests — production call sites
 * omit it and get real fetch/Date.now.
 */
export async function getFreshAccessToken(env, store, userId, deps = {}) {
  if (typeof userId !== "number") {
    throw new TypeError("getFreshAccessToken: userId must be a number");
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => Date.now());

  const tokens = await store.getEsiTokens(userId);
  if (!tokens) {
    throw new Error(`getFreshAccessToken: no ESI tokens saved for user ${userId}`);
  }
  if (tokens.expiresAt - now() > 60_000) {
    return openSecret(tokens.accessTokenSealed, env.SEAL_KEY);
  }

  const refreshToken = await openSecret(tokens.refreshTokenSealed, env.SEAL_KEY);
  const refreshed = await refreshAccessToken({
    refreshToken,
    clientId: env.EVE_SSO_CLIENT_ID,
    clientSecret: env.EVE_SSO_CLIENT_SECRET,
    fetchImpl,
  });
  const [accessTokenSealed, refreshTokenSealed] = await Promise.all([
    sealSecret(refreshed.accessToken, env.SEAL_KEY),
    sealSecret(refreshed.refreshToken, env.SEAL_KEY),
  ]);
  await store.saveEsiTokens({
    userId,
    accessTokenSealed,
    refreshTokenSealed,
    expiresAt: refreshed.expiresAt,
    scopes: tokens.scopes,
  });
  return refreshed.accessToken;
}

async function buildToolCtx(env, store, userId, characterId, deps = {}) {
  // Budget-wrapped once, here, so it covers everything downstream: the
  // token-refresh fetch below, every ESI call, the batch name resolver, and
  // any tool's own direct ctx.fetchImpl use -- one counter per ctx, and one
  // ctx per invocation (buildToolCtx is called once per chat turn / MCP
  // request / dashboard load).
  const fetchImpl = createBudgetedFetch(deps.fetchImpl ?? fetch, SUBREQUEST_BUDGET);
  const now = deps.now ?? (() => Date.now());
  const accessToken = await getFreshAccessToken(env, store, userId, { fetchImpl, now });
  const esi = createEsiClient({ fetchImpl, userAgent: env.EVE_USER_AGENT, now });
  // One resolver per ctx (per invocation): memoization and the observation
  // dedup rule in name-resolver.mjs are only correct scoped to a single
  // chat turn / MCP request, never shared across users or turns.
  const names = createNameResolver({ esi });
  return { esi, store, userId, characterId, accessToken, fetchImpl, now, names };
}

async function runTool(name, ctx, args) {
  // Delegates to registry.mjs's own runTool so dashboard composition gets
  // the same arg validation + ToolError-wrapping every other caller (the
  // analyst loop, MCP) gets, instead of calling tool.handler directly here.
  return runRegistryTool({ name, args, ctx });
}

// --- /auth/* -----------------------------------------------------------

async function handleLogin(env) {
  requireEnv(env, ["EVE_SSO_CLIENT_ID", "PUBLIC_URL"]);
  const state = randomState();
  const authorizationUrl = buildAuthorizationUrl({
    clientId: env.EVE_SSO_CLIENT_ID,
    redirectUri: `${env.PUBLIC_URL}/auth/callback`,
    scopes: ESI_SCOPES,
    state,
  });
  const headers = new Headers({ location: authorizationUrl });
  headers.append(
    "set-cookie",
    `${STATE_COOKIE_NAME}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${STATE_COOKIE_TTL_SECONDS}`,
  );
  return new Response(null, { status: 302, headers });
}

async function handleCallback(request, env) {
  requireEnv(env, ["EVE_SSO_CLIENT_ID", "EVE_SSO_CLIENT_SECRET", "PUBLIC_URL", "SEAL_KEY", "SESSION_SECRET"]);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return json({ error: "missing code or state" }, 400);

  const cookies = parseCookies(request.headers.get("cookie"));
  if (!cookies[STATE_COOKIE_NAME] || cookies[STATE_COOKIE_NAME] !== state) {
    return json({ error: "invalid or expired state" }, 400);
  }

  const tokenResponse = await exchangeAuthorizationCode({
    code,
    clientId: env.EVE_SSO_CLIENT_ID,
    clientSecret: env.EVE_SSO_CLIENT_SECRET,
    fetchImpl: fetch,
  });
  const decoded = decodeAccessToken(tokenResponse.accessToken);

  const store = createStore(env.DB);
  let user = await store.getUserByCharacterId(decoded.characterId);
  if (!user) {
    user = await store.createUser({ characterId: decoded.characterId, characterName: decoded.characterName });
  }

  const [accessTokenSealed, refreshTokenSealed] = await Promise.all([
    sealSecret(tokenResponse.accessToken, env.SEAL_KEY),
    sealSecret(tokenResponse.refreshToken, env.SEAL_KEY),
  ]);
  await store.saveEsiTokens({
    userId: user.id,
    accessTokenSealed,
    refreshTokenSealed,
    expiresAt: tokenResponse.expiresAt,
    // store.mjs's saveEsiTokens stores scopes as a JSON array (requireScopes),
    // not a joined string — decodeAccessToken's `scopes` is already that array.
    scopes: decoded.scopes,
  });

  const sessionCookie = await createSessionCookie({ userId: user.id, secret: env.SESSION_SECRET, now: () => Date.now() });
  const headers = new Headers({ location: "/dashboard.html" });
  headers.append("set-cookie", sessionCookie);
  headers.append("set-cookie", `${STATE_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
  return new Response(null, { status: 302, headers });
}

function handleLogout() {
  const headers = new Headers();
  headers.append("set-cookie", `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
  return json({ ok: true }, 200, headers);
}

// --- /api/* --------------------------------------------------------------

async function apiMe(env, store, session) {
  const userRow = await getUserRow(env, session.userId);
  if (!userRow) return json({ error: "user not found" }, 404);
  const settings = await store.getSettings(session.userId).catch(() => null);
  const hasAiKey = Boolean(settings?.aiKeySealed);
  return json({
    userId: session.userId,
    characterId: userRow.characterId,
    characterName: userRow.characterName,
    hasAiKey,
    // Mirrors hasAiKey — kept so any client still reading the pre-refactor
    // field name (public/chat.js, public/settings.js, before they're
    // updated in lockstep) does not silently see AI chat as always locked.
    hasGeminiKey: hasAiKey,
  });
}

async function apiDashboard(env, store, session) {
  const userRow = await getUserRow(env, session.userId);
  if (!userRow) return json({ error: "user not found" }, 404);
  const ctx = await buildToolCtx(env, store, session.userId, userRow.characterId);
  const [character, skillQueue, serverStatus] = await Promise.all([
    runTool("get_character_overview", ctx, {}),
    runTool("get_skill_queue", ctx, {}),
    runTool("get_server_status", ctx, {}),
  ]);
  return json({
    character: character.data,
    skillQueue: skillQueue.data,
    serverStatus: serverStatus.data,
    generatedAt: Date.now(),
  });
}

// POST /api/settings/gemini-key — path name is historical (kept stable for
// existing clients/bookmarked docs) but the body now accepts any provider:
// { key, provider?, baseUrl?, model? }. provider defaults to "gemini" so
// old callers that only ever sent { key, model } keep working unchanged.
async function apiSaveGeminiKey(request, env, store, session) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const providerId = typeof body?.provider === "string" && body.provider.length > 0 ? body.provider : "gemini";
  let adapter;
  try {
    adapter = getProvider(providerId);
  } catch {
    return json({ error: `unknown AI provider "${providerId}"` }, 400);
  }

  if (typeof body?.key !== "string" || !adapter.keyLooksValid(body.key)) {
    // Never echo the submitted key — only name which check failed.
    return json({ error: `${adapter.id} key must look like ${keyFormatHint(adapter.id)}` }, 400);
  }

  let baseUrl = null;
  if (adapter.id === "openai-compatible") {
    if (typeof body?.baseUrl !== "string" || body.baseUrl.length === 0) {
      return json({ error: "baseUrl is required for the openai-compatible provider" }, 400);
    }
    if (!/^https:\/\//u.test(body.baseUrl) || body.baseUrl.endsWith("/")) {
      return json({ error: "baseUrl must start with https:// and must not have a trailing slash" }, 400);
    }
    baseUrl = body.baseUrl;
  }

  const model = typeof body.model === "string" && body.model.length > 0 ? body.model : adapter.defaultModel;
  const aiKeySealed = await sealSecret(body.key, env.SEAL_KEY);
  await store.saveAiSettings({ userId: session.userId, aiKeySealed, aiProvider: adapter.id, aiBaseUrl: baseUrl, aiModel: model });
  return json({ ok: true });
}

async function apiListMcpTokens(store, session) {
  const rows = await store.listMcpTokens(session.userId);
  return json({ tokens: (rows ?? []).map(({ tokenHash, ...rest }) => rest) });
}

async function apiMintMcpToken(request, store, session) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  if (typeof body?.label !== "string" || body.label.trim().length === 0) {
    return json({ error: "label is required" }, 400);
  }
  const token = `eva_${base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))}`;
  const tokenHash = await hashToken(token);
  const label = body.label.trim();
  const created = await store.mintMcpToken({ userId: session.userId, tokenHash, label });
  // Raw token is returned exactly once here; only its hash is ever stored.
  return json({ token, label, id: created?.id ?? null });
}

async function apiRevokeMcpToken(request, store, session) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return json({ error: "id must be an integer" }, 400);
  await store.revokeMcpToken({ userId: session.userId, id });
  return json({ ok: true });
}

function sseResponse(eventSource) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of eventSource) {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        }
      } catch (error) {
        const failure = { type: "error", message: error?.message ?? String(error) };
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(failure)}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
    },
  });
}

// Wraps runAnalystTurn to persist the conversation once it settles, without
// altering the event stream a client sees (the SSE wire mirrors these events
// 1:1, so persistence must be a side effect only on "done", never a frame).
async function* driveChat({ store, userId, threadId, priorCount, ...turnArgs }) {
  for await (const event of runAnalystTurn(turnArgs)) {
    yield event;
    if (event.type === "done" && Array.isArray(event.history)) {
      for (let i = priorCount; i < event.history.length; i += 1) {
        const item = event.history[i];
        await store.appendChatMessage({
          userId,
          threadId,
          role: typeof item?.role === "string" ? item.role : "model",
          contentJson: JSON.stringify(item),
        });
      }
    }
  }
}

async function apiChat(request, env, store, session) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  if (typeof body?.threadId !== "string" || body.threadId.length === 0) {
    return json({ error: "threadId is required" }, 400);
  }
  if (typeof body?.text !== "string" || body.text.trim().length === 0) {
    return json({ error: "text is required" }, 400);
  }

  const settings = await store.getSettings(session.userId);
  if (!settings?.aiKeySealed) {
    return json({ error: "no AI key configured; add one in settings" }, 400);
  }
  const userRow = await getUserRow(env, session.userId);
  if (!userRow) return json({ error: "user not found" }, 404);

  const apiKey = await openSecret(settings.aiKeySealed, env.SEAL_KEY);
  const priorRows = await store.getChatMessages({ userId: session.userId, threadId: body.threadId, limit: 200 });
  const history = (priorRows ?? []).map((row) => JSON.parse(row.contentJson));
  const ctx = await buildToolCtx(env, store, session.userId, userRow.characterId);

  const eventSource = driveChat({
    store,
    userId: session.userId,
    threadId: body.threadId,
    priorCount: history.length,
    provider: settings.aiProvider,
    baseUrl: settings.aiBaseUrl ?? undefined,
    apiKey,
    model: settings.aiModel,
    history,
    userText: body.text,
    ctx,
    fetchImpl: fetch,
    toolRegistry,
    systemInstruction: buildSystemInstruction(),
  });
  return sseResponse(eventSource);
}

// --- Generic tool invocation, chart, and ledger-export routes -------------
//
// These share one shape of work: resolve the session's character, build a
// tool ctx, run something through the registry (directly for
// /api/tools/{name}, or via a specific tool for the chart/ledger routes),
// and turn a thrown ToolError into the right HTTP status instead of letting
// it fall into the top-level catch-all 500.

async function apiToolInvoke(request, env, store, session, toolName) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  const userRow = await getUserRow(env, session.userId);
  if (!userRow) return json({ error: "user not found" }, 404);
  const ctx = await buildToolCtx(env, store, session.userId, userRow.characterId);
  try {
    const result = await runTool(toolName, ctx, body?.args ?? {});
    return json(result);
  } catch (err) {
    if (err instanceof ToolError) {
      return json({ error: err.message, code: err.code }, statusForToolError(err));
    }
    throw err;
  }
}

// Renders a line chart of a type's recent daily average price in a region.
// Goes through the get_market_history tool (not a raw ESI call) so this
// route sees exactly the same series a chat/MCP caller of that tool would
// (see market-tools.mjs's `data.series`, added for this purpose).
async function apiChartMarketHistory(request, env, store, session) {
  const url = new URL(request.url);
  const regionId = Number(url.searchParams.get("regionId"));
  const typeId = Number(url.searchParams.get("typeId"));
  if (!Number.isInteger(regionId) || regionId <= 0 || !Number.isInteger(typeId) || typeId <= 0) {
    return json({ error: "regionId and typeId query params are required positive integers" }, 400);
  }
  const userRow = await getUserRow(env, session.userId);
  if (!userRow) return json({ error: "user not found" }, 404);
  const ctx = await buildToolCtx(env, store, session.userId, userRow.characterId);

  let result;
  try {
    result = await runTool("get_market_history", ctx, { regionId, typeId });
  } catch (err) {
    if (err instanceof ToolError) {
      return json({ error: err.message, code: err.code }, statusForToolError(err));
    }
    throw err;
  }

  const series = Array.isArray(result.data?.series) ? result.data.series : [];
  if (series.length < 2) {
    return json({ error: "not enough market history to render a chart" }, 404);
  }
  const svg = renderLineChart({
    series: [{ label: "Average price", points: series.map((row) => ({ x: row.date, y: row.average })) }],
    xIsTime: true,
    yLabel: "ISK",
  });
  return new Response(svg, {
    status: 200,
    headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=300" },
  });
}

// Renders a sparkline of the character's wallet balance across their most
// recent journal entries (oldest -> newest, per renderSparkline's contract).
async function apiChartWalletSparkline(env, store, session) {
  const userRow = await getUserRow(env, session.userId);
  if (!userRow) return json({ error: "user not found" }, 404);
  const ctx = await buildToolCtx(env, store, session.userId, userRow.characterId);

  let result;
  try {
    result = await runTool("get_wallet_journal", ctx, { limit: WALLET_SPARKLINE_LIMIT });
  } catch (err) {
    if (err instanceof ToolError) {
      return json({ error: err.message, code: err.code }, statusForToolError(err));
    }
    throw err;
  }

  const entries = Array.isArray(result.data?.entries) ? result.data.entries : [];
  // get_wallet_journal's entries are newest-first; a sparkline reads
  // left-to-right as oldest-to-newest, so reverse before extracting.
  const points = [...entries]
    .reverse()
    .map((entry) => entry.balance)
    .filter((v) => typeof v === "number" && Number.isFinite(v));
  if (points.length < 2) {
    return json({ error: "not enough wallet history to render a sparkline" }, 404);
  }
  const svg = renderSparkline({ points });
  return new Response(svg, {
    status: 200,
    headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=300" },
  });
}

async function apiLedgerExport(request, env, store, session) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  if (format !== "beancount" && format !== "hledger") {
    return json({ error: 'format query param must be "beancount" or "hledger"' }, 400);
  }
  const userRow = await getUserRow(env, session.userId);
  if (!userRow) return json({ error: "user not found" }, 404);
  const ctx = await buildToolCtx(env, store, session.userId, userRow.characterId);

  let result;
  try {
    result = await runTool("export_wallet_ledger", ctx, { format });
  } catch (err) {
    if (err instanceof ToolError) {
      return json({ error: err.message, code: err.code }, statusForToolError(err));
    }
    throw err;
  }

  const filename = `eve-wallet.${format === "beancount" ? "beancount" : "journal"}`;
  return new Response(result.data.text, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function handleApi(request, env, pathname) {
  const session = await readSession(request, env.SESSION_SECRET, () => Date.now());
  if (!session) return json({ error: "unauthorized" }, 401);

  const store = createStore(env.DB);
  const method = request.method;

  if (method === "GET" && pathname === "/api/me") return apiMe(env, store, session);
  if (method === "GET" && pathname === "/api/dashboard") return apiDashboard(env, store, session);
  if (method === "POST" && pathname === "/api/settings/gemini-key") return apiSaveGeminiKey(request, env, store, session);
  if (method === "GET" && pathname === "/api/settings/mcp-tokens") return apiListMcpTokens(store, session);
  if (method === "POST" && pathname === "/api/settings/mcp-tokens") return apiMintMcpToken(request, store, session);
  if (method === "POST" && pathname === "/api/settings/mcp-tokens/revoke") return apiRevokeMcpToken(request, store, session);
  if (method === "POST" && pathname === "/api/chat") return apiChat(request, env, store, session);
  if (method === "GET" && pathname === "/api/charts/market-history") return apiChartMarketHistory(request, env, store, session);
  if (method === "GET" && pathname === "/api/charts/wallet-sparkline") return apiChartWalletSparkline(env, store, session);
  if (method === "GET" && pathname === "/api/ledger/export") return apiLedgerExport(request, env, store, session);
  if (method === "POST" && pathname.startsWith("/api/tools/")) {
    const toolName = decodeURIComponent(pathname.slice("/api/tools/".length));
    if (toolName.length === 0) return json({ error: "missing tool name" }, 400);
    return apiToolInvoke(request, env, store, session, toolName);
  }

  return json({ error: "not found" }, 404);
}

// --- /mcp ------------------------------------------------------------------

async function handleMcp(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
      },
    });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/iu.exec(authHeader);
  if (!match) return jsonRpcAuthError(401, "unauthorized: missing bearer token");

  const store = createStore(env.DB);
  const tokenHash = await hashToken(match[1].trim());
  const user = await store.findUserByMcpTokenHash(tokenHash);
  if (!user) return jsonRpcAuthError(401, "unauthorized: unknown or revoked token");

  const userId = user.id ?? user.userId;
  let characterId = user.characterId;
  if (characterId === undefined || characterId === null) {
    const row = await getUserRow(env, userId);
    characterId = row?.characterId;
  }

  // handleMcpRequest moved upstream 2026-09-05 (Gig Assist spec §i);
  // imported dynamically to keep this module's static import list stable.
  const { handleMcpRequest } = await import("@red-cup-engineering/personal-intelligence-systems-services-section/mcp");
  return handleMcpRequest(request, {
    registry: { toolRegistry, getTool },
    ctxFactory: () => buildToolCtx(env, store, userId, characterId),
    serverInfo: { name: "eve-assist", version: "0.1.0" },
  });
}

// --- entry -------------------------------------------------------------

export function createEveAssistWorker() {
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      // Trailing-slash variants of worker routes must never fall through to
      // the asset layer's 404 (registered OAuth callbacks and hand-typed
      // URLs both arrive with variant paths).
      const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
      try {
        if (request.method === "GET" && pathname === "/auth/login") return await handleLogin(env);
        if (request.method === "GET" && pathname === "/auth/callback") return await handleCallback(request, env);
        if (request.method === "POST" && pathname === "/auth/logout") return handleLogout();
        if (pathname === "/mcp") return await handleMcp(request, env);
        if (pathname.startsWith("/api/")) return await handleApi(request, env, pathname);
        return await env.ASSETS.fetch(request);
      } catch (error) {
        return json({ error: error?.message ?? "internal error" }, 500);
      }
    },
  };
}
