import test from "node:test";
import assert from "node:assert/strict";
import { createEveAssistWorker } from "../src/web/worker.mjs";
import { createSessionCookie, SESSION_COOKIE_NAME } from "@red-cup-engineering/personal-intelligence-systems-services-section/web/session";
import { generateKeyBase64, sealSecret } from "@red-cup-engineering/personal-intelligence-systems-services-section/crypto";
import { createStore } from "../src/db/store.mjs";

// Minimal inline fake D1: a small in-memory table store interpreting just
// enough SQL shape to exercise store.mjs's real queries. INSERT assigns an
// autoincrement id keyed by literal column names; SELECT matches col = ?
// positionally plus one literal IS NULL check (mcp_tokens.revoked_at);
// UPDATE is unneeded here and left unimplemented.
function createFakeD1() {
  const tables = new Map();
  let nextId = 1;

  function rowsFor(name) {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name);
  }

  function parseInsert(sql) {
    const match = /insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/iu.exec(sql);
    if (!match) return null;
    return { table: match[1], columns: match[2].split(",").map((c) => c.trim()) };
  }

  function tableName(sql) {
    return /(?:from|update)\s+(\w+)/iu.exec(sql)?.[1] ?? null;
  }

  // src/web/worker.mjs's getUserRow queries D1 directly (not through
  // store.mjs) with an aliased column list (`character_id AS characterId`),
  // which real D1/SQLite projects and renames; this fake only stored rows
  // under their snake_case column names, so without this it silently
  // returned `undefined` for every aliased column. Parses a top-level
  // `SELECT a, b AS c FROM ...` list and reprojects the raw stored row onto
  // exactly those output keys, applying any `AS alias`.
  function parseSelectColumns(sql) {
    const match = /^\s*select\s+(.+?)\s+from\s+/isu.exec(sql);
    if (!match) return null;
    return match[1].split(",").map((raw) => {
      const part = raw.trim();
      const aliasMatch = /^(\w+)\s+as\s+(\w+)$/iu.exec(part);
      return aliasMatch ? { column: aliasMatch[1], alias: aliasMatch[2] } : { column: part, alias: part };
    });
  }

  function projectRow(row, sql) {
    if (!row) return row;
    const columns = parseSelectColumns(sql);
    if (!columns || columns.some((c) => c.column === "*")) return row;
    const projected = {};
    for (const { column, alias } of columns) projected[alias] = row[column];
    return projected;
  }

  function whereEqualityColumns(sql) {
    const whereClause = /where\s+(.+?)(?:\s+order\s+by|\s+returning|\s+limit|$)/isu.exec(sql)?.[1] ?? "";
    const columns = [];
    const re = /(\w+)\s*=\s*\?/gu;
    let m;
    while ((m = re.exec(whereClause))) columns.push(m[1]);
    return { columns, isNullCheck: /(\w+)\s+is\s+null/iu.exec(whereClause)?.[1] ?? null };
  }

  function matches(row, sql, boundArgs) {
    const { columns, isNullCheck } = whereEqualityColumns(sql);
    for (let i = 0; i < columns.length; i += 1) {
      if (row[columns[i]] !== boundArgs[i]) return false;
    }
    if (isNullCheck && row[isNullCheck] != null) return false;
    return true;
  }

  function insertRow(sql, boundArgs) {
    const insert = parseInsert(sql);
    if (!insert) return null;
    const row = { id: nextId, created_at: new Date().toISOString() };
    nextId += 1;
    insert.columns.forEach((column, i) => {
      row[column] = boundArgs[i];
    });
    rowsFor(insert.table).push(row);
    return row;
  }

  return {
    prepare(sql) {
      let boundArgs = [];
      const statement = {
        bind(...args) {
          boundArgs = args;
          return statement;
        },
        async first() {
          if (/^\s*insert/iu.test(sql)) return insertRow(sql, boundArgs);
          const table = tableName(sql);
          if (!table) return null;
          const row = rowsFor(table).find((r) => matches(r, sql, boundArgs)) ?? null;
          return projectRow(row, sql);
        },
        async all() {
          const table = tableName(sql);
          if (!table) return { results: [] };
          return { results: rowsFor(table).filter((row) => matches(row, sql, boundArgs)).map((row) => projectRow(row, sql)) };
        },
        async run() {
          if (/^\s*insert/iu.test(sql)) {
            const row = insertRow(sql, boundArgs);
            return { success: true, meta: { last_row_id: row.id } };
          }
          return { success: true, meta: { last_row_id: nextId } };
        },
      };
      return statement;
    },
  };
}

