import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { open, lstat, readFile, readdir, readlink } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

import { CONTENT_MIGRATION_SOURCE_ROOTS } from "./561-group-content-migration-policy.mjs";
import { DEFAULT_PROTECTED_RETIREMENT_PATHS } from "./content-retirement-audit.mjs";

const execFile = promisify(execFileCallback);
const SCHEMA_VERSION = "repository-material-census/v1";
const LARGE_FILE_BYTES = 10 * 1024 * 1024;
const SMALL_FILE_BYTES = 1024 * 1024;
const MAX_GIT_OUTPUT_BYTES = 256 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set([".avi", ".m4v", ".mkv", ".mov", ".mp4", ".ogv", ".webm"]);
const AUDIO_EXTENSIONS = new Set([".aac", ".flac", ".m4a", ".mp3", ".oga", ".ogg", ".opus", ".wav"]);
const IMAGE_EXTENSIONS = new Set([".avif", ".bmp", ".gif", ".heic", ".ico", ".jpeg", ".jpg", ".png", ".psd", ".svg", ".tif", ".tiff", ".webp"]);
const DOCUMENT_EXTENSIONS = new Set([".djvu", ".doc", ".docx", ".epub", ".mobi", ".odt", ".pdf", ".ppt", ".pptx", ".rtf", ".xls", ".xlsx"]);
const ARCHIVE_EXTENSIONS = new Set([".7z", ".bz2", ".gz", ".rar", ".tar", ".tgz", ".xz", ".zip", ".zst"]);
const DATABASE_EXTENSIONS = new Set([".db", ".duckdb", ".mdb", ".parquet", ".sqlite", ".sqlite3"]);
const STRUCTURED_DATA_EXTENSIONS = new Set([".cbor", ".csv", ".json", ".jsonl", ".ndjson", ".toml", ".tsv", ".xml", ".yaml", ".yml"]);
const TEXT_EXTENSIONS = new Set([".adoc", ".bib", ".html", ".md", ".org", ".rst", ".tex", ".txt"]);
const SOURCE_EXTENSIONS = new Set([".c", ".cc", ".cpp", ".css", ".go", ".h", ".hs", ".java", ".js", ".jsx", ".lean", ".mjs", ".mts", ".py", ".rb", ".rs", ".sh", ".sql", ".ts", ".tsx"]);
const EXECUTABLE_EXTENSIONS = new Set([".dll", ".dylib", ".exe", ".o", ".olean", ".rlib", ".so"]);
const FONT_EXTENSIONS = new Set([".eot", ".otf", ".ttf", ".woff", ".woff2"]);
const PROTECTED_PATHS = new Set(DEFAULT_PROTECTED_RETIREMENT_PATHS);

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function posixPath(path) {
  return path.split(sep).join("/");
}

