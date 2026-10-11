/**
 * Worker sites deploy from the release the node runs, never from a hand.
 *
 * A deployment declares its Cloudflare Worker sites (`worker-sites.json`): each names its directory
 * in the release tree, the node script that builds it, and its Wrangler configuration. A site is
 * built from the running release in a build directory of its own (the release tree stays as it was
 * released), and what the build ships, its output, configuration and emitted Worker, is content-addressed.
 * The site is deployed only when that address differs from the one last deployed, so a release
 * that does not change a site deploys nothing, and a release that does deploys it once.
 *
 * Every step is receipted in the site's state directory: `built.json` (the release last built and
 * what it ships), `deployed.json` (what is live and the Worker version it went live as) and
 * `receipts.jsonl` (every build and deploy, appended). Wrangler is the site's own pinned one.
 *
 * A site that declares `health` URLs is not live until they answer: after a deploy each is probed,
 * and when one still fails the Worker is rolled back to the version last recorded live, so a merge
 * that breaks a site leaves the previous release serving. Only a healthy deploy is recorded live.
 * @module
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

/** The paths of a site that are never copied into its build: the build makes them or links them. */
const UNCOPIED = new Set(["node_modules", "dist", ".wrangler", ".tmp"]);
const ARTIFACT_VERSION = 2;
const ID = /^[a-z0-9][a-z0-9-]*$/u;
const PACKAGE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;

/**
 * The declared sites of a deployment, checked.
 * @param {unknown} declaration the parsed worker-sites.json
 * @returns {ReadonlyArray<{id: string, directory?: string, package?: string, build: ReadonlyArray<string>, config: string, output: string}>}
 */
export function workerSitesOf(declaration) {
  const sites = declaration?.sites;
  if (!Array.isArray(sites)) throw new TypeError("worker-sites: a declaration lists its sites");
  const seen = new Set();
  return Object.freeze(sites.map((site) => {
    if (typeof site?.id !== "string" || !ID.test(site.id)) throw new TypeError(`worker-sites: site id ${JSON.stringify(site?.id)} is not a slug`);
    if (seen.has(site.id)) throw new TypeError(`worker-sites: site ${site.id} is declared twice`);
    seen.add(site.id);
    const inside = (path, what) => {
      if (typeof path !== "string" || path.length === 0 || isAbsolute(path) || path.split(/[\\/]/u).includes("..")) throw new TypeError(`worker-sites: ${site.id}'s ${what} must be a relative path inside it`);
      return path;
    };
    if (!Array.isArray(site.build) || site.build.length === 0 || !site.build.every((argument) => typeof argument === "string")) throw new TypeError(`worker-sites: ${site.id} names the node script that builds it`);
    inside(site.build[0], "build script");
    const health = site.health ?? [];
    if (!Array.isArray(health) || !health.every((url) => typeof url === "string" && /^https:\/\/[^/]/u.test(url))) throw new TypeError(`worker-sites: ${site.id}'s health lists https URLs`);
    const packaged = site.package !== undefined;
    if (packaged && (typeof site.package !== "string" || !PACKAGE.test(site.package))) throw new TypeError(`worker-sites: ${site.id}'s package must be a package name`);
    if (packaged && site.directory !== undefined) throw new TypeError(`worker-sites: ${site.id} names a package or directory, not both`);
    return Object.freeze({ id: site.id, ...(packaged ? { package: site.package } : { directory: inside(site.directory, "directory") }), build: Object.freeze([...site.build]), config: inside(site.config ?? "wrangler.jsonc", "configuration"), output: inside(site.output ?? "dist", "build output"), health: Object.freeze([...health]) });
  }));
}

/** Resolve a package from the sealed release's actual source receipt, never a checkout alias. */
export function workerSourceOf(site, releaseRoot) {
  if (site.package === undefined) return Object.freeze({ directory: resolve(releaseRoot, site.directory) });
  const declaration = JSON.parse(readFileSync(join(releaseRoot, ".metadata", "sources.json"), "utf8"));
  const selected = declaration?.packages?.filter((entry) => entry?.name === site.package);
  if (!Array.isArray(selected) || selected.length !== 1) throw new TypeError(`worker-sites: ${site.package} needs exactly one admitted source in this release`);
  const source = selected[0];
  if (typeof source.repository !== "string" || !source.repository || !/^[a-f0-9]{40}$/u.test(source.commit ?? "") || typeof source.path !== "string") throw new TypeError(`worker-sites: ${site.package} has incomplete source provenance`);
  // This is prepare-sources/assemble's existing package layout. The original
  // repository path is provenance; it is not a directory inside the release.
  const directory = resolve(releaseRoot, "packages", site.package.replaceAll("/", "__"));
  const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  if (manifest.name !== site.package || manifest.version !== source.version) throw new TypeError(`worker-sites: ${site.package} does not match its admitted package manifest`);
  return Object.freeze({ directory, source: Object.freeze({ package: source.name, version: source.version, repository: source.repository, commit: source.commit, path: source.path }) });
}