function base64UrlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

// A JWT-shaped (but unsigned) access token, exactly as much as
// decodeAccessToken (src/sso/eve-sso.mjs) needs: it deliberately does not
// verify signatures (see that module's why-comment), so a fake signature
// segment is fine here.
function fakeEveAccessToken(payload) {
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const body = base64UrlJson(payload);
  return `${header}.${body}.fake-signature`;
}

function baseEnv(overrides = {}) {
  return {
    DB: createFakeD1(),
    SESSION_SECRET: "unit-test-session-secret",
    SEAL_KEY: generateKeyBase64(),
    EVE_SSO_CLIENT_ID: "test-client-id",
    EVE_SSO_CLIENT_SECRET: "test-client-secret",
    PUBLIC_URL: "https://eve-assist.561.group",
    EVE_USER_AGENT: "EVE Assist (test; contact: morgan.sennhauser@gmail.com)",
    ASSETS: { fetch: async () => new Response("static-asset-stub", { status: 200 }) },
    ...overrides,
  };
}

async function sessionCookieHeaderFor(userId, env) {
  const cookie = await createSessionCookie({ userId, secret: env.SESSION_SECRET, now: () => Date.now() });
  const value = cookie.split(";")[0];
  return value; // "eve_assist_session=<payload>.<sig>"
}

// Seeds a full logged-in user with a saved (unexpired) ESI token pair, for
// tests of routes that call buildToolCtx (the generic tool/chart/ledger
// routes) and therefore need getFreshAccessToken to succeed without a
// refresh round-trip. Returns the session cookie header and the plaintext
// access token that will show up as ctx.accessToken / the fake ESI
// server's Authorization header, so tests can assert on it if needed.
async function seedAuthenticatedUser(env, { characterId = 2118406090, characterName = "Morgan Sennhauser" } = {}) {
  const store = createStore(env.DB);
  const user = await store.createUser({ characterId, characterName });
  const accessToken = "fake-access-token";
  const [accessTokenSealed, refreshTokenSealed] = await Promise.all([
    sealSecret(accessToken, env.SEAL_KEY),
    sealSecret("fake-refresh-token", env.SEAL_KEY),
  ]);
  await store.saveEsiTokens({
    userId: user.id,
    accessTokenSealed,
    refreshTokenSealed,
    expiresAt: Date.now() + 3_600_000,
    scopes: ["esi-wallet.read_character_wallet.v1"],
  });
  const cookieHeader = await sessionCookieHeaderFor(user.id, env);
  return { userId: user.id, characterId, characterName, accessToken, cookieHeader };
}

// Routes a fake ESI response by exact pathname (ignoring query string),
// for tests that mock globalThis.fetch to serve the real esi-client's
// requests (base URL https://esi.evetech.net/latest).
function fakeEsiFetch(routesByPath) {
  return async (input) => {
    // esi-client.mjs calls fetchImpl with a URL instance (from buildUrl),
    // not a string or Request -- handle all three shapes.
    const href = input instanceof URL ? input.href : typeof input === "string" ? input : input.url;
    const url = new URL(href);
    const entry = routesByPath[url.pathname];
    if (!entry) throw new Error(`unexpected ESI fetch in test: ${url.pathname}${url.search}`);
    return new Response(JSON.stringify(entry), { status: 200, headers: { "content-type": "application/json" } });
  };
}

test("GET /auth/login redirects to EVE SSO with pinned scopes and sets a state cookie", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const response = await worker.fetch(new Request("https://eve-assist.561.group/auth/login"), env, {});

  assert.equal(response.status, 302);
  const location = response.headers.get("location");
  assert.ok(location, "expected a Location header");
  const url = new URL(location);
  assert.equal(url.origin, "https://login.eveonline.com");
  assert.equal(url.pathname, "/v2/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), env.EVE_SSO_CLIENT_ID);
  assert.equal(url.searchParams.get("redirect_uri"), `${env.PUBLIC_URL}/auth/callback`);
  const state = url.searchParams.get("state");
  assert.ok(state && state.length > 0, "expected a nonempty state param");

  const setCookie = response.headers.get("set-cookie");
  assert.match(setCookie, /^eve_assist_state=/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Max-Age=600/);
});

