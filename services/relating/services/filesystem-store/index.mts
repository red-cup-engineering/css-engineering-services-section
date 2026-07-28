// holography/projecting/store — the thin filesystem binding for the three tiers.
//
// THIS IS THE ONLY EFFECTFUL FILE in projecting/: the one place that imports
// node:fs. Every other module here is pure mathematics over carriers. It
// congregates the fs idioms re-derived across the corpus: content-dedup append,
// ENOENT-tolerant read, and atomic temp-write + rename for the projected tiers.
//
//   <logDir>/<feed>.jsonl      append-only EAVT witnesses (the boundary)
//   <stateDir>/<feed>.json     the current view, projected from the log (bulk)
//   <recordDir>/<feed>.jsonl   settled invariants (Datoms), log compacted (bulk)
//   <contentDir>/<term>/<term>.<type>  per-entity content cut of the bulk

import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, type Stats } from "node:fs";
import path from "node:path";

import { canonical, requireJsonValue, serializeLines, type JsonValue } from "../../src/codecs/text/json/core.mjs";
import { address } from "../../src/writing/path.mjs";
import type { Resource } from "../../src/projections/kernel.mjs";
import { projectContentDocuments, type ContentDocument, type ContentProjection } from "../../src/ledger/content.mjs";
import type { Feed } from "../../src/ledger/feed.mjs";
import { projectStateView, type StateView } from "../../src/ledger/state.mjs";
import type { Witness } from "../../src/ledger/cells.mjs";
import {
  eavtId,
  eavtRecord,
  parse as parseEavt,
  serialize as serializeEavt,
  serializeDatoms,
  type Datom,
  type EAVT,
  type EAVTRecord,
} from "../../src/codecs/text/json/jsonl/eavt/index.mjs";

/**
 * Filesystem binding for one witness-ledger store.
 *
 * The first three tiers are required: append-only log, projected state, and
 * settled records. `contentDir` is optional because not every feed needs a
 * per-entity document cut. The type is deliberately just paths; policy such as
 * retention, locking, backup, and cross-process coordination belongs above this
 * small Node binding.
 */
export interface WitnessStore {
  /** Append-only EAVT witness logs, one `<feed>.jsonl` file per feed. */
  readonly logDir: string;
  /** Current read-model snapshots, one `<feed>.json` file per feed. */
  readonly stateDir: string;
  /** Settled/compacted record logs, one `<feed>.jsonl` file per feed. */
  readonly recordDir: string;
  /** Optional per-entity content cut rooted at term-addressed documents. */
  readonly contentDir?: string;
}

/**
 * Return the flat leaf path of a feed file under one tier directory.
 */
export function feedPath(dir: string, feed: string, type: string): string {
  return path.join(dir, `${feed}.${type}`);
}

/** Atomically write content: temp file + rename (atomic on POSIX), so a crash
 *  mid-write never corrupts the target. */
export function writeFileAtomic(filePath: string, content: string): void {
  const tmp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    writeFileSync(tmp, content, "utf8");
    renameSync(tmp, filePath);
  } catch (error) {
    try {
      rmSync(tmp, { force: true });
    } catch {
      // Best-effort cleanup: preserve the original write/rename failure.
    }
    throw error;
  }
}

/** Append records as newline-delimited canonical JSON. Best-effort (advisory):
 *  write errors are swallowed, never thrown. No-op on empty input. */
export function appendJsonl(filePath: string, records: readonly unknown[]): void {
  if (records.length === 0) return;
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    appendFileSync(filePath, serializeLines(records.map((r) => requireJsonValue(r, "jsonl record"))), "utf8");
  } catch {
    // non-fatal: persistence is advisory
  }
}

/** Read newline-delimited JSON, skipping malformed lines; a missing file is []. */
export function readJsonl<T = JsonValue>(filePath: string): T[] {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  const out: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as T);
    } catch {
      // skip malformed lines
    }
  }
  return out;
}

/** Read a single JSON document, or null if absent/unreadable. */
export function readJsonFile<T = JsonValue>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Ensure all tier directories exist (the content tier only when configured). */
export function ensureStoreDirs(store: WitnessStore): void {
  mkdirSync(store.logDir, { recursive: true });
  mkdirSync(store.stateDir, { recursive: true });
  mkdirSync(store.recordDir, { recursive: true });
  if (store.contentDir !== undefined) mkdirSync(store.contentDir, { recursive: true });
}

