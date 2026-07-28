/**
 * writing/text — the plain-string boundary.
 *
 * The default wire form for the articulation family: a Mark payload is an opaque
 * string. This projector carries the raw content as a single JSON string value,
 * so it composes in one catalog with the JSON and EAVT projectors.
 */
import { define, type Projector } from "../projections/kernel.mjs";
import type { JsonValue } from "../codecs/text/json/core.mjs";

/** The string projector: recognizes any content, carries it verbatim as one value. */
export const stringProjector: Projector<JsonValue> = define<JsonValue>({
  type: "string",
  corner: "bottom",
  rung: "identity",
  recognize: () => true,
  read: (resource) => [resource.content],
  write: (items) => (items.length === 0 ? "" : String(items[0])),
});
