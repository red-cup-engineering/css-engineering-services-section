import assert from "node:assert/strict";
import { test } from "node:test";
import { mountAt } from "../src/mount-app.mts";

function ctxFor(pathname: string, extra: Record<string, unknown> = {}) {
  return { url: new URL("http://example.test" + pathname), ...extra } as any;
}

test("mountAt normalizes the prefix (bare word, trailing slash, root)", () => {
  const inner = { resources: [{ route: "/", match: "/", handler: (ctx: any) => ctx.url.pathname }] };
  const bare = mountAt("mod", inner);
  const trailing = mountAt("/mod/", inner);
  // Both should answer under /mod, not /mod/mod or //mod
  assert.deepEqual(bare.resources![0]!.match("/mod", ctxFor("/mod")), {});
  assert.deepEqual(trailing.resources![0]!.match("/mod", ctxFor("/mod")), {});
});

test("mountAt root prefix ('' or '/') mounts resources unprefixed", () => {
  const inner = { resources: [{ route: "/x", match: "/x", handler: (ctx: any) => ctx.url.pathname }] };
  const rooted = mountAt("/", inner);
  assert.equal(rooted.resources![0]!.route, "/x");
  assert.deepEqual(rooted.resources![0]!.match("/x", ctxFor("/x")), {});
});

test("mountAt prefixes the resource route string", () => {
  const inner = { resources: [{ route: "/users/:id", match: "/users/:id", handler: (ctx: any) => ctx }] };
  const mounted = mountAt("/api", inner);
  assert.equal(mounted.resources![0]!.route, "/api/users/:id");
});

test("mountAt string match: rejects paths outside the prefix, matches params under it", () => {
  const inner = { resources: [{ route: "/users/:id", match: "/users/:id", handler: (ctx: any) => ctx }] };
  const mounted = mountAt("/api", inner);
  const resource = mounted.resources![0]!;
  assert.equal(resource.match("/other/users/1", ctxFor("/other/users/1")), false);
  assert.equal(resource.match("/api/users", ctxFor("/api/users")), false);
  assert.deepEqual(resource.match("/api/users/42", ctxFor("/api/users/42")), { id: "42" });
});

test("mountAt RegExp match is evaluated against the stripped path and exposes named groups", () => {
  const inner = {
    resources: [{ route: undefined, match: /^\/thing\/(?<slug>[^/]+)$/, handler: (ctx: any) => ctx }],
  };
  const mounted = mountAt("/api", inner as any);
  const resource = mounted.resources![0]!;
  assert.deepEqual(resource.match("/api/thing/abc", ctxFor("/api/thing/abc")), { slug: "abc" });
  assert.equal(resource.match("/api/thing/abc/extra", ctxFor("/api/thing/abc/extra")), false);
});

test("mountAt function match receives the stripped path, but the ORIGINAL (not rebased) ctx; its boolean result is normalized to {}", () => {
  const seen: string[] = [];
  const inner = {
    resources: [
      {
        route: undefined,
        match: (path: string, ctx: any) => { seen.push(path + "|" + ctx.url.pathname); return path === "/ping" ? true : false; },
        handler: (ctx: any) => ctx,
      },
    ],
  };
  const mounted = mountAt("/api", inner as any);
  const resource = mounted.resources![0]!;
  // A truthy non-object match result is normalized to {} (only RegExp/object results carry params through).
  assert.deepEqual(resource.match("/api/ping", ctxFor("/api/ping")), {});
  // Pinning current behavior: unlike the handler and middlewares, the match function is called
  // with the *original* ctx (url.pathname still "/api/ping"), not the prefix-stripped rebase —
  // only the `path` argument is stripped.
  assert.equal(seen.at(-1), "/ping|/api/ping");
  assert.equal(resource.match("/api/other", ctxFor("/api/other")), false);
});

test("mountAt handler receives a ctx whose url.pathname is rebased with the prefix stripped, other props passed through", () => {
  let received: any;
  const inner = {
    resources: [{ route: "/x", match: "/x", handler: (ctx: any) => { received = ctx; return "ok"; } }],
  };
  const mounted = mountAt("/api", inner);
  const outerCtx = ctxFor("/api/x?q=1#frag", { method: "GET" });
  const result = mounted.resources![0]!.handler(outerCtx);
  assert.equal(result, "ok");
  assert.equal(received.url.pathname, "/x");
  assert.equal(received.url.search, "?q=1");
  assert.equal(received.url.hash, "#frag");
  assert.equal(received.method, "GET");
  // The outer ctx itself is untouched (rebasing produces a new view, not a mutation).
  assert.equal(outerCtx.url.pathname, "/api/x");
});

test("mountAt rebases per-resource middlewares the same way as the handler", () => {
  const seenPaths: string[] = [];
  const inner = {
    resources: [
      {
        route: "/x",
        match: "/x",
        middlewares: [(ctx: any) => { seenPaths.push(ctx.url.pathname); return []; }],
        handler: (ctx: any) => ctx.url.pathname,
      },
    ],
  };
  const mounted = mountAt("/api", inner);
  mounted.resources![0]!.middlewares![0]!(ctxFor("/api/x"));
  assert.deepEqual(seenPaths, ["/x"]);
});

test("mountAt app-level middlewares only fire under the prefix, and see the rebased ctx", () => {
  const calls: string[] = [];
  const inner = {
    resources: [],
    middlewares: [(ctx: any) => { calls.push(ctx.url.pathname); return ["ran"]; }],
  };
  const mounted = mountAt("/api", inner as any);
  const mw = mounted.middlewares![0]!;
  const insideResult = mw(ctxFor("/api/anything"));
  const outsideResult = mw(ctxFor("/other"));
  assert.deepEqual(insideResult, ["ran"]);
  assert.deepEqual(outsideResult, []);
  assert.deepEqual(calls, ["/anything"]);
});

test("mountAt with no app-level middlewares omits the middlewares field entirely", () => {
  const mounted = mountAt("/api", { resources: [] });
  assert.equal("middlewares" in mounted, false);
});
