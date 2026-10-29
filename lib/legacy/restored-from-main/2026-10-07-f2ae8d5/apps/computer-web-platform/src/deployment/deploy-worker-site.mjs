/**
 * Worker sites deploy from the release the node runs, never from a hand.
 *
 * A deployment declares its Cloudflare Worker sites (`worker-sites.json`): each names its directory
 * in the release tree, the node script that builds it, and its Wrangler configuration. A site is
 * built from the running release in a build directory of its own (the release tree stays as it was
 * released), and what the build ships, its output and its configuration, is content-addressed.
 * The site is deployed only when that address differs from the one last deployed, so a release
 * that does not change a site deploys nothing, and a release that does deploys it once.
 *
 * Every step is receipted in the site's state directory: `built.json` (the release last built and
 * what it ships), `deployed.json` (what is live and the Worker version it went live as) and
 * `receipts.jsonl` (every build and deploy, appended). Wrangler is the site's own pinned one.
 * @module
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

/** The paths of a site that are never copied into its build: the build makes them or links them. */
const UNCOPIED = new Set(["node_modules", "dist", ".wrangler", ".tmp"]);
const ID = /^[a-z0-9][a-z0-9-]*$/u;

/**
 * The declared sites of a deployment, checked.
 * @param {unknown} declaration the parsed worker-sites.json
 * @returns {ReadonlyArray<{id: string, directory: string, build: ReadonlyArray<string>, config: string, output: string}>}
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
    return Object.freeze({ id: site.id, directory: inside(site.directory, "directory"), build: Object.freeze([...site.build]), config: inside(site.config ?? "wrangler.jsonc", "configuration"), output: inside(site.output ?? "dist", "build output") });
  }));
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
 * The content address of what a built site ships: its build output and its configuration, each file
 * by its path and bytes. Two builds that ship the same bytes have the same address.
 * @param {string} buildDirectory the site's build directory
 * @param {{config: string, output: string}} site
 * @returns {string} `sha256:<hex>`
 */
export function shippedDigestOf(buildDirectory, site) {
  const hash = createHash("sha256");
  const add = (label, bytes) => { hash.update(`${label}\0${bytes.length}\0`); hash.update(bytes); };
  add(`config:${site.config}`, readFileSync(join(buildDirectory, site.config)));
  const output = join(buildDirectory, site.output);
  for (const path of filesUnder(output)) add(`output:${path}`, readFileSync(join(output, path)));
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

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined);
function writeJson(path, value) {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

function runQuietly(command, args, { cwd, env, timeoutMs }) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("close", (code, signal) => resolvePromise({ code, signal, output }));
    child.on("error", (error) => resolvePromise({ code: null, signal: null, output: String(error.message) }));
  });
}

/**
 * Bring one declared site to what the running release ships: build it when the release is new to
 * it, deploy it when what it ships is not what is live. `dryRun` builds but does not deploy.
 * @returns {Promise<{site: string, step: string, release: string, digest?: string, version?: string, ok: boolean, tail?: string}>}
 */
export async function reconcileWorkerSite(site, { release, releaseRoot, stateRoot, environment = process.env, node = process.execPath, dryRun = false, timeoutMs = 600_000 }) {
  const state = join(stateRoot, site.id);
  mkdirSync(state, { recursive: true });
  const receipt = (entry) => appendFileSync(join(state, "receipts.jsonl"), `${JSON.stringify({ site: site.id, at: new Date().toISOString(), ...entry })}\n`);
  let built = readJson(join(state, "built.json"));
  const deployed = readJson(join(state, "deployed.json"));
  const build = join(state, "build");
  let step = nextStepOf({ release, built, deployed });
  if (step === "current") return Object.freeze({ site: site.id, step, release, digest: deployed.digest, ok: true });
  if (step === "build") {
    const source = resolve(releaseRoot, site.directory);
    if (!existsSync(join(source, site.build[0]))) throw new TypeError(`worker-sites: ${site.id} has no ${site.build[0]} in release ${release}`);
    rmSync(build, { recursive: true, force: true });
    cpSync(source, build, { recursive: true, filter: (path) => !UNCOPIED.has(relative(source, path).split(sep)[0]) });
    // The release's own installed dependencies, linked: the build resolves exactly what was released.
    symlinkSync(join(source, "node_modules"), join(build, "node_modules"), "dir");
    const ran = await runQuietly(node, site.build, { cwd: build, env: environment, timeoutMs });
    if (ran.code !== 0) {
      receipt({ step: "build", release, ok: false, tail: ran.output.slice(-2000) });
      return Object.freeze({ site: site.id, step: "build", release, ok: false, tail: ran.output.slice(-2000) });
    }
    built = { release, digest: shippedDigestOf(build, site), at: new Date().toISOString() };
    writeJson(join(state, "built.json"), built);
    receipt({ step: "build", release, digest: built.digest, ok: true });
    step = nextStepOf({ release, built, deployed });
    if (step === "current") return Object.freeze({ site: site.id, step, release, digest: built.digest, ok: true });
  }
  if (dryRun) return Object.freeze({ site: site.id, step: "deploy", release, digest: built.digest, ok: true, dryRun: true });
  if (!existsSync(build) || shippedDigestOf(build, site) !== built.digest) {
    // The build directory no longer holds what was built: build it again on the next run.
    rmSync(join(state, "built.json"), { force: true });
    return Object.freeze({ site: site.id, step: "deploy", release, ok: false, tail: "build directory changed since it was built" });
  }
  const wrangler = join(build, "node_modules", ".bin", "wrangler");
  const ran = await runQuietly(wrangler, ["deploy", "--config", site.config], { cwd: build, env: { ...environment, WRANGLER_SEND_METRICS: "false", CI: "true" }, timeoutMs });
  const version = versionOfDeploy(ran.output);
  if (ran.code !== 0) {
    receipt({ step: "deploy", release, digest: built.digest, ok: false, tail: ran.output.slice(-2000) });
    return Object.freeze({ site: site.id, step: "deploy", release, digest: built.digest, ok: false, tail: ran.output.slice(-2000) });
  }
  writeJson(join(state, "deployed.json"), { release, digest: built.digest, ...(version === undefined ? {} : { version }), at: new Date().toISOString() });
  receipt({ step: "deploy", release, digest: built.digest, ...(version === undefined ? {} : { version }), ok: true });
  return Object.freeze({ site: site.id, step: "deploy", release, digest: built.digest, ...(version === undefined ? {} : { version }), ok: true });
}