test("GET /auth/callback happy path exchanges the code, creates the user, and sets a session cookie", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const state = "test-state-value-1234567890";
  const accessToken = fakeEveAccessToken({
    sub: "CHARACTER:EVE:2116620298",
    name: "Morgan Test",
    scp: ["esi-wallet.read_character_wallet.v1"],
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const href = typeof input === "string" ? input : input.url;
    if (href === "https://login.eveonline.com/v2/oauth/token") {
      return new Response(
        JSON.stringify({ access_token: accessToken, refresh_token: "refresh-token-stub", expires_in: 1200 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error(`unexpected fetch call in test: ${href}`);
  };

  try {
    const request = new Request(
      `https://eve-assist.561.group/auth/callback?code=test-auth-code&state=${state}`,
      { headers: { cookie: `eve_assist_state=${state}` } },
    );
    const response = await worker.fetch(request, env, {});

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/dashboard.html");

    const setCookies = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")];
    assert.ok(
      setCookies.some((c) => c && c.startsWith(`${SESSION_COOKIE_NAME}=`) && c.includes("HttpOnly")),
      "expected a session cookie to be set",
    );
    assert.ok(
      setCookies.some((c) => c && c.startsWith("eve_assist_state=") && c.includes("Max-Age=0")),
      "expected the state cookie to be cleared",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/me without a session returns 401 JSON", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const response = await worker.fetch(new Request("https://eve-assist.561.group/api/me"), env, {});

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(typeof body.error, "string");
});

test("POST /api/settings/gemini-key rejects a key that does not look like AIza...", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const cookieHeader = await sessionCookieHeaderFor(7, env);

  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/settings/gemini-key", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ key: "not-a-gemini-key" }),
    }),
    env,
    {},
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /AIza/);
});

test("POST /api/settings/gemini-key rejects an unknown provider id", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const cookieHeader = await sessionCookieHeaderFor(7, env);

  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/settings/gemini-key", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ key: "irrelevant", provider: "not-a-real-provider" }),
    }),
    env,
    {},
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /unknown AI provider/i);
});

test("POST /api/settings/gemini-key rejects an anthropic key that does not start with sk-ant-", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const cookieHeader = await sessionCookieHeaderFor(7, env);

  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/settings/gemini-key", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ key: "not-an-anthropic-key", provider: "anthropic" }),
    }),
    env,
    {},
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /sk-ant-/);
});

test("POST /api/settings/gemini-key requires a baseUrl for openai-compatible", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const cookieHeader = await sessionCookieHeaderFor(7, env);

  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/settings/gemini-key", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ key: "gsk_" + "a".repeat(20), provider: "openai-compatible" }),
    }),
    env,
    {},
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /baseUrl is required/);
});

test("POST /api/settings/gemini-key rejects an openai-compatible baseUrl with a trailing slash or non-https scheme", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const cookieHeader = await sessionCookieHeaderFor(7, env);
  const key = "gsk_" + "a".repeat(20);

  for (const baseUrl of ["https://api.groq.com/openai/v1/", "http://api.groq.com/openai/v1"]) {
    const response = await worker.fetch(
      new Request("https://eve-assist.561.group/api/settings/gemini-key", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({ key, provider: "openai-compatible", baseUrl }),
      }),
      env,
      {},
    );
    assert.equal(response.status, 400, `expected 400 for baseUrl ${baseUrl}`);
    const body = await response.json();
    assert.match(body.error, /https:\/\/|trailing slash/);
  }
});

test("POST /api/settings/gemini-key accepts a valid openai-compatible (Groq) key + baseUrl, and /api/me reports hasAiKey", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const store = createStore(env.DB);
  const user = await store.createUser({ characterId: 90000042, characterName: "Groq Tester" });
  const cookieHeader = await sessionCookieHeaderFor(user.id, env);

  const saveResponse = await worker.fetch(
    new Request("https://eve-assist.561.group/api/settings/gemini-key", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({
        key: "gsk_" + "a".repeat(20),
        provider: "openai-compatible",
        baseUrl: "https://api.groq.com/openai/v1",
        model: "llama-3.3-70b-versatile",
      }),
    }),
    env,
    {},
  );
  assert.equal(saveResponse.status, 200);
  const saveBody = await saveResponse.json();
  assert.equal(saveBody.ok, true);

  const meResponse = await worker.fetch(
    new Request("https://eve-assist.561.group/api/me", { headers: { cookie: cookieHeader } }),
    env,
    {},
  );
  assert.equal(meResponse.status, 200);
  const meBody = await meResponse.json();
  assert.equal(meBody.hasAiKey, true);
  assert.equal(meBody.hasGeminiKey, true);
});

