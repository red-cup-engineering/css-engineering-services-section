import assert from "node:assert/strict";
import test from "node:test";
import { createCloudflareStaticAssetsWorker, crawlerResponses } from "../../src/deployment/cloudflare-static-assets-worker.mjs";

const requests = [];
const assets = { fetch: async (request) => { requests.push(request.url); return new Response("asset", { status: 200, headers: { "Content-Type": "application/octet-stream" } }); } };

test("projects redirects, static responses, rewrites, and media types through one asset capability", async () => {
  const worker = createCloudflareStaticAssetsWorker({
    assetBinding: "ASSETS",
    redirects: [{ from: "/", to: "/web/index.html" }],
    rewrites: [{ from: "/api/manifest", to: "/api-manifest.json" }],
    responses: [{ path: "/health", status: 200, body: '{"ok":true}', headers: { "Content-Type": "application/json" } }],
  });
  const root = await worker.fetch(new Request("https://example.561.group/"), { ASSETS: assets });
  assert.equal(root.status, 302);
  assert.equal(root.headers.get("location"), "/web/index.html");
  const health = await worker.fetch(new Request("https://example.561.group/health"), { ASSETS: assets });
  assert.equal(await health.text(), '{"ok":true}');
  const manifest = await worker.fetch(new Request("https://example.561.group/api/manifest"), { ASSETS: assets });
  assert.equal(await manifest.text(), "asset");
  assert.equal(requests.at(-1), "https://example.561.group/api-manifest.json");
  const module = await worker.fetch(new Request("https://example.561.group/web/game.mts"), { ASSETS: assets });
  assert.equal(module.headers.get("content-type"), "text/javascript; charset=utf-8");
});

test("projects a prefixed static application while retaining its explicit namespaces", async () => {
  const worker = createCloudflareStaticAssetsWorker({ assetBinding: "ASSETS", prefix: { path: "/web", exclude: ["/web/", "/src/", "/vendor/"], index: "/index.html" } });
  await worker.fetch(new Request("https://example.561.group/play/"), { ASSETS: assets });
  assert.equal(requests.at(-1), "https://example.561.group/web/play/index.html");
  await worker.fetch(new Request("https://example.561.group/vendor/kernel.mjs"), { ASSETS: assets });
  assert.equal(requests.at(-1), "https://example.561.group/vendor/kernel.mjs");
});

test("refuses ambiguous or malformed route policy data", () => {
  assert.throws(() => createCloudflareStaticAssetsWorker({ assetBinding: "assets" }), /assetBinding/);
  assert.throws(() => createCloudflareStaticAssetsWorker({ assetBinding: "ASSETS", redirects: [{ from: "/", to: "/x" }, { from: "/", to: "/y" }] }), /unique/);
});

test("declares crawler responses from a site's origin and canonical paths, and refuses a path-bearing origin", async () => {
  const worker = createCloudflareStaticAssetsWorker({ assetBinding: "ASSETS", responses: crawlerResponses({ origin: "https://example.561.group", paths: ["/web/"] }) });
  const robots = await worker.fetch(new Request("https://example.561.group/robots.txt"), { ASSETS: assets });
  assert.equal(await robots.text(), "User-agent: *\nAllow: /\n\nSitemap: https://example.561.group/sitemap.xml\n");
  const sitemap = await worker.fetch(new Request("https://example.561.group/sitemap.xml"), { ASSETS: assets });
  assert.match(sitemap.headers.get("Content-Type"), /^application\/xml/u);
  assert.match(await sitemap.text(), /<loc>https:\/\/example\.561\.group\/web\/<\/loc>/u);
  assert.throws(() => crawlerResponses({ origin: "https://example.561.group/x", paths: ["/"] }), /origin/u);
});