/** Atomically write one content document to its term address under the content
 *  tier (`<contentDir>/<term>/<term>.<type>`); returns the path written. A view's
 *  entity key is canonical JSON (how `projectStateView` keys the bulk), so it is
 *  decoded back to its term before addressing; a non-JSON key is used verbatim. */
export function writeContentDocument(store: WitnessStore, document: ContentDocument): string {
  if (store.contentDir === undefined) throw new TypeError("writeContentDocument: store has no contentDir");
  let term: JsonValue;
  try {
    term = JSON.parse(document.entity) as JsonValue;
  } catch {
    term = document.entity;
  }
  const file = address(store.contentDir, term, document.type);
  writeFileAtomic(file, document.content);
  return file;
}

// ── the content-tier READER: the inverse of writeContentDocument ──
// The content tier (`<contentDir>/<term>/<term>.<type>`) is written by
// `writeContentDocument`; reading an external content tree back — enumerating its
// resources and reading one document — is its inverse, and belongs here with the other
// fs idioms rather than re-derived in every faculty that reads the corpus. Decoding a
// resource into a document is the markdown codec's job (`markdownDataform`), not this
// effectful boundary's: these return raw `Resource`s, never decoded carriers.

const IGNORED_CONTENT = new Set([".git", "node_modules"]);
const statOrNull = (target: string): Stats | null => { try { return statSync(target); } catch { return null; } };
const relUnder = (root: string, full: string): string => path.relative(path.resolve(root), full).split(path.sep).join("/");

/** Resolve `relative` under `root`, refusing any path that escapes the root — the
 *  confinement guard for reading an external content tree. */
export function confine(root: string, relative: string): string {
  const rootAbs = path.resolve(root);
  const full = path.resolve(rootAbs, relative);
  if (full !== rootAbs && !full.startsWith(rootAbs + path.sep)) throw new Error("confine: path escapes the root");
  return full;
}

/** Read one content resource (`{ path, content }`) at a confined address. */
export function readContentResource(root: string, relative: string): Resource {
  const full = confine(root, relative.trim());
  return Object.freeze({ path: relUnder(root, full), content: readFileSync(full, "utf8") });
}

/** One immediate entry of a content directory. */
export interface ContentEntry {
  /** Directory entry name, relative to the confined parent. */
  readonly name: string;
  /** Coarse filesystem kind for browser/tree projections. */
  readonly kind: "directory" | "file" | "other";
}

