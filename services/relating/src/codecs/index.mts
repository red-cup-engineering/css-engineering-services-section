/**
 * codecs - representation boundary codecs organized by substrate and syntax.
 *
 * Paths encode the boundary morphology: textual JSON material is under
 * `text/json`, JSON Lines refinement under `text/json/jsonl`, EAVT row material
 * under `text/json/jsonl/eavt`, and XML-family projections under `text/xml`.
 */
export * as boundary from "./boundary/index.mjs";
export * as host from "./host/index.mjs";
export * as text from "./text/index.mjs";
export {
  canonical,
  isJsonRecord,
  isJsonValue,
  jsonResource,
  nonBlankLines,
  parse,
  parseLines,
  requireJsonValue,
  serializeLines,
  type JsonRecord,
  type JsonValue,
} from "./text/json/core.mjs";

// Compatibility face for content carriers recovered from the immediately
// preceding relationality layout. The implementation already survived under
// writing/path; keep one implementation and preserve its former codec address.
export { dehydrateUtterances, rehydrateUtterances } from "../writing/path.mjs";