test("POST /mcp without a bearer token returns a 401 JSON-RPC error", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();

  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/mcp", { method: "POST", body: "{}" }),
    env,
    {},
  );

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.jsonrpc, "2.0");
  assert.equal(typeof body.error.message, "string");
});

test("POST /mcp with an unknown bearer token returns a 401 JSON-RPC error", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv(); // fake D1 never seeds mcp_tokens rows => lookup misses

  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/mcp", {
      method: "POST",
      headers: { authorization: "Bearer eva_totally-unknown-token" },
      body: "{}",
    }),
    env,
    {},
  );

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.jsonrpc, "2.0");
  assert.equal(body.error.code, -32001);
});

test("OPTIONS /mcp answers the CORS preflight", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();

  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/mcp", { method: "OPTIONS" }),
    env,
    {},
  );

  assert.equal(response.status, 204);
  assert.match(response.headers.get("access-control-allow-methods"), /POST/);
  assert.match(response.headers.get("access-control-allow-headers"), /authorization/);
});

test("unmatched paths fall through to env.ASSETS.fetch", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();

  const response = await worker.fetch(new Request("https://eve-assist.561.group/dashboard.html"), env, {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "static-asset-stub");
});

// --- POST /api/tools/{name} ------------------------------------------------

test("POST /api/tools/{name} without a session returns 401", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/tools/get_server_status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ args: {} }),
    }),
    env,
    {},
  );
  assert.equal(response.status, 401);
});

test("POST /api/tools/{name} runs a public tool and returns {data, observations}", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const { cookieHeader } = await seedAuthenticatedUser(env);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fakeEsiFetch({ "/latest/status/": { players: 12345, server_version: "1.0", start_time: "2026-08-05T00:00:00Z" } });
  try {
    const response = await worker.fetch(
      new Request("https://eve-assist.561.group/api/tools/get_server_status", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({ args: {} }),
      }),
      env,
      {},
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.players, 12345);
    assert.ok(Array.isArray(body.observations));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/tools/{name} with an unknown tool name returns 404 unknown_tool", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const { cookieHeader } = await seedAuthenticatedUser(env);
  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/tools/not_a_real_tool", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ args: {} }),
    }),
    env,
    {},
  );
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.code, "unknown_tool");
});

test("POST /api/tools/{name} with invalid args returns 400 invalid_args", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const { cookieHeader } = await seedAuthenticatedUser(env);
  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/tools/get_market_prices", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ args: {} }), // missing required typeId/regionId
    }),
    env,
    {},
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, "invalid_args");
});

// --- per-invocation subrequest budget (2026-08-05 fix) ------------------

