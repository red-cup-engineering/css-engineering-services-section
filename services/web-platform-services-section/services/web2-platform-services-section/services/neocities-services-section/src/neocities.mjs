import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export const NEOCITIES_ORIGIN = "https://neocities.org";
/** Neocities serves this page for any missing path (not 404.html). */
export const NOT_FOUND_PAGE = "not_found.html";
/** The root index can be neither deleted nor renamed. */
export const PROTECTED_PATHS = Object.freeze(["index.html"]);
/** Neocities caps each file and each upload request at 100 MB; stay well under it. */
export const DEFAULT_BATCH_BYTES = 50 * 1024 * 1024;
export const DEFAULT_BATCH_FILES = 100;
const MAX_RESPONSE_BYTES = 20_000_000;
const SITENAME = /^[a-z0-9][a-z0-9_-]{0,31}$/iu;

export class NeocitiesApiError extends Error {
  constructor(operation, status, body) {
    super(`${operation} ${status}: ${body?.error_type ?? "error"}: ${body?.message ?? "no message"}`);
    this.name = "NeocitiesApiError";
    this.status = status;
    this.errorType = body?.error_type ?? null;
  }
}

function capability(fetchImpl, operation) {
  if (typeof fetchImpl !== "function") throw new TypeError(`${operation} requires an injected fetch capability`);
  return fetchImpl;
}

export function assertSitename(value) {
  if (typeof value !== "string" || !SITENAME.test(value)) throw new TypeError(`not a Neocities site name: ${JSON.stringify(value)}`);
  return value.toLowerCase();
}

export const siteOrigin = (sitename) => `https://${assertSitename(sitename)}.neocities.org/`;

/** Site paths are site-relative with forward slashes; anything else is refused before it reaches the API. */
export function assertSitePath(value) {
  if (typeof value !== "string" || !value || value.startsWith("/") || value.includes("\\")
    || value.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new TypeError(`not a site-relative path: ${JSON.stringify(value)}`);
  }
  return value;
}

function authorization({ token, basic }) {
  if (typeof token === "string" && token) return `Bearer ${token}`;
  if (basic && typeof basic.sitename === "string" && typeof basic.password === "string") {
    return `Basic ${Buffer.from(`${assertSitename(basic.sitename)}:${basic.password}`).toString("base64")}`;
  }
  throw new TypeError("a Neocities call requires an API token (or, for apiKey only, site credentials)");
}

async function call(operation, { fetch: fetchImpl, token, basic, anonymous = false, origin = NEOCITIES_ORIGIN, method = "GET", path, query, body }) {
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  const headers = anonymous ? {} : { authorization: authorization({ token, basic }) };
  const response = await capability(fetchImpl, operation)(url, { method, headers, body });
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new TypeError(`${operation} response exceeds the bounded response limit`);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new NeocitiesApiError(operation, response.status, { error_type: "malformed_response", message: text.slice(0, 300) });
  }
  if (!response.ok || parsed?.result !== "success") throw new NeocitiesApiError(operation, response.status, parsed);
  return parsed;
}

/** The authenticated site's public record; also how a key proves which site it belongs to. */
export async function siteInfo(options) {
  return (await call("info", { ...options, path: "/api/info" })).info;
}

/** Any site's public record, without credentials; null when no site has that name. */
export async function publicSiteInfo({ sitename, ...options }) {
  try {
    return (await call("info", { ...options, anonymous: true, path: "/api/info", query: { sitename: assertSitename(sitename) } })).info;
  } catch (error) {
    if (error instanceof NeocitiesApiError && error.errorType === "site_not_found") return null;
    throw error;
  }
}

/**
 * Exchange site credentials for the site's API key. Neocities refuses password
 * auth ("stale account") for a site never changed through its web UI, which
 * includes every newly created site: take that site's key from its settings page.
 */
export async function apiKey({ sitename, password, ...options }) {
  return (await call("key", { ...options, basic: { sitename, password }, path: "/api/key" })).api_key;
}

export async function listFiles(options) {
  return (await call("list", { ...options, path: "/api/list" })).files;
}

export async function uploadFiles({ files, ...options }) {
  if (!Array.isArray(files) || files.length === 0) throw new TypeError("upload requires at least one file");
  const form = new FormData();
  for (const file of files) form.append(assertSitePath(file.path), new Blob([file.bytes]), file.path.split("/").at(-1));
  return call("upload", { ...options, method: "POST", path: "/api/upload", body: form });
}

export async function deleteFiles({ paths, ...options }) {
  if (!Array.isArray(paths) || paths.length === 0) throw new TypeError("delete requires at least one path");
  const form = new URLSearchParams();
  for (const path of paths) {
    if (PROTECTED_PATHS.includes(assertSitePath(path))) throw new TypeError(`Neocities forbids deleting ${path}`);
    form.append("filenames[]", path);
  }
  return call("delete", { ...options, method: "POST", path: "/api/delete", body: form });
}

export const sha1Hex = (bytes) => createHash("sha1").update(bytes).digest("hex");

/**
 * Read a built site into upload records. Dotfiles are skipped (a build's own
 * bookkeeping, never site content). A build's 404.html is also served as
 * not_found.html, the name Neocities uses, unless the build already has one.
 */
