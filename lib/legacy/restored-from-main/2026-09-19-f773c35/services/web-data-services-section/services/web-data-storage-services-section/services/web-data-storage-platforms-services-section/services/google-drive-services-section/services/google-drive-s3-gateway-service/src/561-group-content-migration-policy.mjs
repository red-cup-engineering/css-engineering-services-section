import { extname } from "node:path";

const SERVICES = "lib/emsenn/services/561-group/services/";

export const CONTENT_MIGRATION_SOURCE_ROOTS = Object.freeze([
  ["music-renders", `${SERVICES}engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/computer-media-engineering-services-section/services/music-engineering-services-section/data/renders`, "561-group-media", "music/renders"],
  ["emsenn-personal-media", `${SERVICES}public-services-section/services/personal-services-section/services/emsenn-services-section/content/media`, "emsenn-private", "media"],
  ["koios-news-media", `${SERVICES}public-services-section/services/public-social-services-section/services/public-media-services-section/services/public-news-media-services-section/services/koios-news/content/media`, "561-group-media", "public/koios-news"],
  ["science-media", `${SERVICES}science-services-section/content/media`, "561-group-media", "science"],
  ["science-references", `${SERVICES}science-services-section/content/references`, "561-group-references", "science"],
  ["fibercraft-references", `${SERVICES}science-services-section/services/engineering-science-services-section/services/fibercraft-services-section/content/references`, "561-group-references", "fibercraft"],
  ["fiction-references", `${SERVICES}science-services-section/services/information-science-services-section/services/communication-science-services-section/services/writing-services-section/services/fiction-services-section/content/references`, "561-group-references", "fiction"],
  ["type-theory-references", `${SERVICES}science-services-section/services/information-science-services-section/services/math-services-section/content/text/documents/references`, "561-group-references", "type-theory"],
  ["relationality-media", `${SERVICES}science-services-section/services/philosophy-services-section/services/relationality-services-section/content/media`, "561-group-media", "relationality"],
  ["business-media", `${SERVICES}science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/business-science-services-section/content/media`, "561-group-media", "business"],
  ["critical-theory-references", `${SERVICES}science-services-section/services/social-science-services-section/services/sociology-science-services-section/services/critical-theory-science-services-section/content/references`, "561-group-references", "critical-theory"],
  ["anarchism-references", `${SERVICES}science-services-section/services/social-science-services-section/services/sociology-science-services-section/services/critical-theory-science-services-section/services/anarchism-services-section/content/references`, "561-group-references", "anarchism"],
].map(([family, root, bucket, prefix]) => Object.freeze({ family, root, bucket, prefix })));

const ROOTS_BY_SPECIFICITY = [...CONTENT_MIGRATION_SOURCE_ROOTS].sort((a, b) => b.root.length - a.root.length);
const CONTENT_TYPES = new Map([
  [".aac", "audio/aac"], [".avif", "image/avif"], [".epub", "application/epub+zip"],
  [".cbor", "application/cbor"], [".db", "application/vnd.sqlite3"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".flac", "audio/flac"], [".gif", "image/gif"], [".jpeg", "image/jpeg"],
  [".gz", "application/gzip"], [".json", "application/json"],
  [".jsonl", "application/x-ndjson"], [".jpg", "image/jpeg"],
  [".m4a", "audio/mp4"], [".md", "text/markdown; charset=utf-8"],
  [".mkv", "video/x-matroska"], [".mov", "video/quicktime"], [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"], [".ndjson", "application/x-ndjson"],
  [".odt", "application/vnd.oasis.opendocument.text"], [".oga", "audio/ogg"], [".ogg", "audio/ogg"],
  [".ogv", "video/ogg"], [".opus", "audio/ogg"], [".pdf", "application/pdf"],
  [".png", "image/png"], [".sqlite", "application/vnd.sqlite3"],
  [".svg", "image/svg+xml"], [".tgz", "application/gzip"], [".tif", "image/tiff"],
  [".tiff", "image/tiff"], [".txt", "text/plain; charset=utf-8"], [".wav", "audio/wav"],
  [".webm", "video/webm"], [".webp", "image/webp"],
]);
const SAFE_CONTENT_TYPE = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:; charset=[a-z0-9_-]+)?$/u;
const S3_USER_METADATA_BYTES = 2_048;

function normalizedPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) throw new TypeError("source path must be a non-empty, NUL-free string");
  const separatorNormalizedPath = value.replaceAll("\\", "/");
  const path = separatorNormalizedPath.replace(/\/{2,}/gu, "/");
  if (path.startsWith("/") || /^[A-Za-z]:\//u.test(path)) throw new Error("absolute source paths are not admitted");
  if (path.split("/").some((segment) => segment === "." || segment === ".." || segment.length === 0)) throw new Error("source path traversal is not admitted");
  return { path, separatorNormalizedPath };
}

function contentTypeFor(path, mediaTypeHint) {
  const hint = typeof mediaTypeHint === "string" ? mediaTypeHint.trim().toLowerCase() : "";
  if (SAFE_CONTENT_TYPE.test(hint)) return hint;
  return CONTENT_TYPES.get(extname(path).toLowerCase()) ?? "application/octet-stream";
}

function metadataFor(sourcePath, mtime) {
  if (typeof mtime !== "string" || !Number.isFinite(Date.parse(mtime))) throw new TypeError("a valid census mtime is required");
  const metadata = { "source-path": encodeURIComponent(sourcePath), "source-mtime": new Date(mtime).toISOString() };
  const bytes = Object.entries(metadata).reduce((total, [key, value]) => total + Buffer.byteLength(key) + Buffer.byteLength(value), 0);
  if (bytes > S3_USER_METADATA_BYTES) throw new Error(`source metadata exceeds the S3 ${S3_USER_METADATA_BYTES}-byte user-metadata bound`);
  return Object.freeze(metadata);
}

export function create561GroupContentMigrationPolicy() {
  const claimedCoordinates = new Map();
  return Object.freeze({
    route(record) {
      if (!record || typeof record !== "object") throw new TypeError("a census file record is required");
      const { path: sourcePath, separatorNormalizedPath } = normalizedPath(record.path);
      const source = ROOTS_BY_SPECIFICITY.find(({ root }) => sourcePath.startsWith(`${root}/`));
      if (!source) throw new Error(`source path is outside the twelve admitted migration roots: ${sourcePath}`);
      const relativePath = sourcePath.slice(source.root.length + 1);
      const key = `${source.prefix}/${relativePath}`;
      const coordinate = `${source.bucket}/${key}`;
      const priorSourcePath = claimedCoordinates.get(coordinate);
      if (priorSourcePath && priorSourcePath !== separatorNormalizedPath) throw new Error(`normalized destination collision at ${coordinate}`);
      claimedCoordinates.set(coordinate, separatorNormalizedPath);
      return Object.freeze({
        family: source.family,
        sourceRoot: source.root,
        relativePath,
        bucket: source.bucket,
        key,
        contentType: contentTypeFor(relativePath, record.mediaTypeHint),
        metadata: metadataFor(sourcePath, record.mtime),
      });
    },
  });
}

export function route561GroupContent(record) {
  return create561GroupContentMigrationPolicy().route(record);
}

export {
  contentTypeFor as contentTypeForMigration,
  metadataFor as metadataForMigration,
  normalizedPath as normalizeContentMigrationPath,
};
