import { createHash } from "node:crypto";
import { open, lstat, readdir, readlink } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

const SCHEMA_VERSION = "migration-census/v1";

const MEDIA_TYPES = new Map([
  [".aac", "audio/aac"],
  [".avif", "image/avif"],
  [".epub", "application/epub+zip"],
  [".flac", "audio/flac"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".m4a", "audio/mp4"],
  [".mkv", "video/x-matroska"],
  [".mov", "video/quicktime"],
  [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"],
  [".oga", "audio/ogg"],
  [".ogg", "audio/ogg"],
  [".opus", "audio/ogg"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
  [".wav", "audio/wav"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
]);

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pathIsWithin(path, parent) {
  const difference = relative(parent, path);
  return difference === "" || (!difference.startsWith(`..${sep}`) && difference !== ".." && !isAbsolute(difference));
}

function statWitness(stat) {
  return {
    byteLength: Number(stat.size),
    modifiedNanoseconds: stat.mtimeNs.toString(),
    changedNanoseconds: stat.ctimeNs.toString(),
    device: stat.dev.toString(),
    inode: stat.ino.toString(),
  };
}

function witnessesMatch(left, right) {
  return Object.keys(left).every((key) => left[key] === right[key]);
}

function kindOf(stat) {
  if (stat.isDirectory()) return "directory";
  if (stat.isSymbolicLink()) return "symbolic-link";
  if (stat.isBlockDevice()) return "block-device";
  if (stat.isCharacterDevice()) return "character-device";
  if (stat.isFIFO()) return "fifo";
  if (stat.isSocket()) return "socket";
  return "unknown";
}

function hintFor(path) {
  const extension = extname(path).toLowerCase();
  return {
    extension: extension || null,
    mediaTypeHint: MEDIA_TYPES.get(extension) ?? null,
  };
}

/**
 * Inventory and hash explicit filesystem roots without following symbolic links.
 *
 * Exclusions are absolute paths, or paths relative to workspaceRoot. Excluding a
 * directory excludes its complete subtree. `onFileHashed` is an optional progress
 * hook; the file is verified again after the hook before it can enter the census.
 */
export async function createMigrationCensus({
  sourceRoots,
  pathMode = "absolute",
  workspaceRoot,
  exclusions = [],
  onFileHashed,
} = {}) {
  if (!Array.isArray(sourceRoots) || sourceRoots.length === 0) {
    throw new TypeError("sourceRoots must be a non-empty array of explicit paths");
  }
  if (pathMode !== "absolute" && pathMode !== "workspace-relative") {
    throw new TypeError('pathMode must be "absolute" or "workspace-relative"');
  }

  const resolvedWorkspace = workspaceRoot === undefined ? undefined : resolve(workspaceRoot);
  if (pathMode === "workspace-relative" && resolvedWorkspace === undefined) {
    throw new TypeError("workspaceRoot is required for workspace-relative paths");
  }

  const roots = [...new Set(sourceRoots.map((path) => resolve(path)))].sort(compareText);
  const excludedRoots = [...new Set(exclusions.map((path) =>
    resolve(!isAbsolute(path) && resolvedWorkspace ? resolvedWorkspace : "", path),
  ))].sort(compareText);

  if (resolvedWorkspace !== undefined && pathMode === "workspace-relative") {
    for (const path of [...roots, ...excludedRoots]) {
      if (!pathIsWithin(path, resolvedWorkspace)) {
        throw new RangeError(`workspace-relative path lies outside workspaceRoot: ${path}`);
      }
    }
  }

  const presentPath = (path) => pathMode === "absolute"
    ? path
    : relative(resolvedWorkspace, path).split(sep).join("/");
  const isExcluded = (path) => excludedRoots.some((excluded) => pathIsWithin(path, excluded));
  const files = [];
  const unstableFiles = [];
  const nonRegularEntries = [];
  const excludedEntries = [];
  const visitedPaths = new Set();

  async function hashFile(path) {
    const handle = await open(path, "r");
    try {
      const before = statWitness(await handle.stat({ bigint: true }));
      const hash = createHash("sha256");
      const stream = handle.createReadStream({ autoClose: false });
      for await (const chunk of stream) hash.update(chunk);
      const sha256 = hash.digest("hex");

      if (onFileHashed) await onFileHashed({ path: presentPath(path), sha256 });

      const afterHandle = statWitness(await handle.stat({ bigint: true }));
      let afterPath;
      try {
        afterPath = statWitness(await lstat(path, { bigint: true }));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (!witnessesMatch(before, afterHandle) || afterPath === undefined || !witnessesMatch(before, afterPath)) {
        unstableFiles.push({
          path: presentPath(path),
          reason: "changed-during-hashing",
          before,
          afterHandle,
          afterPath: afterPath ?? null,
        });
        return;
      }

      files.push({
        path: presentPath(path),
        byteLength: before.byteLength,
        sha256,
        ...hintFor(path),
        mtime: new Date(Number(BigInt(before.modifiedNanoseconds) / 1_000_000n)).toISOString(),
      });
    } finally {
      await handle.close();
    }
  }

  async function visit(path) {
    if (visitedPaths.has(path)) return;
    visitedPaths.add(path);
    const stat = await lstat(path, { bigint: true });
    if (isExcluded(path)) {
      excludedEntries.push({ path: presentPath(path), kind: stat.isFile() ? "regular-file" : kindOf(stat) });
      return;
    }
    if (stat.isSymbolicLink()) {
      nonRegularEntries.push({ path: presentPath(path), kind: "symbolic-link", target: await readlink(path) });
      return;
    }
    if (stat.isFile()) {
      await hashFile(path);
      return;
    }
    if (!stat.isDirectory()) {
      nonRegularEntries.push({ path: presentPath(path), kind: kindOf(stat) });
      return;
    }
    const children = (await readdir(path)).sort(compareText);
    for (const child of children) await visit(resolve(path, child));
  }

  for (const root of roots) await visit(root);

  for (const collection of [files, unstableFiles, nonRegularEntries, excludedEntries]) {
    collection.sort((left, right) => compareText(left.path, right.path));
  }

  const byDigest = new Map();
  for (const file of files) {
    const group = byDigest.get(file.sha256) ?? [];
    group.push(file);
    byDigest.set(file.sha256, group);
  }
  const exactDuplicateGroups = [...byDigest.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([sha256, group]) => ({
      sha256,
      byteLength: group[0].byteLength,
      paths: group.map(({ path }) => path),
      redundantCopies: group.length - 1,
      redundantBytes: group[0].byteLength * (group.length - 1),
    }))
    .sort((left, right) => compareText(left.sha256, right.sha256));

  const totalBytes = files.reduce((total, file) => total + file.byteLength, 0);
  const redundantBytes = exactDuplicateGroups.reduce((total, group) => total + group.redundantBytes, 0);
  return {
    schemaVersion: SCHEMA_VERSION,
    pathMode,
    workspaceRoot: resolvedWorkspace ?? null,
    sourceRoots: roots.map(presentPath),
    exclusions: excludedRoots.map(presentPath),
    files,
    unstableFiles,
    nonRegularEntries,
    excludedEntries,
    exactDuplicateGroups,
    summary: {
      regularFileCount: files.length,
      unstableFileCount: unstableFiles.length,
      nonRegularEntryCount: nonRegularEntries.length,
      excludedEntryCount: excludedEntries.length,
      totalBytes,
      uniquePayloadBytes: totalBytes - redundantBytes,
      redundantBytes,
    },
  };
}
