import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { handler } from "../server/index.mjs";

import {
  authorizeBearer,
  authorizeBearerReport,
  bearerToken,
  createRateLimiter,
  syncAuthTrace,
  syncGuardApp,
  validateSyncAssertions,
  type AssertionFault,
} from "./index.mjs";

const assertions = [
  { e: "claims/alpha", a: "title", v: "Alpha", t: { by: "peer-a" } },
  { e: "claims/alpha", a: "status", v: "published", source: "peer-a" },
];

test("bearerToken and authorizeBearer bind tokens to sources", () => {
  assert.equal(bearerToken({ authorization: "Bearer secret" }), "secret");
  assert.deepEqual(authorizeBearer({}, { secret: "peer-a" }), {
    ok: false,
    status: 401,
    reason: "missing bearer token",
  });
  assert.deepEqual(authorizeBearer({ authorization: "Bearer secret" }, { secret: "peer-a" }), {
    ok: true,
    status: 200,
    token: "secret",
    source: "peer-a",
  });
  assert.equal(authorizeBearer({ authorization: "Bearer nope" }, { secret: "peer-a" }).status, 403);
});

test("authorizeBearerReport exposes MEMETICS admission evidence while preserving decisions", () => {
  const trace = syncAuthTrace({ authorization: "Bearer secret" }, { id: "req-sync-auth", now: "1" });
  assert.equal(trace.kind, "web-server.request-trace");
  assert.equal(trace.id, "req-sync-auth");
  assert.deepEqual(trace.entries.map((entry) => [entry.e, entry.a, entry.v, entry.t]), [
    ["req-sync-auth", "header.authorization", "Bearer secret", "1"],
  ]);

  const open = authorizeBearerReport({}, undefined);
  assert.equal(open.ok, true);
  assert.equal(open.report.value, "potential");

  const missing = authorizeBearerReport({}, { secret: "peer-a" });
  assert.equal(missing.ok, false);
  assert.equal(missing.status, 401);
  assert.equal(missing.report.value, "active");
  assert.deepEqual(missing.report.judgments.map((judgment) => [judgment.name, judgment.value]), [["auth", "active"]]);

  const accepted = authorizeBearerReport({ authorization: "Bearer secret" }, { secret: "peer-a" }, trace);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.source, "peer-a");
  assert.equal(accepted.report.trace.id, "req-sync-auth");
  assert.equal(accepted.report.value, "potential");
  assert.deepEqual(accepted.report.claims, { token: "secret", source: "peer-a" });
  assert.deepEqual(accepted.report.judgments.map((judgment) => [judgment.name, judgment.value]), [["auth", "potential"]]);

  const denied = authorizeBearerReport({ authorization: "Bearer nope" }, { secret: "peer-a" });
  assert.equal(denied.status, 403);
  assert.equal(denied.reason, "bearer token is not authorized");
  assert.equal(denied.report.value, "active");
});

test("validateSyncAssertions rejects malformed, unprovenanced, or unauthorized assertions", () => {
  const malformed = validateSyncAssertions([{ e: "x" }]);
  const noProvenance = validateSyncAssertions([{ e: "x", a: "p", v: 1 }]);
  const wrongSource = validateSyncAssertions(assertions, { expectedSource: "peer-b" });
  const unrecognized = validateSyncAssertions(assertions, { recognize: ["peer-b"] });

  assert.equal(malformed.ok, false);
  assert.equal((malformed.faults[0] as AssertionFault | undefined)?.code, "assertion-shape");
  assert.equal(noProvenance.ok, false);
  assert.equal(noProvenance.faults[0]?.code, "assertion-no-provenance");
  assert.equal(wrongSource.faults[0]?.code, "assertion-source-mismatch");
  assert.equal(unrecognized.faults[0]?.code, "assertion-source-unrecognized");
});

test("validateSyncAssertions accepts recognized provenanced assertions", () => {
  const validation = validateSyncAssertions(assertions, {
    expectedSource: "peer-a",
    recognize: new Set(["peer-a"]),
  });

  assert.equal(validation.ok, true);
  assert.equal(validation.assertions.length, 2);
});

test("createRateLimiter admits only a bounded number of calls per window", () => {
  let now = 1000;
  const check = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });

  assert.equal(check("peer-a").ok, true);
  assert.equal(check("peer-a").remaining, 0);
  assert.equal(check("peer-a").ok, false);
  now = 2500;
  assert.equal(check("peer-a").ok, true);
});

test("syncGuardApp serves GET assertion traces and guarded POST imports", async () => {
  const imported: unknown[] = [];
  const app = syncGuardApp({
    exportAssertions: () => assertions,
    importAssertions: (accepted) => {
      imported.push(...accepted);
      return accepted.length;
    },
    tokens: { secret: "peer-a" },
    recognize: ["peer-a"],
    rateLimit: { limit: 2, windowMs: 60_000 },
  });
  const resource = app.resources?.[0];
  assert.ok(resource);
  assert.equal(resource.route, "/sync");
  assert.equal(resource.id, "sync-guard.sync");
  assert.equal(resource.name, "Sync Guard");

  const server = createServer(handler(app));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const delta = await fetch(`${base}/sync`, { headers: { accept: "application/json" } });
    assert.equal(delta.status, 200);
    assert.equal((await delta.json() as { assertions?: unknown[] }).assertions?.length, 2);

    const unauthorized = await fetch(`${base}/sync`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ assertions }),
    });
    assert.equal(unauthorized.status, 401);

    const accepted = await fetch(`${base}/sync`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: "Bearer secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ assertions }),
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.headers.get("ratelimit-limit"), "2");
    assert.equal(accepted.headers.get("ratelimit-remaining"), "1");
    assert.equal((await accepted.json() as { imported?: number }).imported, 2);
    assert.equal(imported.length, 2);

    const rejected = await fetch(`${base}/sync`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: "Bearer secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ assertions: [{ e: "claims/beta", a: "title", v: "Beta", source: "peer-b" }] }),
    });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.headers.get("ratelimit-limit"), "2");
    assert.equal(rejected.headers.get("ratelimit-remaining"), "0");
    assert.match(await rejected.text(), /assertion-source-mismatch/);

    const limited = await fetch(`${base}/sync`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: "Bearer secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ assertions }),
    });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("ratelimit-limit"), "2");
    assert.equal(limited.headers.get("ratelimit-remaining"), "0");
    assert.ok(limited.headers.get("retry-after"));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