test("buildToolCtx's per-invocation subrequest budget stops a runaway tool before Cloudflare's 50-subrequest cap, and the error is greppable", async () => {
  // get_route (src/tools/market-tools.mjs) fetches one GET per system on the
  // route with no cap on route length -- see that file's own top-of-file
  // note on why it's deliberately not batched. That makes it the one tool in
  // this codebase that can still generate an unbounded number of
  // subrequests in a single call, which makes it the natural way to
  // exercise the budget guard end-to-end without fabricating a fake tool.
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const { cookieHeader } = await seedAuthenticatedUser(env);

  const systemCount = 45; // 1 route fetch + 45 system fetches > the 40-fetch budget
  const systemIds = Array.from({ length: systemCount }, (_, i) => 30000001 + i);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const href = input instanceof URL ? input.href : typeof input === "string" ? input : input.url;
    const url = new URL(href);
    if (url.pathname === "/latest/route/30000142/30000200/") {
      return new Response(JSON.stringify(systemIds), { status: 200, headers: { "content-type": "application/json" } });
    }
    const match = /^\/latest\/universe\/systems\/(\d+)\/$/.exec(url.pathname);
    if (match) {
      return new Response(JSON.stringify({ name: `System ${match[1]}`, security_status: 0.5 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch in test: ${url.pathname}`);
  };

  try {
    const response = await worker.fetch(
      new Request("https://eve-assist.561.group/api/tools/get_route", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({ args: { originSystemId: 30000142, destinationSystemId: 30000200 } }),
      }),
      env,
      {},
    );
    // registry.mjs's runTool wraps a non-ToolError throw as ToolError code
    // "tool_failed" -> statusForToolError maps that to 502.
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.match(body.error, /subrequest budget exhausted \(40\)/);
    assert.equal(body.code, "tool_failed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// --- GET /api/charts/market-history -----------------------------------

test("GET /api/charts/market-history renders an SVG line chart with a private cache header", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const { cookieHeader } = await seedAuthenticatedUser(env);
  const rows = [];
  for (let i = 1; i <= 10; i += 1) {
    rows.push({ date: `2026-07-${String(i).padStart(2, "0")}`, average: 100 + i, lowest: 90 + i, highest: 110 + i, order_count: 5, volume: 1000 });
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fakeEsiFetch({ "/latest/markets/10000002/history/": rows });
  try {
    const response = await worker.fetch(
      new Request("https://eve-assist.561.group/api/charts/market-history?regionId=10000002&typeId=34", {
        headers: { cookie: cookieHeader },
      }),
      env,
      {},
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/svg+xml");
    assert.equal(response.headers.get("cache-control"), "private, max-age=300");
    const svg = await response.text();
    assert.match(svg, /^<svg/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/charts/market-history without regionId/typeId returns 400", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const { cookieHeader } = await seedAuthenticatedUser(env);
  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/charts/market-history", { headers: { cookie: cookieHeader } }),
    env,
    {},
  );
  assert.equal(response.status, 400);
});

// --- GET /api/charts/wallet-sparkline -----------------------------------

test("GET /api/charts/wallet-sparkline renders an SVG from wallet journal balances", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const { cookieHeader } = await seedAuthenticatedUser(env);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fakeEsiFetch({
    "/latest/characters/2118406090/wallet/journal/": [
      { id: 1, date: "2026-08-01T00:00:00Z", amount: 100, balance: 1000, ref_type: "bounty_prizes" },
      { id: 2, date: "2026-08-02T00:00:00Z", amount: -50, balance: 950, ref_type: "market_transaction" },
      { id: 3, date: "2026-08-03T00:00:00Z", amount: 200, balance: 1150, ref_type: "bounty_prizes" },
    ],
  });
  try {
    const response = await worker.fetch(
      new Request("https://eve-assist.561.group/api/charts/wallet-sparkline", { headers: { cookie: cookieHeader } }),
      env,
      {},
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/svg+xml");
    const svg = await response.text();
    assert.match(svg, /^<svg/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// --- GET /api/ledger/export ---------------------------------------------

test("GET /api/ledger/export?format=beancount returns an attachment with the rendered ledger", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const { cookieHeader } = await seedAuthenticatedUser(env);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fakeEsiFetch({
    "/latest/characters/2118406090/": { name: "Morgan Sennhauser" },
    "/latest/characters/2118406090/wallet/journal/": [
      { id: 34772918001, date: "2026-08-01T14:03:11Z", amount: 1250000, balance: 5000000, ref_type: "bounty_prizes" },
    ],
  });
  try {
    const response = await worker.fetch(
      new Request("https://eve-assist.561.group/api/ledger/export?format=beancount", { headers: { cookie: cookieHeader } }),
      env,
      {},
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="eve-wallet.beancount"');
    const text = await response.text();
    assert.match(text, /id: "34772918001"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/ledger/export with a bad format returns 400", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const { cookieHeader } = await seedAuthenticatedUser(env);
  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/ledger/export?format=csv", { headers: { cookie: cookieHeader } }),
    env,
    {},
  );
  assert.equal(response.status, 400);
});

test("GET /api/ledger/export without a session returns 401", async () => {
  const worker = createEveAssistWorker();
  const env = baseEnv();
  const response = await worker.fetch(
    new Request("https://eve-assist.561.group/api/ledger/export?format=hledger"),
    env,
    {},
  );
  assert.equal(response.status, 401);
});