/** Every file under `root`, as sorted paths relative to it with `/` separators. */
function filesUnder(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(relative(root, path).split(sep).join("/"));
    }
  };
  walk(root);
  return files.sort();
}

/**
 * Read the provider's actual multipart upload, not its diagnostic output directory.
 * The random transport boundary and part order are not deployment content. Part
 * names, media types, filenames and every body are. No filename is omitted.
 */
async function uploadPartsOf(workerDirectory) {
  if (typeof workerDirectory !== "string") throw new TypeError("worker-sites: the emitted Worker upload is required");
  const bytes = readFileSync(`${workerDirectory}.multipart`);
  const firstLine = bytes.subarray(0, bytes.indexOf("\r\n")).toString("ascii");
  if (!/^--[0-9A-Za-z'()+_,./:=?-]{1,70}$/u.test(firstLine)) throw new TypeError("worker-sites: Wrangler emitted an invalid Worker upload");
  const form = await new Response(bytes, { headers: { "content-type": `multipart/form-data; boundary="${firstLine.slice(2)}"` } }).formData();
  const parts = [];
  const names = new Set();
  for (const [name, value] of form) {
    if (names.has(name)) throw new TypeError(`worker-sites: duplicate Worker upload part ${name}`);
    names.add(name);
    const file = typeof value !== "string";
    let body = file ? Buffer.from(await value.arrayBuffer()) : Buffer.from(value);
    if (file && value.type === "application/source-map") {
      const map = JSON.parse(body);
      // Wrangler sets sourceRoot to its local output directory for diagnostics.
      // Relativize precisely that field in the digest, preserving every mapping,
      // source, source content, name and extension. The upload itself is untouched.
      if (map.version === 3 && map.sourceRoot === resolve(workerDirectory)) {
        body = Buffer.from(JSON.stringify({ ...map, sourceRoot: "." }));
      }
    }
    parts.push({ name, filename: file ? value.name : null, type: file ? value.type : null, body });
  }
  const metadata = parts.find((part) => part.name === "metadata");
  const entry = metadata && JSON.parse(metadata.body);
  if (!entry || !parts.some((part) => part.name === (entry.main_module ?? entry.body_part) && part.filename !== null && part.body.length > 0)) {
    throw new TypeError("worker-sites: Wrangler emitted no Worker upload entry");
  }
  return parts.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

/**
 * The content address of the declared assets/build output and configuration plus
 * the pinned Wrangler's exact upload parts from deploy --dry-run --outfile.
 * Unuploaded diagnostic maps/README never enter it; uploaded maps/modules do.
 * @param {string} buildDirectory the site's build directory
 * @param {{config: string, output: string}} site
 * @param {string} workerDirectory Wrangler's fresh --outdir; --outfile is <outdir>.multipart
 * @returns {Promise<string>} `sha256:<hex>`
 */
export async function shippedDigestOf(buildDirectory, site, workerDirectory) {
  const hash = createHash("sha256");
  const add = (label, bytes) => { hash.update(`${label}\0${bytes.length}\0`); hash.update(bytes); };
  add(`config:${site.config}`, readFileSync(join(buildDirectory, site.config)));
  const output = join(buildDirectory, site.output);
  for (const path of filesUnder(output)) add(`output:${path}`, readFileSync(join(output, path)));
  for (const part of await uploadPartsOf(workerDirectory)) {
    add(`worker:${JSON.stringify([part.name, part.filename, part.type])}`, part.body);
  }
  return `sha256:${hash.digest("hex")}`;
}

/**
 * What a site's next step is, from its receipts and the running release: build it (the release
 * has not been built), deploy it (what the release ships is not what is live), or nothing.
 * @param {{release: string, built?: {release: string, digest: string}, deployed?: {digest: string}}} state
 * @returns {"build" | "deploy" | "current"}
 */
export function nextStepOf({ release, built, deployed }) {
  if (built === undefined || built.release !== release) return "build";
  if (deployed === undefined || deployed.digest !== built.digest) return "deploy";
  return "current";
}

/** The Worker version Wrangler reports a deploy went live as. */
export const versionOfDeploy = (output) => /Current Version ID:\s*([0-9a-f-]{36})/iu.exec(output)?.[1];

/**
 * Whether every health URL answers below 400, each retried until it does or its attempts run out
 * (a fresh Worker version can take a few seconds to reach every edge).
 * @param {ReadonlyArray<string>} urls
 * @returns {Promise<{ok: boolean, failures: ReadonlyArray<{url: string, status?: number, error?: string}>}>}
 */
export async function healthOf(urls, { probe = globalThis.fetch, attempts = 5, delayMs = 6_000, timeoutMs = 15_000 } = {}) {
  const failures = [];
  for (const url of urls) {
    let last;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) await new Promise((wake) => setTimeout(wake, delayMs));
      try {
        const response = await probe(url, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers: { "cache-control": "no-cache" } });
        last = { url, status: response.status };
        if (response.status < 400) { last = undefined; break; }
      } catch (error) {
        last = { url, error: String(error?.message ?? error) };
      }
    }
    if (last !== undefined) failures.push(Object.freeze(last));
  }
  return Object.freeze({ ok: failures.length === 0, failures: Object.freeze(failures) });
}