export async function readSiteTree(dir) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const bytes = await readFile(full);
        files.push({ path: relative(dir, full).split(sep).join("/"), bytes, size: bytes.length, sha1: sha1Hex(bytes) });
      }
    }
  }
  await walk(dir);
  const notFound = files.find((file) => file.path === "404.html");
  if (notFound && !files.some((file) => file.path === NOT_FOUND_PAGE)) files.push({ ...notFound, path: NOT_FOUND_PAGE });
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** A content address for the whole published tree: sha256 over sorted "path sha1" lines. */
export const treeDigest = (files) =>
  `sha256:${createHash("sha256").update(files.map((file) => `${file.path} ${file.sha1}\n`).sort().join("")).digest("hex")}`;

/**
 * Decide what to upload and delete. Pure. With prune, a remote directory that
 * holds no local file is deleted whole; a remote file with no local counterpart
 * inside a kept directory is deleted alone. The protected root index is never deleted.
 */
export function planSync({ local, remote, prune = true }) {
  const localByPath = new Map(local.map((file) => [assertSitePath(file.path), file]));
  if (!localByPath.has("index.html")) throw new TypeError("a Neocities site must publish a root index.html");
  const remoteFiles = new Map(remote.filter((entry) => !entry.is_directory).map((entry) => [entry.path, entry]));
  const upload = [];
  const unchanged = [];
  for (const [path, file] of localByPath) (remoteFiles.get(path)?.sha1_hash === file.sha1 ? unchanged : upload).push(path);
  const remove = [];
  if (prune) {
    const localDirs = new Set();
    for (const path of localByPath.keys()) {
      const parts = path.split("/");
      for (let i = 1; i < parts.length; i += 1) localDirs.add(parts.slice(0, i).join("/"));
    }
    const doomedDirs = remote
      .filter((entry) => entry.is_directory && !localDirs.has(entry.path))
      .map((entry) => entry.path)
      .sort();
    const topDirs = doomedDirs.filter((dir) => !doomedDirs.some((other) => other !== dir && dir.startsWith(`${other}/`)));
    const covered = (path) => topDirs.some((dir) => path.startsWith(`${dir}/`));
    remove.push(...topDirs);
    for (const path of remoteFiles.keys()) {
      if (!localByPath.has(path) && !PROTECTED_PATHS.includes(path) && !covered(path)) remove.push(path);
    }
  }
  return { upload: upload.sort(), delete: remove.sort(), unchanged: unchanged.sort() };
}

/** Split uploads into sequential requests bounded by bytes and file count. */
export function batchUploads(files, { maxBytes = DEFAULT_BATCH_BYTES, maxFiles = DEFAULT_BATCH_FILES } = {}) {
  const batches = [];
  let current = [];
  let bytes = 0;
  for (const file of files) {
    if (file.size > maxBytes) throw new TypeError(`${file.path} (${file.size} bytes) exceeds the per-request limit`);
    if (current.length && (bytes + file.size > maxBytes || current.length >= maxFiles)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(file);
    bytes += file.size;
  }
  if (current.length) batches.push(current);
  return batches;
}

/**
 * Publish a built directory to one Neocities site and return a deployment receipt.
 * The key must belong to `sitename` (checked first, so a wrong key can't overwrite
 * another site). Requests run one at a time, as Neocities asks. After writing,
 * the remote listing is read back and every published hash must match. Like
 * rsync's --max-delete, a plan deleting more than `maxDelete` paths is refused
 * before any write (a wrong or empty build would otherwise wipe the site).
 */
export async function publishSite({ sitename, dir, prune = true, dryRun = false, maxDelete = Infinity, now = () => new Date(), ...options }) {
  const expected = assertSitename(sitename);
  const info = await siteInfo(options);
  if (info.sitename?.toLowerCase() !== expected) throw new TypeError(`the API key belongs to ${info.sitename}, not ${expected}`);
  const local = await readSiteTree(dir);
  const plan = planSync({ local, remote: await listFiles(options), prune });
  const byPath = new Map(local.map((file) => [file.path, file]));
  const receipt = {
    type: "NeocitiesDeploymentReceipt",
    version: 1,
    sitename: expected,
    origin: siteOrigin(expected),
    at: now().toISOString(),
    dryRun,
    prune,
    treeDigest: treeDigest(local),
    fileCount: local.length,
    uploaded: plan.upload.map((path) => ({ path, sha1: byPath.get(path).sha1, size: byPath.get(path).size })),
    deleted: plan.delete,
    unchanged: plan.unchanged.length,
    verified: false,
  };
  if (dryRun) return receipt;
  if (plan.delete.length > maxDelete) throw new Error(`refusing to delete ${plan.delete.length} paths (limit ${maxDelete}); check the build, or raise the limit`);
  for (const batch of batchUploads(plan.upload.map((path) => byPath.get(path)))) await uploadFiles({ ...options, files: batch });
  if (plan.delete.length) await deleteFiles({ ...options, paths: plan.delete });
  const after = planSync({ local, remote: await listFiles(options), prune });
  if (after.upload.length || after.delete.length) {
    throw new Error(`Neocities did not converge: ${after.upload.length} to upload and ${after.delete.length} to delete remain (${[...after.upload, ...after.delete].slice(0, 5).join(", ")})`);
  }
  return { ...receipt, verified: true };
}
