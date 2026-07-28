/**
 * Confined filesystem readings for content territory.
 *
 * Restored from the witness-ledger content-tier reader. These operations are
 * intentionally the sole effectful membrane used by recovered knowledge-vault
 * services; corpus packages do not reimplement path confinement or traversal.
 */
import { readdirSync, readFileSync, statSync, type Stats } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import type { Resource } from "../projections/kernel.mjs";

const IGNORED_CONTENT = new Set([".git", "node_modules"]);

const statOrNull = (target: string): Stats | null => {
  try {
    return statSync(target);
  } catch {
    return null;
  }
};

const relativeUnder = (root: string, full: string): string =>
  relative(resolve(root), full).split(sep).join("/");

/** Resolve a relative address under root, refusing traversal outside root. */
export function confine(root: string, relativePath: string): string {
  const rootAbsolute = resolve(root);
  const full = resolve(rootAbsolute, relativePath);
  if (full !== rootAbsolute && !full.startsWith(rootAbsolute + sep)) {
    throw new Error("confine: path escapes the root");
  }
  return full;
}

/** Read one raw content resource at a confined address. */
export function readContentResource(root: string, relativePath: string): Resource {
  const full = confine(root, relativePath.trim());
  return Object.freeze({ path: relativeUnder(root, full), content: readFileSync(full, "utf8") });
}

export interface ContentEntry {
  readonly name: string;
  readonly kind: "directory" | "file" | "other";
}

/** List one confined directory, excluding VCS and dependency stores. */
export function listContentEntries(root: string, relativePath: string): readonly ContentEntry[] {
  const full = confine(root, relativePath.trim());
  const entries: ContentEntry[] = [];
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    if (IGNORED_CONTENT.has(entry.name)) continue;
    entries.push(Object.freeze({
      name: entry.name,
      kind: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
    }));
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  return Object.freeze(entries);
}

/**
 * Walk a confined region for Markdown resources under explicit retention and
 * scan bounds. The traversal is stable and never follows a path outside root.
 */
export function readContentTree(
  root: string,
  region = "",
  options: Readonly<{ limit?: number; maxScan?: number }> = {},
): readonly Resource[] {
  const limit = options.limit ?? 200;
  const maxScan = options.maxScan ?? 20_000;
  const output: Resource[] = [];
  const frontier: string[] = [confine(root, region.trim())];
  let scanned = 0;
  while (frontier.length > 0 && output.length < limit && scanned < maxScan) {
    const current = frontier.shift();
    if (current === undefined) break;
    const state = statOrNull(current);
    if (state === null) continue;
    if (state.isDirectory()) {
      let children: string[] = [];
      try {
        children = readdirSync(current)
          .filter((name) => !IGNORED_CONTENT.has(name))
          .sort((left, right) => left.localeCompare(right));
      } catch {
        children = [];
      }
      for (const child of children) frontier.push(join(current, child));
      continue;
    }
    if (!state.isFile() || !current.endsWith(".md")) continue;
    scanned += 1;
    try {
      output.push(Object.freeze({
        path: relativeUnder(root, current),
        content: readFileSync(current, "utf8"),
      }));
    } catch {
      // An unreadable resource is absent from this bounded reading.
    }
  }
  return Object.freeze(output);
}