/** Wrangler's arguments to put a site's Worker back on a version it went live as before. */
export const rollbackArgumentsOf = (site, version, reason) => Object.freeze(["rollback", version, "--config", site.config, "--message", reason.slice(0, 100), "--yes"]);

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined);
function writeJson(path, value) {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

function runQuietly(command, args, { cwd, env, timeoutMs }) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    // Clear the deadline on spawn failure too. Node's built-in spawn timeout can
    // retain its timer after ENOENT, stalling the entire site job until it expires.
    const deadline = timeoutMs > 0 ? setTimeout(() => child.kill(), timeoutMs) : undefined;
    deadline?.unref();
    let output = "";
    const finish = (result) => { clearTimeout(deadline); resolvePromise(result); };
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("close", (code, signal) => finish({ code, signal, output }));
    child.on("error", (error) => finish({ code: null, signal: null, output: String(error.message) }));
  });
}

/**
 * Bring one declared site to what the running release ships: build it when the release is new to
 * it, deploy it when what it ships is not what is live, and roll it back when its health URLs do
 * not answer after the deploy. `dryRun` builds but does not deploy.
 * @returns {Promise<{site: string, step: string, release: string, digest?: string, version?: string, ok: boolean, tail?: string}>}
 */
export async function reconcileWorkerSite(site, { release, releaseRoot, stateRoot, environment = process.env, node = process.execPath, dryRun = false, timeoutMs = 600_000, probe = globalThis.fetch, healthOptions = {}, wranglerPath }) {
  const state = resolve(stateRoot, site.id);
  mkdirSync(state, { recursive: true });
  const receipt = (entry) => appendFileSync(join(state, "receipts.jsonl"), `${JSON.stringify({ site: site.id, at: new Date().toISOString(), ...entry })}\n`);
  let built = readJson(join(state, "built.json"));
  // Earlier receipts covered assets/configuration only, not what Wrangler actually uploads.
  if (built?.artifactVersion !== ARTIFACT_VERSION) built = undefined;
  const deployed = readJson(join(state, "deployed.json"));
  const build = join(state, "build");
  const worker = join(state, "worker-bundle");
  const wrangler = wranglerPath ?? join(build, "node_modules", ".bin", "wrangler");
  const providerEnvironment = { ...environment, WRANGLER_SEND_METRICS: "false", CI: "true" };
  let bundled = false;
  let bundleDigest;
  const bundle = async () => {
    // A stale bundle must never make a failed/no-output compiler look successful.
    rmSync(worker, { recursive: true, force: true });
    rmSync(`${worker}.multipart`, { force: true });
    const ran = await runQuietly(wrangler, ["deploy", "--dry-run", "--config", site.config, "--outdir", worker, "--outfile", `${worker}.multipart`], { cwd: build, env: providerEnvironment, timeoutMs });
    let invalid;
    if (ran.code === 0) {
      try { bundleDigest = await shippedDigestOf(build, site, worker); }
      catch (error) { invalid = String(error?.message ?? error); }
    }
    if (ran.code !== 0 || invalid) {
      const tail = ran.code !== 0 ? ran.output.slice(-2000) : invalid;
      receipt({ step: "bundle", release, ok: false, tail });
      return Object.freeze({ site: site.id, step: "bundle", release, ok: false, tail });
    }
    bundled = true;
    return undefined;
  };
  let step = nextStepOf({ release, built, deployed });
  if (step === "current") return Object.freeze({ site: site.id, step, release, digest: deployed.digest, ok: true });
  if (step === "build") {
    let selected;
    try {
      selected = workerSourceOf(site, releaseRoot);
      if (!existsSync(join(selected.directory, site.build[0]))) throw new TypeError(`worker-sites: ${site.id} has no ${site.build[0]} in release ${release}`);
    } catch (error) {
      const tail = String(error?.message ?? error);
      receipt({ step: "source", release, ok: false, tail });
      return Object.freeze({ site: site.id, step: "source", release, ok: false, tail });
    }
    const source = selected.directory;
    rmSync(build, { recursive: true, force: true });
    cpSync(source, build, { recursive: true, filter: (path) => !UNCOPIED.has(relative(source, path).split(sep)[0]) });
    // The release's own installed dependencies, linked: the build resolves exactly what was released.
    symlinkSync(join(source, "node_modules"), join(build, "node_modules"), "dir");
    const ran = await runQuietly(node, site.build, { cwd: build, env: environment, timeoutMs });
    if (ran.code !== 0) {
      receipt({ step: "build", release, ok: false, tail: ran.output.slice(-2000) });
      return Object.freeze({ site: site.id, step: "build", release, ok: false, tail: ran.output.slice(-2000) });
    }
    const failedBundle = await bundle();
    if (failedBundle) return failedBundle;
    built = { release, artifactVersion: ARTIFACT_VERSION, ...(selected.source ? { source: selected.source } : {}), digest: bundleDigest, at: new Date().toISOString() };
    writeJson(join(state, "built.json"), built);
    receipt({ step: "build", release, ...(selected.source ? { source: selected.source } : {}), digest: built.digest, ok: true });
    step = nextStepOf({ release, built, deployed });
    if (step === "current") return Object.freeze({ site: site.id, step, release, digest: built.digest, ok: true });
  }
  if (!existsSync(build)) {
    rmSync(join(state, "built.json"), { force: true });
    return Object.freeze({ site: site.id, step: "deploy", release, ok: false, tail: "build directory changed since it was built" });
  }
  // A retry must compile again: hashing an old bundle misses changed Worker sources or dependencies.
  if (!bundled) {
    const failedBundle = await bundle();
    if (failedBundle) return failedBundle;
  }
  if (bundleDigest !== built.digest) {
    // The build directory no longer holds what was built: build it again on the next run.
    rmSync(join(state, "built.json"), { force: true });
    return Object.freeze({ site: site.id, step: "deploy", release, ok: false, tail: "build directory changed since it was built" });
  }
  if (dryRun) return Object.freeze({ site: site.id, step: "deploy", release, digest: built.digest, ok: true, dryRun: true });
  const ran = await runQuietly(wrangler, ["deploy", "--config", site.config], { cwd: build, env: providerEnvironment, timeoutMs });
  const version = versionOfDeploy(ran.output);
  if (ran.code !== 0) {
    receipt({ step: "deploy", release, digest: built.digest, ok: false, tail: ran.output.slice(-2000) });
    return Object.freeze({ site: site.id, step: "deploy", release, digest: built.digest, ok: false, tail: ran.output.slice(-2000) });
  }
  if (site.health.length > 0) {
    const health = await healthOf(site.health, { probe, ...healthOptions });
    if (!health.ok) {
      receipt({ step: "health", release, digest: built.digest, ...(version === undefined ? {} : { version }), ok: false, failures: health.failures });
      const previous = deployed?.version;
      if (previous === undefined) {
        return Object.freeze({ site: site.id, step: "health", release, digest: built.digest, ok: false, failures: health.failures, tail: "no earlier live version is recorded to roll back to" });
      }
      const back = await runQuietly(wrangler, rollbackArgumentsOf(site, previous, `health failed after release ${release.slice(0, 12)}`), { cwd: build, env: providerEnvironment, timeoutMs });
      receipt({ step: "rollback", release, to: previous, ok: back.code === 0, ...(back.code === 0 ? {} : { tail: back.output.slice(-2000) }) });
      return Object.freeze({ site: site.id, step: "rollback", release, digest: built.digest, ok: false, rolledBackTo: previous, rollbackOk: back.code === 0, failures: health.failures });
    }
  }
  writeJson(join(state, "deployed.json"), { release, digest: built.digest, ...(version === undefined ? {} : { version }), at: new Date().toISOString() });
  receipt({ step: "deploy", release, digest: built.digest, ...(version === undefined ? {} : { version }), ok: true });
  return Object.freeze({ site: site.id, step: "deploy", release, digest: built.digest, ...(version === undefined ? {} : { version }), ok: true });
}