/** List the immediate entries at a confined content address (sorted; VCS/dep dirs elided). */
export function listContentEntries(root: string, relative: string): readonly ContentEntry[] {
  const full = confine(root, relative.trim());
  const entries: ContentEntry[] = [];
  for (const dirent of readdirSync(full, { withFileTypes: true })) {
    if (IGNORED_CONTENT.has(dirent.name)) continue;
    entries.push(Object.freeze({ name: dirent.name, kind: dirent.isDirectory() ? "directory" : dirent.isFile() ? "file" : "other" }));
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return Object.freeze(entries);
}

/** Walk a confined content region, reading each `.md` file as a resource. Bounded by
 *  `limit` (resources kept) and `maxScan` (files visited) so a large tree is never read
 *  whole — the discovery a memory/research carrier deliberately does not do itself. */
export function readContentTree(root: string, region = "", opts: { readonly limit?: number; readonly maxScan?: number } = {}): readonly Resource[] {
  const limit = opts.limit ?? 200;
  const maxScan = opts.maxScan ?? 20_000;
  const start = confine(root, region.trim());
  const out: Resource[] = [];
  let scanned = 0;
  const frontier: string[] = [start];
  while (frontier.length > 0 && out.length < limit && scanned < maxScan) {
    const current = frontier.shift();
    if (current === undefined) break;
    const st = statOrNull(current);
    if (st === null) continue;
    if (st.isDirectory()) {
      let children: string[];
      try {
        children = readdirSync(current).filter((name) => !IGNORED_CONTENT.has(name)).sort((a, b) => a.localeCompare(b));
      } catch {
        children = [];
      }
      for (const child of children) frontier.push(path.join(current, child));
      continue;
    }
    if (!st.isFile() || !current.endsWith(".md")) continue;
    scanned += 1;
    try {
      out.push(Object.freeze({ path: relUnder(root, current), content: readFileSync(current, "utf8") }));
    } catch {
      // unreadable resource: skip
    }
  }
  return Object.freeze(out);
}

/**
 * Read a feed's witness log as normalized EAVT records.
 *
 * A missing or unreadable log yields `[]`, making the empty feed a first-class
 * state instead of an exceptional case.
 */
export function readWitnessLog(store: WitnessStore, feed: string): EAVTRecord[] {
  let content: string;
  try {
    content = readFileSync(feedPath(store.logDir, feed, "jsonl"), "utf8");
  } catch {
    return [];
  }
  return parseEavt(content);
}

/**
 * Append only witnesses not already present by content identity.
 *
 * Rows are normalized to EAVT records before writing. Duplicate content is
 * skipped, so repeating an observation is zero-cost in the log. The returned
 * `appended` count is the feed's growth signal for this append.
 */
export function appendWitnesses(
  store: WitnessStore,
  feed: string,
  rows: readonly (EAVT | EAVTRecord)[],
): { readonly appended: number } {
  if (rows.length === 0) return { appended: 0 };
  const present = new Set<string>(readWitnessLog(store, feed).map((row) => eavtId(row)));
  const fresh: EAVTRecord[] = [];
  for (const row of rows) {
    const id = eavtId(row);
    if (present.has(id)) continue;
    present.add(id);
    fresh.push(eavtRecord(row));
  }
  if (fresh.length === 0) return { appended: 0 };
  mkdirSync(store.logDir, { recursive: true });
  appendFileSync(feedPath(store.logDir, feed, "jsonl"), serializeEavt(fresh), "utf8");
  return { appended: fresh.length };
}

/**
 * Witness one observation into the append-only log.
 *
 * The observation is cellized by the feed, then only rows whose content identity
 * is not already present are appended. The return value is the count of genuinely
 * new rows, which is the feed's small growth signal for this observation.
 */
export function witnessObservation<Observation>(
  store: WitnessStore,
  feed: Feed<Observation>,
  observation: Observation,
  at: Witness,
): { readonly appended: number } {
  return appendWitnesses(store, feed.name, feed.cellize(observation, at));
}

/**
 * Project a feed's current state view and write it to the state tier.
 */
export function projectFeedState<Observation>(store: WitnessStore, feed: Feed<Observation>): StateView {
  const view = projectStateView(readWitnessLog(store, feed.name), new Set(feed.functional));
  writeJsonAtomic(store.stateDir, feed.name, view as unknown as JsonValue);
  return view;
}

/**
 * Project a feed's state view into per-entity content documents.
 */
export function projectFeedContent<Observation>(
  store: WitnessStore,
  feed: Feed<Observation>,
  opts: { readonly projection?: ContentProjection; readonly view?: StateView } = {},
): readonly string[] {
  const view = opts.view ?? projectStateView(readWitnessLog(store, feed.name), new Set(feed.functional));
  const documents = projectContentDocuments(view, opts.projection);
  return Object.freeze(documents.map((document) => writeContentDocument(store, document)));
}

/** Atomically write a JSON snapshot to `<dir>/<feed>.<type>`. */
export function writeJsonAtomic(dir: string, feed: string, value: JsonValue, type = "json"): void {
  writeFileAtomic(feedPath(dir, feed, type), `${canonical(value)}\n`);
}

/**
 * Commit a settled projection to the record tier and compact the live log.
 *
 * The caller owns the judgment about which Datoms are settled and which witness
 * rows remain live. This function only records that judgment: append Datoms to
 * the record log, then atomically rewrite the witness log to `keptLog`. Empty
 * Datom commits are no-ops.
 */
export function commitRecord(
  store: WitnessStore,
  feed: string,
  datoms: readonly Datom[],
  keptLog: readonly EAVTRecord[],
): void {
  if (datoms.length === 0) return;
  mkdirSync(store.recordDir, { recursive: true });
  appendFileSync(feedPath(store.recordDir, feed, "jsonl"), serializeDatoms(datoms), "utf8");
  writeFileAtomic(feedPath(store.logDir, feed, "jsonl"), serializeEavt(keptLog));
}
