import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { healthOf, nextStepOf, reconcileWorkerSite, rollbackArgumentsOf, shippedDigestOf, versionOfDeploy, workerSitesOf, workerSourceOf } from "../../src/deployment/deploy-worker-site.mjs";

test("a declaration names each site once, by slug, with paths inside it", () => {
  const [site] = workerSitesOf({ sites: [{ id: "farstone", directory: "sites/farstone", build: ["scripts/build.mjs"] }] });
  assert.deepEqual({ ...site, build: [...site.build] }, { id: "farstone", directory: "sites/farstone", build: ["scripts/build.mjs"], config: "wrangler.jsonc", output: "dist", health: [] });
  assert.deepEqual([...workerSitesOf({ sites: [{ id: "a", directory: "x", build: ["b.mjs"], health: ["https://a.561.group/"] }] })[0].health], ["https://a.561.group/"]);
  assert.throws(() => workerSitesOf({ sites: [{ id: "a", directory: "x", build: ["b.mjs"], health: ["http://a.561.group/"] }] }), /health/u);
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

async function writeUpload(root, parts = [], { metadata = { main_module: "worker.mjs" }, reverse = false } = {}) {
  const form = new FormData();
  const entries = [["metadata", JSON.stringify(metadata)], ["worker.mjs", new File(["emitted Worker"], "worker.mjs", { type: "application/javascript+module" })], ...parts];
  for (const [name, value] of reverse ? entries.reverse() : entries) form.append(name, value);
  writeFileSync(join(root, "bundle.multipart"), Buffer.from(await new Response(form).arrayBuffer()));
}
function digestFixture() {
  const root = mkdtempSync(join(tmpdir(), "worker-site-"));
  mkdirSync(join(root, "public"));
  mkdirSync(join(root, "bundle"));
  writeFileSync(join(root, "wrangler.jsonc"), "{}");
  writeFileSync(join(root, "public/index.html"), "<p>hi</p>");
  return root;
}
const digestOf = (root) => shippedDigestOf(root, { config: "wrangler.jsonc", output: "public" }, join(root, "bundle"));

test("the upload identity retains real modules and ignores only unuploaded diagnostics and transport framing", async () => {
  const root = digestFixture();
  await writeUpload(root);
  const before = await digestOf(root);
  await writeUpload(root, [], { reverse: true });
  assert.equal(await digestOf(root), before, "random boundary and part order are not uploaded content");
  writeFileSync(join(root, "bundle/README.md"), `compiler note generated at ${Date.now()}`);
  writeFileSync(join(root, "bundle/worker.mjs.map"), "unuploaded diagnostic map");
  writeFileSync(join(root, "notes.txt"), "unrelated");
  assert.equal(await digestOf(root), before);
  const text = (content) => [["README.md", new File([content], "README.md", { type: "text/plain" })]];
  await writeUpload(root, text("first live module"));
  const firstModule = await digestOf(root);
  assert.notEqual(firstModule, before);
  await writeUpload(root, text("changed live module"));
  assert.notEqual(await digestOf(root), firstModule, "README is not a diagnostic when the provider uploads it");
  await writeUpload(root);
  writeFileSync(join(root, "public/index.html"), "changed assets");
  assert.notEqual(await digestOf(root), before);
  await assert.rejects(shippedDigestOf(root, { config: "wrangler.jsonc", output: "public" }), /upload is required/u);
  await writeUpload(root, [], { metadata: {} });
  await assert.rejects(digestOf(root), /no Worker upload entry/u);
});

test("uploaded maps normalize only the exact provider-local sourceRoot and preserve meaningful map fields", async () => {
  const a = digestFixture();
  const b = digestFixture();
  const mapOf = (root) => ({ version: 3, sourceRoot: join(root, "bundle"), sources: ["../build/src/worker.mjs"], sourcesContent: ["source"], names: ["name"], mappings: "AAAA", x_extension: { meaning: "retained" } });
  const maps = (map) => [["worker.mjs.map", new File([JSON.stringify(map)], "worker.mjs.map", { type: "application/source-map" })]];
  await writeUpload(a, maps(mapOf(a)));
  await writeUpload(b, maps(mapOf(b)));
  const before = await digestOf(a);
  assert.equal(before, await digestOf(b), "relocating identical artifacts must not change identity");
  for (const change of [
    { sources: ["../build/src/other.mjs"] }, { sourcesContent: ["changed source"] },
    { names: ["other"] }, { mappings: "AACA" }, { x_extension: { meaning: "changed" } },
    { sourceRoot: "https://sources.example/" }, { sourceRoot: join(a, "bundle", "different") },
  ]) {
    await writeUpload(a, maps({ ...mapOf(a), ...change }));
    assert.notEqual(await digestOf(a), before, JSON.stringify(change));
  }
  const original = readFileSync(join(b, "bundle.multipart"));
  await digestOf(b);
  assert.deepEqual(readFileSync(join(b, "bundle.multipart")), original, "digesting leaves provider artifact bytes untouched");
});

for (const change of ["filename", "media-type", "metadata"]) test(`upload ${change} changes remain addressed`, async () => {
  const root = digestFixture();
  await writeUpload(root, [["data", new File(["same bytes"], "a.txt", { type: "text/plain" })]]);
  const before = await digestOf(root);
  await writeUpload(root, [["data", new File(["same bytes"], change === "filename" ? "b.txt" : "a.txt", { type: change === "media-type" ? "application/octet-stream" : "text/plain" })]], { metadata: { main_module: "worker.mjs", ...(change === "metadata" ? { compatibility_date: "2026-10-10" } : {}) } });
  assert.notEqual(await digestOf(root), before);
});

test("the Worker version a deploy went live as is read from Wrangler", () => {
  assert.equal(versionOfDeploy("Deployed farstone triggers\nCurrent Version ID: 0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b\n"), "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b");
  assert.equal(versionOfDeploy("nothing"), undefined);
});

test("health holds when every URL answers below 400, retrying a URL until it does", async () => {
  const answers = { "https://ok.test/": [200], "https://slow.test/": [502, 503, 200], "https://down.test/": [502, 502, 502] };
  const probe = async (url) => ({ status: answers[url].shift() ?? 502 });
  assert.deepEqual(await healthOf(["https://ok.test/", "https://slow.test/"], { probe, attempts: 3, delayMs: 1 }), { ok: true, failures: [] });
  const down = await healthOf(["https://ok.test/", "https://down.test/"], { probe: async (url) => ({ status: url.includes("down") ? 502 : 200 }), attempts: 3, delayMs: 1 });
  assert.equal(down.ok, false);
  assert.deepEqual(down.failures, [{ url: "https://down.test/", status: 502 }]);
  const thrown = await healthOf(["https://x.test/"], { probe: async () => { throw new Error("ENOTFOUND"); }, attempts: 2, delayMs: 1 });
  assert.deepEqual(thrown.failures, [{ url: "https://x.test/", error: "ENOTFOUND" }]);
});

test("a rollback names the version last live, the site's configuration and why", () => {
  assert.deepEqual([...rollbackArgumentsOf({ config: "wrangler.jsonc" }, "v-1", "health failed")], ["rollback", "v-1", "--config", "wrangler.jsonc", "--message", "health failed", "--yes"]);
});

/** A release tree with one site whose build writes its Worker, and a Wrangler that records its calls. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "worker-reconcile-"));
  const site = join(root, "release", "sites", "a");
  mkdirSync(join(site, "scripts"), { recursive: true });
  mkdirSync(join(site, "node_modules"), { recursive: true });
  writeFileSync(join(site, "wrangler.jsonc"), '{"main":"src/worker.mjs"}');
  mkdirSync(join(site, "src"));
  writeFileSync(join(site, "src", "worker.mjs"), 'export default { fetch() { return new Response("one"); } };');
  writeFileSync(join(site, "node_modules", "dependency.txt"), "dependency one");
  writeFileSync(join(site, "scripts", "build.mjs"), "import { mkdirSync, writeFileSync } from 'node:fs'; mkdirSync('dist', { recursive: true }); writeFileSync('dist/worker.mjs', 'export default {}');");
  const calls = join(root, "wrangler-calls");
  const wrangler = join(root, "wrangler");
  // This fixture is a controlled Wrangler process adapter, not a real provider or bundled release.
  writeFileSync(wrangler, `#!${process.execPath}
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(calls)}, args.join(' ') + '\\n');
if (args.includes('--dry-run')) {
  if (process.env.TEST_BUNDLE_FAILURE === 'fail') { console.error('bundle refused'); process.exit(2); }
  if (process.env.TEST_BUNDLE_FAILURE === 'empty') process.exit(0);
  const outdir = args[args.indexOf('--outdir') + 1];
  mkdirSync(outdir, { recursive: true });
  const content = readFileSync('src/worker.mjs', 'utf8') + readFileSync('node_modules/dependency.txt', 'utf8');
  writeFileSync(join(outdir, 'worker.mjs'), content);
  const upload = args[args.indexOf('--outfile') + 1];
  const form = new FormData();
  form.append('metadata', JSON.stringify({main_module:'worker.mjs'}));
  form.append('worker.mjs', new File([content], 'worker.mjs', {type:'application/javascript+module'}));
  writeFileSync(upload, Buffer.from(await new Response(form).arrayBuffer()));
  if (process.env.TEST_BUNDLE_FAILURE === 'malformed') writeFileSync(upload, 'not a multipart upload');
  if (process.env.TEST_BUNDLE_FAILURE === 'missing-upload') { const {unlinkSync} = await import('node:fs'); unlinkSync(upload); }
} else if (args[0] === 'deploy') console.log('Current Version ID: 11111111-2222-3333-4444-555555555555');
`);
  chmodSync(wrangler, 0o755);
  return { root, releaseRoot: join(root, "release"), stateRoot: join(root, "state"), calls, wrangler };
}

test("a deploy whose health fails is rolled back to the version last live and not recorded live", async () => {
  const { releaseRoot, stateRoot, calls, wrangler } = fixture();
  const [site] = workerSitesOf({ sites: [{ id: "a", directory: "sites/a", build: ["scripts/build.mjs"], health: ["https://a.test/"] }] });
  mkdirSync(join(stateRoot, "a"), { recursive: true });
  const before = { release: "r0", digest: "sha256:old", version: "00000000-0000-0000-0000-000000000000" };
  writeFileSync(join(stateRoot, "a", "deployed.json"), JSON.stringify(before));
  const result = await reconcileWorkerSite(site, { release: "r1", releaseRoot, stateRoot, wranglerPath: wrangler,
    probe: async () => ({ status: 502 }), healthOptions: { attempts: 2, delayMs: 1 } });
  assert.equal(result.ok, false);
  assert.equal(result.step, "rollback");
  assert.equal(result.rolledBackTo, before.version);
  const invoked = readFileSync(calls, "utf8").trim().split("\n").filter((line) => !line.includes("--dry-run"));
  assert.match(invoked[0], /^deploy --config wrangler.jsonc/u);
  assert.match(invoked[1], /^rollback 00000000-0000-0000-0000-000000000000 --config wrangler.jsonc --message health failed after release r1 --yes$/u);
  assert.deepEqual(JSON.parse(readFileSync(join(stateRoot, "a", "deployed.json"), "utf8")), before, "only a healthy deploy is recorded live");
  const steps = readFileSync(join(stateRoot, "a", "receipts.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line).step);
  assert.deepEqual(steps, ["build", "health", "rollback"]);
});

test("a deploy whose health holds is recorded live with its version", async () => {
  const { releaseRoot, stateRoot, calls, wrangler } = fixture();
  const [site] = workerSitesOf({ sites: [{ id: "a", directory: "sites/a", build: ["scripts/build.mjs"], health: ["https://a.test/"] }] });
  const result = await reconcileWorkerSite(site, { release: "r1", releaseRoot, stateRoot, wranglerPath: wrangler, probe: async () => ({ status: 200 }) });
  assert.equal(result.ok, true);
  assert.equal(result.version, "11111111-2222-3333-4444-555555555555");
  assert.equal(JSON.parse(readFileSync(join(stateRoot, "a", "deployed.json"), "utf8")).version, result.version);
  assert.equal(readFileSync(calls, "utf8").trim().split("\n").filter((line) => !line.includes("--dry-run")).length, 1, "one live deploy, no rollback");
  assert.ok(existsSync(join(stateRoot, "a", "build", "dist", "worker.mjs")));
});



const siteOf = () => workerSitesOf({ sites: [{ id: "a", directory: "sites/a", build: ["scripts/build.mjs"] }] })[0];
const invocations = (calls) => readFileSync(calls, "utf8").trim().split("\n");
const optionsOf = (f, release = "r1", extra = {}) => ({ release, releaseRoot: f.releaseRoot, stateRoot: f.stateRoot, wranglerPath: f.wrangler, ...extra });

test("a Worker-only source change is deployed even when assets and configuration are unchanged", async () => {
  const f = fixture();
  const site = siteOf();
  const first = await reconcileWorkerSite(site, optionsOf(f));
  writeFileSync(join(f.releaseRoot, "sites/a/src/worker.mjs"), 'export default { fetch() { return new Response("two"); } };');
  const second = await reconcileWorkerSite(site, optionsOf(f, "r2"));
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.step, "deploy");
  assert.notEqual(first.digest, second.digest);
  assert.equal(invocations(f.calls).filter((line) => !line.includes("--dry-run")).length, 2);
});

test("a changed imported release dependency changes the emitted artifact", async () => {
  const f = fixture();
  const first = await reconcileWorkerSite(siteOf(), optionsOf(f));
  writeFileSync(join(f.releaseRoot, "sites/a/node_modules/dependency.txt"), "dependency two");
  const second = await reconcileWorkerSite(siteOf(), optionsOf(f, "r2"));
  assert.equal(second.step, "deploy");
  assert.notEqual(first.digest, second.digest);
});

test("unrelated source notes do not redeploy identical compiled Worker and assets", async () => {
  const f = fixture();
  const first = await reconcileWorkerSite(siteOf(), optionsOf(f));
  writeFileSync(join(f.releaseRoot, "sites/a/notes.md"), "new editorial notes");
  const second = await reconcileWorkerSite(siteOf(), optionsOf(f, "r2"));
  assert.equal(second.ok, true);
  assert.equal(second.step, "current");
  assert.equal(second.digest, first.digest);
  assert.equal(invocations(f.calls).filter((line) => !line.includes("--dry-run")).length, 1);
  const count = invocations(f.calls).length;
  assert.equal((await reconcileWorkerSite(siteOf(), optionsOf(f, "r2"))).step, "current");
  assert.equal(invocations(f.calls).length, count, "same current release runs no compiler or deployer");
});

test("an old assets-only receipt cannot suppress qualification of the same release", async () => {
  const f = fixture();
  const state = join(f.stateRoot, "a");
  mkdirSync(state, { recursive: true });
  const old = { release: "r1", digest: "sha256:assets-only", version: "old-live" };
  for (const file of ["built.json", "deployed.json"]) writeFileSync(join(state, file), JSON.stringify(old));
  const result = await reconcileWorkerSite(siteOf(), optionsOf(f, "r1", { dryRun: true }));
  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(JSON.parse(readFileSync(join(state, "built.json"))).artifactVersion, 2);
  assert.notEqual(result.digest, old.digest);
  assert.deepEqual(JSON.parse(readFileSync(join(state, "deployed.json"))), old);
  assert.ok(invocations(f.calls).every((line) => line.includes("--dry-run")));
});

test("dry-run compiles real inputs but performs no live deploy, health probe or live receipt", async () => {
  const f = fixture();
  const site = workerSitesOf({ sites: [{ ...siteOf(), health: ["https://a.test/"] }] })[0];
  const result = await reconcileWorkerSite(site, optionsOf(f, "r1", { dryRun: true, probe: () => assert.fail("dry-run must not probe live health") }));
  assert.equal(result.dryRun, true);
  assert.ok(existsSync(join(f.stateRoot, "a/worker-bundle/worker.mjs")));
  assert.ok(!existsSync(join(f.stateRoot, "a/deployed.json")));
  assert.ok(invocations(f.calls).every((line) => line.includes("--dry-run")));
});

for (const failure of ["fail", "empty", "malformed", "missing-upload"]) test(`a ${failure} compilation cannot reuse stale output or become a live receipt`, async () => {
  const f = fixture();
  const state = join(f.stateRoot, "a");
  mkdirSync(join(state, "worker-bundle"), { recursive: true });
  writeFileSync(join(state, "worker-bundle/worker.mjs"), "stale bundle");
  const result = await reconcileWorkerSite(siteOf(), optionsOf(f, "r1", { environment: { ...process.env, TEST_BUNDLE_FAILURE: failure } }));
  assert.equal(result.ok, false);
  assert.equal(result.step, "bundle");
  assert.ok(!existsSync(join(state, "built.json")));
  assert.ok(!existsSync(join(state, "deployed.json")));
  if (existsSync(join(state, "worker-bundle/worker.mjs"))) assert.notEqual(readFileSync(join(state, "worker-bundle/worker.mjs"), "utf8"), "stale bundle");
  assert.ok(invocations(f.calls).every((line) => line.includes("--dry-run")));
  const receipt = JSON.parse(readFileSync(join(state, "receipts.jsonl"), "utf8").trim());
  assert.equal(receipt.step, "bundle");
  assert.equal(receipt.ok, false);
});

test("a pending build is recompiled before publication and rejects changed Worker source", async () => {
  const f = fixture();
  const site = siteOf();
  assert.equal((await reconcileWorkerSite(site, optionsOf(f, "r1", { dryRun: true }))).ok, true);
  writeFileSync(join(f.stateRoot, "a/build/src/worker.mjs"), "changed after qualification");
  const result = await reconcileWorkerSite(site, optionsOf(f));
  assert.equal(result.ok, false);
  assert.match(result.tail, /changed since it was built/u);
  assert.ok(!existsSync(join(f.stateRoot, "a/built.json")));
  assert.ok(!existsSync(join(f.stateRoot, "a/deployed.json")));
  assert.ok(invocations(f.calls).every((line) => line.includes("--dry-run")));
});

test("a source build failure invokes no compiler or live provider", async () => {
  const f = fixture();
  writeFileSync(join(f.releaseRoot, "sites/a/scripts/build.mjs"), "process.exit(2);");
  const result = await reconcileWorkerSite(siteOf(), optionsOf(f));
  assert.equal(result.ok, false);
  assert.equal(result.step, "build");
  assert.ok(!existsSync(f.calls));
});


function packagedFixture() {
  const f = fixture();
  const name = "@causeway-services/fixture-game";
  const directory = join(f.releaseRoot, "packages", name.replaceAll("/", "__"));
  mkdirSync(join(f.releaseRoot, "packages"));
  renameSync(join(f.releaseRoot, "sites/a"), directory);
  writeFileSync(join(directory, "package.json"), JSON.stringify({ name, version: "0.1.0" }));
  const source = { name, version: "0.1.0", repository: "causeway-services/fixture-game", commit: "1".repeat(40), path: "." };
  mkdirSync(join(f.releaseRoot, ".metadata"));
  const metadata = join(f.releaseRoot, ".metadata/sources.json");
  writeFileSync(metadata, JSON.stringify({ packages: [source] }));
  const [site] = workerSitesOf({ sites: [{ id: "a", package: name, build: ["scripts/build.mjs"] }] });
  return { ...f, name, directory, source, metadata, site };
}

test("a site can bind its admitted package without a legacy checkout path", async () => {
  const f = packagedFixture();
  const selected = workerSourceOf(f.site, f.releaseRoot);
  assert.equal(selected.directory, f.directory);
  assert.deepEqual(selected.source, { package: f.name, version: f.source.version, repository: f.source.repository, commit: f.source.commit, path: f.source.path });
  const result = await reconcileWorkerSite(f.site, optionsOf(f, "r1", { dryRun: true }));
  assert.equal(result.ok, true, result.tail);
  assert.equal(result.dryRun, true);
  const built = JSON.parse(readFileSync(join(f.stateRoot, "a/built.json")));
  assert.deepEqual(built.source, selected.source);
  assert.ok(!existsSync(join(f.releaseRoot, "sites/a")));
  assert.ok(!existsSync(join(f.stateRoot, "a/deployed.json")));
});

test("package site declarations refuse ambiguous or path-shaped identities", () => {
  for (const name of ["../game", "@scope/../game", "/game", "game\\name", "@scope", ""]) {
    assert.throws(() => workerSitesOf({ sites: [{ id: "a", package: name, build: ["build.mjs"] }] }), /package name/u);
  }
  assert.throws(() => workerSitesOf({ sites: [{ id: "a", package: "@scope/game", directory: "old/site", build: ["build.mjs"] }] }), /not both/u);
});

for (const refusal of ["missing", "duplicate", "wrong-name", "wrong-version", "unbound-commit"]) test(`package source ${refusal} refuses before build or provider execution`, async () => {
  const f = packagedFixture();
  if (refusal === "missing") writeFileSync(f.metadata, JSON.stringify({ packages: [] }));
  if (refusal === "duplicate") writeFileSync(f.metadata, JSON.stringify({ packages: [f.source, f.source] }));
  if (refusal === "wrong-name") writeFileSync(join(f.directory, "package.json"), JSON.stringify({ name: "@scope/other", version: "0.1.0" }));
  if (refusal === "wrong-version") writeFileSync(join(f.directory, "package.json"), JSON.stringify({ name: f.name, version: "9.0.0" }));
  if (refusal === "unbound-commit") writeFileSync(f.metadata, JSON.stringify({ packages: [{ ...f.source, commit: "main" }] }));
  const result = await reconcileWorkerSite(f.site, optionsOf(f));
  assert.equal(result.ok, false);
  assert.equal(result.step, "source");
  assert.ok(!existsSync(f.calls));
  assert.ok(!existsSync(join(f.stateRoot, "a/built.json")));
  assert.ok(!existsSync(join(f.stateRoot, "a/deployed.json")));
});

test("an unreceived site's source failure returns a receipt rather than aborting the following site", async () => {
  const f = fixture();
  const [missing] = workerSitesOf({ sites: [{ id: "missing", directory: "old/missing/site", build: ["build.mjs"] }] });
  const failed = await reconcileWorkerSite(missing, optionsOf(f, "r1", { dryRun: true }));
  const healthy = await reconcileWorkerSite(siteOf(), optionsOf(f, "r1", { dryRun: true }));
  assert.equal(failed.ok, false);
  assert.equal(failed.step, "source");
  assert.equal(healthy.ok, true);
});

test("an admitted site without its pinned build tool refuses without claiming a complete artifact", async () => {
  const f = packagedFixture();
  const result = await reconcileWorkerSite(f.site, { release: "r1", releaseRoot: f.releaseRoot, stateRoot: f.stateRoot, dryRun: true });
  assert.equal(result.ok, false);
  assert.equal(result.step, "bundle");
  assert.match(result.tail, /ENOENT/u);
  assert.ok(!existsSync(join(f.stateRoot, "a/built.json")));
  assert.ok(!existsSync(join(f.stateRoot, "a/deployed.json")));
});


test("relative release and state roots resolve before package dependency linking", async () => {
  const f = packagedFixture();
  const releaseRoot = relative(process.cwd(), f.releaseRoot);
  const stateRoot = relative(process.cwd(), f.stateRoot);
  assert.equal(workerSourceOf(f.site, releaseRoot).directory, f.directory);
  const result = await reconcileWorkerSite(f.site, { ...optionsOf(f, "r1", { dryRun: true }), releaseRoot, stateRoot });
  assert.equal(result.ok, true, result.tail);
  assert.ok(existsSync(join(f.stateRoot, "a/build/node_modules/dependency.txt")));
});
