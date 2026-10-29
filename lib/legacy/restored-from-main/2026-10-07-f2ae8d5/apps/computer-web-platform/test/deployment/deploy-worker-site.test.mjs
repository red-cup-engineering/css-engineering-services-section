import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nextStepOf, shippedDigestOf, versionOfDeploy, workerSitesOf } from "../../src/deployment/deploy-worker-site.mjs";

test("a declaration names each site once, by slug, with paths inside it", () => {
  const [site] = workerSitesOf({ sites: [{ id: "farstone", directory: "sites/farstone", build: ["scripts/build.mjs"] }] });
  assert.deepEqual({ ...site, build: [...site.build] }, { id: "farstone", directory: "sites/farstone", build: ["scripts/build.mjs"], config: "wrangler.jsonc", output: "dist" });
  assert.throws(() => workerSitesOf({ sites: [{ id: "a", directory: "x", build: ["b.mjs"] }, { id: "a", directory: "y", build: ["b.mjs"] }] }), /twice/u);
  assert.throws(() => workerSitesOf({ sites: [{ id: "a", directory: "../x", build: ["b.mjs"] }] }), /inside/u);
  assert.throws(() => workerSitesOf({ sites: [{ id: "a", directory: "x", build: [] }] }), /build/u);
});

test("a release new to a site builds; a build unlike what is live deploys; else nothing", () => {
  assert.equal(nextStepOf({ release: "r2" }), "build");
  assert.equal(nextStepOf({ release: "r2", built: { release: "r1", digest: "d" }, deployed: { digest: "d" } }), "build");
  assert.equal(nextStepOf({ release: "r2", built: { release: "r2", digest: "d2" }, deployed: { digest: "d1" } }), "deploy");
  assert.equal(nextStepOf({ release: "r2", built: { release: "r2", digest: "d2" } }), "deploy");
  assert.equal(nextStepOf({ release: "r2", built: { release: "r2", digest: "d" }, deployed: { digest: "d" } }), "current");
});

test("what a build ships is addressed by its output and configuration bytes alone", () => {
  const make = (worker) => {
    const root = mkdtempSync(join(tmpdir(), "worker-site-"));
    mkdirSync(join(root, "dist", "public"), { recursive: true });
    writeFileSync(join(root, "wrangler.jsonc"), "{}");
    writeFileSync(join(root, "dist", "worker.mjs"), worker);
    writeFileSync(join(root, "dist", "public", "index.html"), "<p>hi</p>");
    writeFileSync(join(root, "notes.txt"), String(Math.random()));
    return root;
  };
  const site = { config: "wrangler.jsonc", output: "dist" };
  assert.equal(shippedDigestOf(make("a"), site), shippedDigestOf(make("a"), site));
  assert.notEqual(shippedDigestOf(make("a"), site), shippedDigestOf(make("b"), site));
});

test("the Worker version a deploy went live as is read from Wrangler", () => {
  assert.equal(versionOfDeploy("Deployed farstone triggers\nCurrent Version ID: 0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b\n"), "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b");
  assert.equal(versionOfDeploy("nothing"), undefined);
});
