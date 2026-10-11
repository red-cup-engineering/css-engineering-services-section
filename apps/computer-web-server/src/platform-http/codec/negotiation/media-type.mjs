import { mimeTypeEssence } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/mime-type";

// media-type.mts — media-type knowledge that negotiation leans on: the
// file-extension table, compressibility classification, and the content-commitment
// corner each media type carries.

// The content-commitment corner ⟨addressability, assertivity⟩ a media type carries.
// Opaque/blob and plain text degrade to `bottom` (any value may serialize there);
// structured-but-non-asserting data is `data`; truth-apt linked/marked forms are
// `assertion`. Used to keep negotiation from fabricating a richer corner than the
// settled value holds.
const TYPE_CORNERS = {
  "application/octet-stream": "bottom",
  "text/plain": "bottom",
  "application/json": "data",
  "application/jsonl": "data",
  "application/xml": "data",
  "application/xmi+xml": "assertion",
  "text/vnd.mermaid": "assertion",
  "text/x-plantuml": "assertion",
  "text/markdown": "assertion",
  "text/html": "assertion",
  "image/svg+xml": "assertion",
  "text/turtle": "assertion",
  "application/n-quads": "assertion",
  "application/eavt+jsonl": "assertion",
  "application/sen+json": "assertion",
  "application/activity+json": "assertion",
  "application/cloudevents+json": "assertion",
  "application/didcomm-plain+json": "assertion",
  "application/didcomm-encrypted+json": "data",
  "application/vnd.npm.manifest+json": "assertion",
  "application/vnd.npm.bin-surface+json": "assertion",
  "application/vnd.npm.export-surface+json": "assertion",
  "application/vnd.npm.type-graph+json": "assertion",
  "application/vnd.pnpm.workspace+json": "assertion",
  "application/vnd.pnpm.dependency-graph+json": "assertion",
  "application/vnd.pnpm.cover+json": "assertion",
  "application/vnd.pnpm.resolution+json": "assertion",
  "application/vnd.git.commit-graph+json": "assertion",
  "application/vnd.git.causal-set+json": "assertion",
};

/** The content-commitment corner a media type carries (defaults `bottom`). */
export function mediaTypeCorner(mediaType) {
  const t = mimeTypeEssence(mediaType) ?? "";
  if (
    t.startsWith("application/vnd.npm.") ||
    t.startsWith("application/vnd.pnpm.") ||
    t.startsWith("application/vnd.git.")
  ) return "assertion";
  return TYPE_CORNERS[t] ?? "bottom";
}
