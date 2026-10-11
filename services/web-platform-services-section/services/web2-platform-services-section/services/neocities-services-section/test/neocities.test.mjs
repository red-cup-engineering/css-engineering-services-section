import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { batchUploads, planSync, publishSite, readSiteTree, sha1Hex } from "../src/neocities.mjs";
import { storeKey } from "../scripts/neocities-key.mjs";
import { publish } from "../scripts/neocities-publish.mjs";

/** An in-memory Neocities holding one site, answering the documented API. */
function fakeNeocities({ sitename = "sigridsong", key = "k-sigrid", files = {} } = {}) {
  const store = new Map(Object.entries(files).map(([path, text]) => [path, Buffer.from(text)]));
  const calls = [];
  const json = (status, body) => new Response(JSON.stringify(body), { status });
  const listing = () => {
    const dirs = new Set();
    for (const path of store.keys()) {
      const parts = path.split("/");
      for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join("/"));
    }
    return [
      ...[...dirs].map((path) => ({ path, is_directory: true })),
      ...[...store].map(([path, bytes]) => ({ path, is_directory: false, size: bytes.length, sha1_hash: sha1Hex(bytes) })),
    ];
  };
  const fetch = async (url, { method = "GET", headers, body } = {}) => {
    const { pathname } = new URL(url);
    calls.push(`${method} ${pathname}`);
    if (headers.authorization !== `Bearer ${key}`) return json(403, { result: "error", error_type: "invalid_auth", message: "invalid credentials" });
    if (pathname === "/api/info") return json(200, { result: "success", info: { sitename, supporter: true } });
    if (pathname === "/api/list") return json(200, { result: "success", files: listing() });
    if (pathname === "/api/upload") {
      for (const [path, blob] of body) store.set(path, Buffer.from(await blob.arrayBuffer()));
      return json(200, { result: "success", message: "uploaded" });
    }
    if (pathname === "/api/delete") {
      for (const path of body.getAll("filenames[]")) {
        for (const existing of [...store.keys()]) if (existing === path || existing.startsWith(`${path}/`)) store.delete(existing);
      }
      return json(200, { result: "success", message: "deleted" });
    }
    return json(404, { result: "error", error_type: "not_found", message: "no such endpoint" });
  };
  return { fetch, store, calls };
}

async function builtSite(files) {
  const dir = await mkdtemp(join(tmpdir(), "neocities-site-"));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(dir, path, ".."), { recursive: true });
    await writeFile(join(dir, path), text);
  }
  return dir;
}

test("a build's 404.html is also served under the name Neocities uses, and dotfiles stay home", async () => {
  const dir = await builtSite({ "index.html": "home", "404.html": "lost", ".cache/x": "private", "a/b.css": "css" });
  const tree = await readSiteTree(dir);
  assert.deepEqual(tree.map((file) => file.path), ["404.html", "a/b.css", "index.html", "not_found.html"]);
  assert.equal(tree.find((file) => file.path === "not_found.html").sha1, sha1Hex(Buffer.from("lost")));
});

test("the plan uploads only changed files and prunes by the highest orphaned directory", () => {
  const local = [{ path: "index.html", sha1: sha1Hex(Buffer.from("new")) }, { path: "books/ice-out/index.html", sha1: "b" }];
  const remote = [
    { path: "index.html", is_directory: false, sha1_hash: sha1Hex(Buffer.from("old")) },
    { path: "books", is_directory: true },
    { path: "books/ice-out", is_directory: true },
    { path: "books/ice-out/index.html", is_directory: false, sha1_hash: "b" },
    { path: "books/old.html", is_directory: false, sha1_hash: "c" },
    { path: "template", is_directory: true },
    { path: "template/deep", is_directory: true },
    { path: "template/deep/x.png", is_directory: false, sha1_hash: "d" },
    { path: "style.css", is_directory: false, sha1_hash: "e" },
  ];
  assert.deepEqual(planSync({ local, remote }), {
    upload: ["index.html"],
    delete: ["books/old.html", "style.css", "template"],
    unchanged: ["books/ice-out/index.html"],
  });
  assert.deepEqual(planSync({ local, remote, prune: false }).delete, []);
  assert.throws(() => planSync({ local: [{ path: "a.html", sha1: "x" }], remote: [] }), /root index\.html/);
});

