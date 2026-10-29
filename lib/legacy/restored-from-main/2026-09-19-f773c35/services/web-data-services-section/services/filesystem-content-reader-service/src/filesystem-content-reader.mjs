import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { readMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-document";
import { walkPosixPaths } from "@red-cup-engineering/path-walking-service";

/** The initial stable shape of a source-record reader. */
export const CONTENT_READER_CONTRACT_VERSION = "content-reader/v1";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("base64url");
}

function frozen(value) {
  return Object.freeze(value);
}

function sourceId(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.id === "string") return value.id;
  throw new TypeError("record must be a source-record id or descriptor");
}

function markdownText(bytes, id) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TypeError(`Markdown source record is not valid UTF-8: ${id}`);
  }
}

/**
 * Read and parse one Markdown source record without changing its source bytes.
 *
 * The returned source record retains the content-reader/v1 byte identity and
 * provenance. `document` is the canonical active Markdown document reading;
 * normalization is deliberately not performed because it would create a new
 * byte carrier with a different digest.
 */
export async function readFilesystemMarkdownRecord(reader, record, options = {}) {
  if (!reader || typeof reader.readRecord !== "function") {
    throw new TypeError("reader must be a filesystem content reader");
  }
  const source = await reader.readRecord(record);
  if (source.extension !== ".md" && source.extension !== ".markdown") {
    throw new TypeError("record must name a Markdown source file");
  }
  const text = markdownText(source.bytes, source.id);
  const document = readMarkdownDocument(text, {
    ...options,
    coordinate: options.coordinate ?? source.id,
    subject: options.subject ?? source.id,
  });
  return frozen({ ...source, document });
}

function validRelativePath(value) {
  return typeof value === "string"
    && value.length > 0
    && !value.includes("\\")
    && !value.includes("\0")
    && !value.startsWith("/")
    && value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function normalizedExtensions(extensions) {
  if (!Array.isArray(extensions) || extensions.length === 0) {
    throw new TypeError("extensions must be a non-empty array of dot-prefixed filename extensions");
  }
  const normalized = extensions.map((extension) => {
    if (typeof extension !== "string" || !/^\.[A-Za-z0-9]+$/u.test(extension)) {
      throw new TypeError("extensions must contain dot-prefixed alphanumeric filename extensions");
    }
    return extension.toLowerCase();
  });
  if (new Set(normalized).size !== normalized.length) {
    throw new TypeError("extensions must not repeat an extension");
  }
  return frozen(normalized.sort());
}

async function checkedRoot(root) {
  if (typeof root !== "string" || !isAbsolute(root)) {
    throw new TypeError("root must be an absolute filesystem path");
  }
  const stated = resolve(root);
  const status = await lstat(stated);
  if (status.isSymbolicLink()) throw new TypeError("root must not be a symbolic link");
  if (!status.isDirectory()) throw new TypeError("root must name a directory");
  return realpath(stated);
}

function contained(root, candidate) {
  const fromRoot = relative(root, candidate);
  return fromRoot === "" || (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !isAbsolute(fromRoot));
}

async function regularFile(root, absolutePath, label) {
  const status = await lstat(absolutePath);
  if (status.isSymbolicLink()) throw new Error(`symbolic links are not permitted in a content source tree: ${label}`);
  if (!status.isFile()) throw new Error(`source record is not a regular file: ${label}`);
  const canonical = await realpath(absolutePath);
  if (!contained(root, canonical)) throw new Error(`source record escapes its configured root: ${label}`);
  return canonical;
}

async function materialize(root, candidate) {
  const canonical = await regularFile(root, candidate.absolutePath, candidate.id);
  const bytes = await readFile(canonical);
  // Detect the common replacement race before returning an identity derived
  // from the first read. A caller can retry a changed live tree.
  const after = await lstat(canonical);
  if (after.isSymbolicLink() || !after.isFile()) {
    throw new Error(`source record changed while being read: ${candidate.id}`);
  }
  const digest = sha256(bytes);
  const file = pathToFileURL(canonical).href;
  const rootFile = pathToFileURL(root).href;
  const fileDependency = frozen({ kind: "filesystem-file", href: file, sha256: digest });
  const descriptor = frozen({
    contractVersion: CONTENT_READER_CONTRACT_VERSION,
    id: candidate.id,
    extension: candidate.id.slice(candidate.id.lastIndexOf(".")).toLowerCase(),
    provenance: frozen({ kind: "filesystem", root: rootFile, href: file, sha256: digest, byteLength: bytes.byteLength }),
    dependencies: frozen([frozen({ kind: "filesystem-directory", href: rootFile }), fileDependency]),
  });
  return { descriptor, bytes };
}

async function describe(root, candidate) {
  return (await materialize(root, candidate)).descriptor;
}

/**
 * Create a reader over regular files below one trusted filesystem root.
 *
 * The reader deliberately does not infer a document format. It returns opaque
 * bytes and file evidence; a Markdown, JSON, or other downstream reader owns
 * parsing and semantic validation.
 *
 * @param {{ root: string, extensions?: readonly string[] }} options
 */
export async function createFilesystemContentReader({ root, extensions = [".md"] } = {}) {
  const canonicalRoot = await checkedRoot(root);
  const allowedExtensions = normalizedExtensions(extensions);

  async function listRecords() {
    let walk;
    try {
      walk = await walkPosixPaths({
        root: canonicalRoot,
        extensions: [...allowedExtensions],
        paths: "absolute",
        result: "paths",
        symlinks: "refuse",
        includeFile: ({ path, name }) => {
          if (!validRelativePath(path)) throw new Error(`source path escapes its configured root: ${name}`);
          return true;
        },
      });
    } catch (error) {
      if (error.message.startsWith("symbolic link refused: ")) throw new Error(`symbolic links are not permitted in a content source tree: ${error.message.slice(23)}`);
      throw error;
    }
    const candidates = walk.files.map((absolutePath) => ({ id: relative(canonicalRoot, absolutePath).split(sep).join("/"), absolutePath }));
    const records = await Promise.all(candidates.map((candidate) => describe(canonicalRoot, candidate)));
    return frozen(records);
  }

  async function readRecord(record) {
    const id = sourceId(record);
    if (!validRelativePath(id) || !allowedExtensions.some((extension) => id.toLowerCase().endsWith(extension))) {
      throw new TypeError("record id must be a supported, slash-separated relative source path");
    }
    const absolutePath = resolve(canonicalRoot, ...id.split("/"));
    if (!contained(canonicalRoot, absolutePath)) throw new TypeError("record id escapes the configured root");
    const { descriptor, bytes } = await materialize(canonicalRoot, { id, absolutePath });
    return frozen({ ...descriptor, bytes: new Uint8Array(bytes) });
  }

  return frozen({
    contractVersion: CONTENT_READER_CONTRACT_VERSION,
    kind: "filesystem-content-reader",
    root: pathToFileURL(canonicalRoot).href,
    extensions: allowedExtensions,
    listRecords,
    readMarkdownRecord(record, options) {
      return readFilesystemMarkdownRecord({ readRecord }, record, options);
    },
    readRecord,
  });
}