function within(path, parent) {
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

function extensionFamily(extension) {
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (DOCUMENT_EXTENSIONS.has(extension)) return "document";
  if (ARCHIVE_EXTENSIONS.has(extension)) return "archive";
  if (DATABASE_EXTENSIONS.has(extension)) return "database";
  if (STRUCTURED_DATA_EXTENSIONS.has(extension)) return "structured-data";
  if (TEXT_EXTENSIONS.has(extension)) return "text";
  if (SOURCE_EXTENSIONS.has(extension)) return "source-code";
  if (EXECUTABLE_EXTENSIONS.has(extension)) return "compiled-artifact";
  if (FONT_EXTENSIONS.has(extension)) return "font";
  if (extension === ".pack" || extension === ".idx") return "git-storage";
  return "other";
}

function hasSequence(segments, sequence) {
  return segments.some((_, index) => sequence.every((part, offset) => segments[index + offset] === part));
}

export function pathIsSensitive(path) {
  const segments = path.split("/");
  const name = segments.at(-1) ?? "";
  const lowerName = name.toLowerCase();
  if (lowerName === ".env" || lowerName.startsWith(".env.")) return true;
  if ([".p12", ".pfx"].includes(extname(lowerName))) return true;
  if (lowerName.endsWith(".pem") && !lowerName.endsWith("-public.pem") && !lowerName.endsWith("-signing-chain.pem")) return true;
  if (lowerName.startsWith("id_rsa") || lowerName.startsWith("id_ed25519")) return true;
  if (hasSequence(segments, ["data", "secrets"])) return true;
  if (segments.includes("agent-card-signing") && lowerName !== "jwks.json") return true;
  return path.startsWith("lib/emsenn/services/561-group/lib/legacy/2026-08-12-561-group-key-material/");
}

function pathRoles(path, { sensitive, migrationSource }) {
  const segments = path.split("/");
  const roles = [];
  if (sensitive) roles.push("declared-sensitive");
  if (PROTECTED_PATHS.has(path)) roles.push("protected-source-asset");
  if (migrationSource) roles.push("current-drive-migration-root");
  if (hasSequence(segments, ["lib", "legacy"])) roles.push("legacy-capture");
  if (segments.includes(".git")) roles.push("nested-git-administration");
  if (segments.some((segment) => ["node_modules", ".pnpm-store", ".venv", "__pycache__"].includes(segment))
    || hasSequence(segments, [".lake", "packages"])) roles.push("dependency-installation");
  if (hasSequence(segments, [".lake", "build"])
    || segments.includes(".cache")
    || segments.includes(".next")
    || (segments.includes("target") && (segments.includes("debug") || segments.includes("release")))) {
    roles.push("build-output-candidate");
  }
  if (hasSequence(segments, ["data", "renders"])
    || hasSequence(segments, ["data", "artifacts"])
    || hasSequence(segments, ["data", "logs"])
    || path.includes("/generated-audio/")
    || path.includes("/generated-videos/")
    || /(?:\.tmp|\.rot)(?:\.|$)/u.test(segments.at(-1) ?? "")) roles.push("generated-material-candidate");
  if (path.includes("/content/media/") || path.includes("/content/references/")
    || path.includes("/bibliographies/sources/") || hasSequence(segments, ["data", "renders"])
    || hasSequence(segments, ["data", "artifacts"])) roles.push("bulk-content-location");
  if (path.includes("/content/text/documents/")) roles.push("content-document-location");
  return roles.sort(compareText);
}

function repositoryStatus(path, gitState) {
  if (gitState.tracked.has(path)) return "tracked";
  if (gitState.ignored.has(path)) return "ignored";
  if (gitState.untracked.has(path)) return "untracked";
  return "unclassified";
}

function worktreeStatus(path, gitState) {
  const staged = gitState.staged.has(path), unstaged = gitState.unstaged.has(path);
  if (staged && unstaged) return "staged-and-unstaged";
  if (staged) return "staged";
  if (unstaged) return "unstaged";
  return "unchanged";
}

function proposedDisposition({ byteLength, family, repositoryRelation, roles }) {
  const roleSet = new Set(roles);
  let classification;
  if (roleSet.has("protected-source-asset")) classification = "git-source-protected";
  else if (roleSet.has("declared-sensitive")) classification = "sensitive-local-review";
  else if (roleSet.has("current-drive-migration-root")) classification = "drive-migration-admitted";
  else if (roleSet.has("dependency-installation") || roleSet.has("build-output-candidate")) classification = "derived-material-review";
  else if (roleSet.has("legacy-capture") || roleSet.has("nested-git-administration")) classification = "legacy-custody-review";
  else if (byteLength >= LARGE_FILE_BYTES
    || ["archive", "audio", "database", "document", "git-storage", "video"].includes(family)
    || roleSet.has("bulk-content-location") || roleSet.has("generated-material-candidate")) classification = "drive-admission-review";
  else if (repositoryRelation === "ignored") classification = "ignored-material-review";
  else if (repositoryRelation === "tracked") classification = "git-retention-review";
  else if (["source-code", "structured-data", "text"].includes(family)) classification = "git-admission-review";
  else classification = "manual-review";
  return {
    classification,
    basis: [...new Set([
      `repository:${repositoryRelation}`,
      `material:${family}`,
      ...(byteLength >= LARGE_FILE_BYTES ? [`size-at-least:${LARGE_FILE_BYTES}`] : []),
      ...roles.map((role) => `path-role:${role}`),
    ])].sort(compareText),
    actionAuthorized: false,
  };
}

function pathSet(buffer, label) {
  const text = buffer.toString("utf8");
  if (text.includes("\uFFFD")) throw new Error(`${label} contains a non-UTF-8 path`);
  return new Set(text.split("\0").filter(Boolean));
}

async function gitOutput(workspaceRoot, arguments_) {
  const { stdout } = await execFile("git", ["-C", workspaceRoot, ...arguments_], {
    encoding: "buffer",
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
  });
  return stdout;
}

export async function readGitRepositoryState({ workspaceRoot } = {}) {
  const workspace = resolve(String(workspaceRoot ?? ""));
  const [tracked, untracked, ignored, staged, unstaged, stagedDeleted, unstagedDeleted, head, branch] = await Promise.all([
    gitOutput(workspace, ["ls-files", "-z", "--cached"]),
    gitOutput(workspace, ["ls-files", "-z", "--others", "--exclude-standard"]),
    gitOutput(workspace, ["ls-files", "-z", "--others", "--ignored", "--exclude-standard"]),
    gitOutput(workspace, ["diff", "--cached", "--name-only", "-z", "--"]),
    gitOutput(workspace, ["diff", "--name-only", "-z", "--"]),
    gitOutput(workspace, ["diff", "--cached", "--diff-filter=D", "--name-only", "-z", "--"]),
    gitOutput(workspace, ["diff", "--diff-filter=D", "--name-only", "-z", "--"]),
    gitOutput(workspace, ["rev-parse", "HEAD"]),
    gitOutput(workspace, ["rev-parse", "--abbrev-ref", "HEAD"]),
  ]);
  return {
    tracked: pathSet(tracked, "tracked path set"),
    untracked: pathSet(untracked, "untracked path set"),
    ignored: pathSet(ignored, "ignored path set"),
    staged: pathSet(staged, "staged path set"),
    unstaged: pathSet(unstaged, "unstaged path set"),
    stagedDeleted: pathSet(stagedDeleted, "staged deletion set"),
    unstagedDeleted: pathSet(unstagedDeleted, "unstaged deletion set"),
    head: head.toString("utf8").trim(),
    branch: branch.toString("utf8").trim(),
  };
}

function emptyAdministrativeSummary(path) {
  return { path, contentRead: false, regularFileCount: 0, regularFileBytes: 0,
    directoryCount: 0, symbolicLinkCount: 0, otherEntryCount: 0, unreadableEntryCount: 0 };
}

function addAdministrativeSummary(target, source) {
  for (const key of ["regularFileCount", "regularFileBytes", "directoryCount", "symbolicLinkCount", "otherEntryCount", "unreadableEntryCount"]) {
    target[key] += source[key];
  }
}

async function measureAdministrativeTree(absolutePath, path) {
  const summary = emptyAdministrativeSummary(path);
  let stat;
  try { stat = await lstat(absolutePath, { bigint: true }); }
  catch (error) {
    summary.unreadableEntryCount += 1;
    summary.errorCode = error?.code ?? "UNKNOWN";
    return summary;
  }
  if (stat.isFile()) {
    summary.regularFileCount = 1;
    summary.regularFileBytes = Number(stat.size);
    return summary;
  }
  if (stat.isSymbolicLink()) { summary.symbolicLinkCount = 1; return summary; }
  if (!stat.isDirectory()) { summary.otherEntryCount = 1; return summary; }
  summary.directoryCount = 1;
  let children;
  try { children = (await readdir(absolutePath)).sort(compareText); }
  catch (error) {
    summary.unreadableEntryCount += 1;
    summary.errorCode = error?.code ?? "UNKNOWN";
    return summary;
  }
  for (const child of children) {
    addAdministrativeSummary(summary, await measureAdministrativeTree(resolve(absolutePath, child), `${path}/${child}`));
  }
  return summary;
}

async function observeRegularFile({ absolutePath, path, sensitive }) {
  if (sensitive) {
    const before = statWitness(await lstat(absolutePath, { bigint: true }));
    const after = statWitness(await lstat(absolutePath, { bigint: true }));
    if (!witnessesMatch(before, after)) return { unstable: { path, reason: "changed-during-sensitive-metadata-observation", before, after } };
    return { file: { path, byteLength: before.byteLength, sha256: null, hashStatus: "withheld-sensitive",
      extension: extname(path).toLowerCase() || null,
      mtime: new Date(Number(BigInt(before.modifiedNanoseconds) / 1_000_000n)).toISOString() } };
  }
  const pathBefore = statWitness(await lstat(absolutePath, { bigint: true }));
  if (pathBefore.byteLength <= SMALL_FILE_BYTES) {
    const bytes = await readFile(absolutePath);
    const pathAfter = statWitness(await lstat(absolutePath, { bigint: true }));
    if (bytes.length !== pathBefore.byteLength || !witnessesMatch(pathBefore, pathAfter)) {
      return { unstable: { path, reason: "changed-during-hashing", before: pathBefore,
        afterHandle: null, afterPath: pathAfter } };
    }
    return { file: { path, byteLength: pathBefore.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"), hashStatus: "sha256",
      extension: extname(path).toLowerCase() || null,
      mtime: new Date(Number(BigInt(pathBefore.modifiedNanoseconds) / 1_000_000n)).toISOString() } };
  }
  const handle = await open(absolutePath, "r");
  try {
    const before = statWitness(await handle.stat({ bigint: true }));
    if (!witnessesMatch(pathBefore, before)) {
      return { unstable: { path, reason: "changed-before-hashing", before: pathBefore,
        afterHandle: before, afterPath: before } };
    }
    const hash = createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
    const sha256 = hash.digest("hex");
    const afterHandle = statWitness(await handle.stat({ bigint: true }));
    let afterPath;
    try { afterPath = statWitness(await lstat(absolutePath, { bigint: true })); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
    if (!witnessesMatch(before, afterHandle) || afterPath === undefined || !witnessesMatch(before, afterPath)) {
      return { unstable: { path, reason: "changed-during-hashing", before, afterHandle, afterPath: afterPath ?? null } };
    }
    return { file: { path, byteLength: before.byteLength, sha256, hashStatus: "sha256",
      extension: extname(path).toLowerCase() || null,
      mtime: new Date(Number(BigInt(before.modifiedNanoseconds) / 1_000_000n)).toISOString() } };
  } finally { await handle.close(); }
}

function summarizeBy(files, key) {
  const summaries = new Map();
  for (const file of files) {
    const value = key(file);
    const summary = summaries.get(value) ?? { classification: value, fileCount: 0, byteLength: 0 };
    summary.fileCount += 1;
    summary.byteLength += file.byteLength;
    summaries.set(value, summary);
  }
  return [...summaries.values()].sort((left, right) => compareText(left.classification, right.classification));
}

/**
 * Observe every current working-tree entry without following symbolic links.
 *
 * The active repository administration tree is measured but never content-read.
 * Declared record-set outputs are represented as an explicit self-reference
 * boundary. Sensitive files contribute paths and byte counts but their contents
 * are not read and no digest is retained. Every disposition is review-only.
 */
export async function createRepositoryMaterialCensus({
  workspaceRoot,
  gitState: offeredGitState,
  administrativeRoots = [".git"],
  selfExcludedPaths = [],
  hashConcurrency = 32,
  onEntryObserved,
} = {}) {
  const workspace = resolve(String(workspaceRoot ?? ""));
  if (!Number.isSafeInteger(hashConcurrency) || hashConcurrency < 1 || hashConcurrency > 32) {
    throw new RangeError("hashConcurrency must be an integer from 1 through 32");
  }
  const gitState = offeredGitState ?? await readGitRepositoryState({ workspaceRoot: workspace });
  for (const key of ["tracked", "untracked", "ignored", "staged", "unstaged", "stagedDeleted", "unstagedDeleted"]) {
    if (!(gitState?.[key] instanceof Set)) throw new TypeError(`gitState.${key} must be a Set`);
  }
  const administrative = new Set(administrativeRoots.map((path) => posixPath(path)));
  const selfExcluded = new Set(selfExcludedPaths.map((path) => posixPath(path)));
  if ([...administrative, ...selfExcluded].some((path) => path === "" || path === "." || path.startsWith("../") || isAbsolute(path))) {
    throw new RangeError("administrative and self-excluded paths must be workspace-relative children");
  }

  const fileCandidates = [];
  const nonRegularEntries = [];
  const unreadableEntries = [];
  const administrativeObservations = [];
  const presentPaths = new Set();
  let directoryCount = 1;

  async function visitDirectory(absoluteDirectory, relativeDirectory = "") {
    let entries;
    try { entries = (await readdir(absoluteDirectory, { withFileTypes: true })).sort((a, b) => compareText(a.name, b.name)); }
    catch (error) {
      unreadableEntries.push({ path: relativeDirectory || ".", kind: "directory", errorCode: error?.code ?? "UNKNOWN" });
      return;
    }
    for (const entry of entries) {
      const path = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = resolve(absoluteDirectory, entry.name);
      presentPaths.add(path);
      if (administrative.has(path)) {
        administrativeObservations.push(await measureAdministrativeTree(absolutePath, path));
      } else if (selfExcluded.has(path)) {
        continue;
      } else if (entry.isDirectory()) {
        directoryCount += 1;
        await visitDirectory(absolutePath, path);
      } else if (entry.isFile()) {
        fileCandidates.push({ absolutePath, path, sensitive: pathIsSensitive(path) });
      } else if (entry.isSymbolicLink()) {
        let target = null, errorCode = null;
        try { target = await readlink(absolutePath); } catch (error) { errorCode = error?.code ?? "UNKNOWN"; }
        nonRegularEntries.push({ path, kind: "symbolic-link", target, ...(errorCode ? { errorCode } : {}) });
      } else {
        try { nonRegularEntries.push({ path, kind: kindOf(await lstat(absolutePath, { bigint: true })) }); }
        catch (error) { unreadableEntries.push({ path, kind: "unknown", errorCode: error?.code ?? "UNKNOWN" }); }
      }
    }
  }

  await visitDirectory(workspace);
  fileCandidates.sort((left, right) => compareText(left.path, right.path));
  const observed = new Array(fileCandidates.length);
  let nextIndex = 0, observedCount = 0;
  async function worker() {
    while (nextIndex < fileCandidates.length) {
      const index = nextIndex++;
      const candidate = fileCandidates[index];
      try { observed[index] = await observeRegularFile(candidate); }
      catch (error) {
        observed[index] = { unreadable: { path: candidate.path, kind: "regular-file", errorCode: error?.code ?? "UNKNOWN" } };
      }
      observedCount += 1;
      if (onEntryObserved) await onEntryObserved({ observedFiles: observedCount, totalFiles: fileCandidates.length, path: candidate.path });
    }
  }
  await Promise.all(Array.from({ length: Math.min(hashConcurrency, fileCandidates.length || 1) }, () => worker()));

  const files = [], unstableFiles = [];
  for (const result of observed) {
    if (result.file) files.push(result.file);
    else if (result.unstable) unstableFiles.push(result.unstable);
    else if (result.unreadable) unreadableEntries.push(result.unreadable);
  }
  for (const file of files) {
    const migrationSource = CONTENT_MIGRATION_SOURCE_ROOTS.find(({ root }) => file.path.startsWith(`${root}/`));
    const sensitive = file.hashStatus === "withheld-sensitive";
    const roles = pathRoles(file.path, { sensitive, migrationSource });
    const relation = repositoryStatus(file.path, gitState);
    const family = extensionFamily(file.extension ?? "");
    Object.assign(file, {
      materialFamily: family,
      repositoryRelation: relation,
      worktreeStatus: worktreeStatus(file.path, gitState),
      pathRoles: roles,
      currentMigration: migrationSource ? { admitted: true, family: migrationSource.family,
        sourceRoot: migrationSource.root, bucket: migrationSource.bucket, prefix: migrationSource.prefix } : { admitted: false },
      proposedDisposition: proposedDisposition({ byteLength: file.byteLength, family, repositoryRelation: relation, roles }),
    });
  }

  const byDigest = new Map();
  for (const file of files) {
    if (file.sha256 === null) continue;
    const group = byDigest.get(file.sha256) ?? [];
    group.push(file);
    byDigest.set(file.sha256, group);
  }
  const exactDuplicateGroups = [...byDigest.entries()].filter(([, group]) => group.length > 1)
    .map(([sha256, group]) => ({ sha256, byteLength: group[0].byteLength,
      paths: group.map(({ path }) => path).sort(compareText), redundantCopies: group.length - 1,
      redundantBytes: group[0].byteLength * (group.length - 1) }))
    .sort((left, right) => compareText(left.sha256, right.sha256));
  const totalBytes = files.reduce((total, file) => total + file.byteLength, 0);
  const hashedFiles = files.filter(({ sha256 }) => sha256 !== null);
  const hashedBytes = hashedFiles.reduce((total, file) => total + file.byteLength, 0);
  const redundantBytes = exactDuplicateGroups.reduce((total, group) => total + group.redundantBytes, 0);
  const sensitiveFiles = files.filter(({ sha256 }) => sha256 === null);
  const largeFiles = files.filter(({ byteLength }) => byteLength >= LARGE_FILE_BYTES);
  const excludedGitPaths = new Set([...administrative, ...selfExcluded]);
  const gitPathAdmitted = (path) => ![...excludedGitPaths].some((excluded) => path === excluded || path.startsWith(`${excluded}/`));
  const admittedGitPathCount = (paths) => [...paths].filter(gitPathAdmitted).length;
  const trackedMissingFromFilesystem = [...gitState.tracked]
    .filter((path) => gitPathAdmitted(path) && !presentPaths.has(path)).sort(compareText);
  const administrativeUnreadableEntryCount = administrativeObservations
    .reduce((total, item) => total + item.unreadableEntryCount, 0);

  for (const collection of [files, unstableFiles, nonRegularEntries, unreadableEntries, administrativeObservations]) {
    collection.sort((left, right) => compareText(left.path, right.path));
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    workspaceRoot: workspace,
    pathMode: "workspace-relative",
    sourceRoot: ".",
    actionAuthorized: false,
    administrativeRoots: administrativeObservations,
    selfReferenceBoundary: [...selfExcluded].sort(compareText).map((path) => ({ path, reason: "record-set-self-reference" })),
    files,
    unstableFiles,
    nonRegularEntries,
    unreadableEntries,
    exactDuplicateGroups,
    gitObservation: {
      head: gitState.head ?? null,
      branch: gitState.branch ?? null,
      trackedPathCount: admittedGitPathCount(gitState.tracked),
      untrackedPathCount: admittedGitPathCount(gitState.untracked),
      ignoredPathCount: admittedGitPathCount(gitState.ignored),
      stagedPathCount: admittedGitPathCount(gitState.staged),
      unstagedPathCount: admittedGitPathCount(gitState.unstaged),
      stagedDeletedPaths: [...gitState.stagedDeleted].filter(gitPathAdmitted).sort(compareText),
      unstagedDeletedPaths: [...gitState.unstagedDeleted].filter(gitPathAdmitted).sort(compareText),
      trackedMissingFromFilesystem,
    },
    dispositionSummary: summarizeBy(files, (file) => file.proposedDisposition.classification),
    materialFamilySummary: summarizeBy(files, (file) => file.materialFamily),
    repositoryRelationSummary: summarizeBy(files, (file) => file.repositoryRelation),
    summary: {
      directoryCount,
      regularFileCount: files.length,
      totalBytes,
      hashedFileCount: hashedFiles.length,
      hashedBytes,
      sensitiveFileCount: sensitiveFiles.length,
      sensitiveBytes: sensitiveFiles.reduce((total, file) => total + file.byteLength, 0),
      unstableFileCount: unstableFiles.length,
      nonRegularEntryCount: nonRegularEntries.length,
      unreadableEntryCount: unreadableEntries.length,
      largeFileThresholdBytes: LARGE_FILE_BYTES,
      largeFileCount: largeFiles.length,
      largeFileBytes: largeFiles.reduce((total, file) => total + file.byteLength, 0),
      exactDuplicateGroupCount: exactDuplicateGroups.length,
      redundantBytes,
      uniqueHashedPayloadBytes: hashedBytes - redundantBytes,
      administrativeRegularFileCount: administrativeObservations.reduce((total, item) => total + item.regularFileCount, 0),
      administrativeRegularFileBytes: administrativeObservations.reduce((total, item) => total + item.regularFileBytes, 0),
      administrativeUnreadableEntryCount,
      completeEnumeration: unstableFiles.length === 0 && unreadableEntries.length === 0
        && administrativeUnreadableEntryCount === 0,
    },
  };
}

export { LARGE_FILE_BYTES as REPOSITORY_LARGE_FILE_BYTES };