test("uploads split by bytes and by count", () => {
  const files = [5, 5, 5, 1].map((size, i) => ({ path: `f${i}`, size }));
  assert.deepEqual(batchUploads(files, { maxBytes: 10 }).map((batch) => batch.map((file) => file.path)), [["f0", "f1"], ["f2", "f3"]]);
  assert.equal(batchUploads(files, { maxFiles: 1 }).length, 4);
  assert.throws(() => batchUploads([{ path: "big", size: 11 }], { maxBytes: 10 }), /per-request limit/);
});

test("publishing replaces the default site with the build and proves it by reading back", async () => {
  const neocities = fakeNeocities({ files: { "index.html": "default", "style.css": "default", "neocities.png": "png", "not_found.html": "default" } });
  const dir = await builtSite({ "index.html": "home", "404.html": "lost", "books/ice-out/index.html": "book" });
  const receipt = await publishSite({ fetch: neocities.fetch, token: "k-sigrid", sitename: "sigridsong", dir, now: () => new Date("2026-09-30T12:00:00Z") });
  assert.equal(receipt.verified, true);
  assert.deepEqual([...neocities.store.keys()].sort(), ["404.html", "books/ice-out/index.html", "index.html", "not_found.html"]);
  assert.equal(neocities.store.get("not_found.html").toString(), "lost");
  assert.deepEqual(receipt.deleted, ["neocities.png", "style.css"]);

  const wiped = await builtSite({ "index.html": "empty build" });
  await assert.rejects(publishSite({ fetch: neocities.fetch, token: "k-sigrid", sitename: "sigridsong", dir: wiped, maxDelete: 2 }), /refusing to delete 3 paths/);
  assert.equal(neocities.store.get("index.html").toString(), "home");

  const again = await publishSite({ fetch: neocities.fetch, token: "k-sigrid", sitename: "sigridsong", dir });
  assert.deepEqual([again.uploaded, again.deleted, again.unchanged], [[], [], 4]);
});

test("a key for another site is refused before anything is written", async () => {
  const neocities = fakeNeocities({ sitename: "emsenn", key: "k-emsenn", files: { "index.html": "emsenn's" } });
  const dir = await builtSite({ "index.html": "home" });
  await assert.rejects(publishSite({ fetch: neocities.fetch, token: "k-emsenn", sitename: "sigridsong", dir }), /belongs to emsenn/);
  assert.deepEqual(neocities.calls, ["GET /api/info"]);
  assert.equal(neocities.store.get("index.html").toString(), "emsenn's");
});

test("the CLIs store a verified key privately and publish from a site's binding with a receipt", async () => {
  const neocities = fakeNeocities();
  const home = await mkdtemp(join(tmpdir(), "neocities-home-"));
  const env = { NEOCITIES_CREDENTIALS_DIR: join(home, "neocities") };
  const quiet = { write() {} };
  await assert.rejects(storeKey(["sigridsong"], { fetch: neocities.fetch, env, read: async () => "wrong", output: quiet }), /invalid_auth/);
  const path = await storeKey(["sigridsong"], { fetch: neocities.fetch, env, read: async () => "k-sigrid", output: quiet });
  assert.equal((await stat(path)).mode & 0o777, 0o600);

  const site = await builtSite({ "dist/index.html": "home", "neocities.json": JSON.stringify({ sitename: "sigridsong", source: "dist", receipts: "receipts" }) });
  await publish([site, "--dry-run"], { fetch: neocities.fetch, env, output: quiet });
  assert.equal(neocities.store.size, 0);
  const receipt = await publish([site], { fetch: neocities.fetch, env, output: quiet });
  assert.equal(neocities.store.get("index.html").toString(), "home");
  const [name] = await readdir(join(site, "receipts"));
  assert.deepEqual(JSON.parse(await readFile(join(site, "receipts", name), "utf8")), receipt);
});
