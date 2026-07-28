/**
 * codecs/boundary/wire - the argv-selectable wire vocabulary, derived from
 * concrete representation projectors.
 *
 * A `WireCodec` adapts one boundary document (a string on stdin/stdout) to the
 * carrier an action's morphism consumes and produces. The wire is NOT forced:
 * the articulation family defaults to `string` (a Mark payload is opaque), and
 * everything passed between scripts defaults to `json`; `--input-format`/`--output-format`
 * select a codec by name. EAVT is offered as a wire too, but it is primarily the
 * shape of the LOG, not the wire.
 *
 * Each wire is the boundary face of a holography `Projector<JsonValue>`:
 * `stringProjector`/`rmnProjector` stay in writing, while JSON/EAVT/SVG
 * projectors come from their codec leaves. `wireOf(projector)` is the adapter:
 * `decode = read`,
 * `encode = write`, `mediaType` from a corner-tagged table, and the projector's
 * content `corner` ⟨addressability, assertivity⟩ and completion `rung` are
 * inherited. The wire therefore carries the decidability invariant for free — a
 * non-monotone/Turing `read` can never become a wire, because `wireOf` rejects
 * any projector whose `read` is not decidable. An unknown name is rejected (a
 * finite vocabulary, witnessed).
 *
 * The RMN wire (`application/rmn+json`) is admitted here: `rmnProjector` is corner
 * `assertion`, rung `scott`, so a closed, well-typed RMN body may travel as the
 * wire, inspected and replayed rather than hidden behind the endpoint. The wire
 * layer inherits the RMN admission boundary; it does not make arbitrary host code
 * safe to read.
 */
import { canonical, parse as parseJson, type JsonValue, jsonProjector } from "../../text/json/core.mjs";
import { eavtProjector } from "../../text/json/jsonl/eavt/index.mjs";
import { svgProjector } from "../../text/xml/svg/index.mjs";
import { mermaidProjector, umlProjector, plantUmlProjector } from "../../../writing/diagram.mjs";
import { rmnProjector } from "../../../writing/rmn.mjs";
import { stringProjector } from "../../../writing/text.mjs";
import {
  cornerOf,
  rungOf,
  readIsDecidable,
  define,
  type Corner,
  type Rung,
} from "../../../projections/kernel.mjs";
import type { Projector } from "../../../projections/kernel.mjs";
import {
  parse as parseEavt,
  serialize as serializeEavt,
  type EAVTRecord,
} from "../../text/json/jsonl/eavt/index.mjs";

/** A wire codec: decode a boundary document into a carrier, encode it back. It is
 *  the boundary face of one `writing` projector, so it inherits that projector's
 *  content `corner` and completion `rung` and the decidability invariant. */
export interface WireCodec {
  readonly name: string;
  readonly mediaType: string;
  /** Content-commitment corner ⟨addressability, assertivity⟩ inherited from the projector. */
  readonly corner: Corner;
  /** Completion-closure rung inherited from the projector (decidable by invariant). */
  readonly rung: Rung;
  decode(document: string): JsonValue;
  encode(value: JsonValue): string;
}

/** The media type each wire serves, keyed by projector `type`. The wire byte
 *  form is identical to the prior hand-rolled vocabulary; the corner/rung now ride
 *  along from the projector. */
const WIRE_MEDIA_TYPES: Readonly<Record<string, string>> = Object.freeze({
  string: "text/plain; charset=utf-8",
  json: "application/json; charset=utf-8",
  eavt: "application/eavt+jsonl; charset=utf-8",
  form: "application/x-www-form-urlencoded; charset=utf-8",
  rmn: "application/rmn+json; charset=utf-8",
  svg: "image/svg+xml; charset=utf-8",
  mermaid: "text/vnd.mermaid; charset=utf-8",
  xmi: "application/xmi+xml; charset=utf-8",
  plantuml: "text/x-plantuml; charset=utf-8",
});

/** Adapt one graded `writing` projector into an argv-selectable wire codec.
 *
 *  `decode` reads the boundary document into a single carrier value; `encode`
 *  writes a carrier value back to a document. The projector's content `corner` and
 *  completion `rung` are inherited, and the decidability invariant is enforced
 *  HERE: a projector whose `read` settles at a non-monotone or Turing rung is not
 *  admissible as a wire (you would be depending on an undecidable completion to
 *  cross the boundary). A `name`/`mediaType`/`decode`/`encode` override lets a wire
 *  pin its exact byte form (e.g. EAVT normalizes rows; `string` canonicalizes a
 *  non-string) while still inheriting the grading from its projector. */
export function wireOf(
  projector: Projector<JsonValue>,
  overrides: {
    readonly name?: string;
    readonly mediaType?: string;
    readonly decode?: (document: string) => JsonValue;
    readonly encode?: (value: JsonValue) => string;
  } = {},
): WireCodec {
  if (!readIsDecidable(projector)) {
    throw new TypeError(
      `wireOf(${projector.type}): read settles at the ${rungOf(projector)} rung, which is not decidable; ` +
        `a wire may not depend on an undecidable completion`,
    );
  }
  const name = overrides.name ?? projector.type;
  const mediaType = overrides.mediaType ?? WIRE_MEDIA_TYPES[name] ?? "application/octet-stream";
  const read = projector.read;
  const write = projector.write;
  const decode =
    overrides.decode ??
    ((document: string): JsonValue => {
      if (read === undefined) throw new TypeError(`wire ${name}: projector ${projector.type} has no read`);
      const items = read({ path: "", content: document });
      return (items.length === 0 ? null : items[0]) as JsonValue;
    });
  const encode =
    overrides.encode ??
    ((value: JsonValue): string => {
      if (write === undefined) throw new TypeError(`wire ${name}: projector ${projector.type} has no write`);
      return write([value]);
    });
  return Object.freeze({ name, mediaType, corner: cornerOf(projector), rung: rungOf(projector), decode, encode });
}

/** The plain-string wire: identity on the boundary document (corner `bottom`). A
 *  non-string carrier is canonicalized so structured values still cross verbatim. */
export const stringCodec: WireCodec = wireOf(stringProjector, {
  encode: (value: JsonValue): string => (typeof value === "string" ? value : canonical(value)),
});

/** The JSON wire: the canonical resource form passed between scripts (corner `data`). */
export const jsonCodec: WireCodec = wireOf(jsonProjector, {
  decode: (document: string): JsonValue => parseJson(document),
  encode: (value: JsonValue): string => `${canonical(value)}\n`,
});

/** The EAVT wire: the carrier is the array of witnessed records (corner `assertion`). */
export const eavtCodec: WireCodec = wireOf(eavtProjector, {
  decode: (document: string): JsonValue => parseEavt(document) as unknown as JsonValue,
  encode: (value: JsonValue): string =>
    serializeEavt((Array.isArray(value) ? value : [value]) as unknown as readonly EAVTRecord[]),
});

/** The RMN wire: an admitted RMN morphism body as `application/rmn+json` (corner
 *  `assertion`, rung `scott`). The term IS JSON, so the wire shares JSON's
 *  read/write; admitting it lets an RMN-bodied action travel as the wire — the
 *  request or response carries the morphism itself. */
export const rmnCodec: WireCodec = wireOf(rmnProjector, {
  decode: (document: string): JsonValue => parseJson(document),
  encode: (value: JsonValue): string => `${canonical(value)}\n`,
});

/** The SVG wire: a geometric realization of the presented-category diagram carrier. */
export const svgCodec: WireCodec = wireOf(svgProjector as Projector<JsonValue>, {
  name: "svg",
  mediaType: "image/svg+xml; charset=utf-8",
});

/** The Mermaid wire: a textual presentation of the presented-category diagram carrier. */
export const mermaidCodec: WireCodec = wireOf(mermaidProjector as unknown as Projector<JsonValue>, {
  name: "mermaid",
  mediaType: "text/vnd.mermaid; charset=utf-8",
});

/** The XMI wire: the structural UML metamodel view of the same diagram carrier. */
export const xmiCodec: WireCodec = wireOf(umlProjector as unknown as Projector<JsonValue>, {
  name: "xmi",
  mediaType: "application/xmi+xml; charset=utf-8",
});

/** The PlantUML wire: the textual UML view of the same diagram carrier. */
export const plantUmlCodec: WireCodec = wireOf(plantUmlProjector as unknown as Projector<JsonValue>, {
  name: "plantuml",
  mediaType: "text/x-plantuml; charset=utf-8",
});

/** The form projector: `application/x-www-form-urlencoded` as a graded boundary —
 *  a `data` corner (addressable record, non-asserting) at the `identity` rung. This
 *  is the encoding behind an HTTP query string and a web form (another
 *  representation of a record carrier, e.g. `token=foo&claim=bar` ↔ {token,claim}),
 *  not a second ontology. It is `define`d here because the form encoding is a
 *  boundary-form concern (it carries no `writing`-catalog peer); deriving its
 *  wire through `wireOf` keeps it graded like every other wire. */
const formProjector: Projector<JsonValue> = define<JsonValue>({
  type: "form",
  corner: "data",
  rung: "identity",
  recognize: () => true,
  read: (resource) => {
    const out: { [key: string]: JsonValue } = {};
    for (const [key, value] of new URLSearchParams(resource.content)) out[key] = value;
    return [out];
  },
  write: (items) => {
    const value = items[0];
    if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("form codec: can only encode a flat object");
    }
    const params = new URLSearchParams();
    for (const [key, item] of Object.entries(value)) {
      params.set(key, typeof item === "string" ? item : canonical(item));
    }
    return `${params.toString()}\n`;
  },
});

/** The form wire: repeated keys keep the last value; nesting is not a form concern
 *  (compose with `json` for structure). */
export const formCodec: WireCodec = wireOf(formProjector);

const REGISTRY: Readonly<Record<string, WireCodec>> = Object.freeze({
  string: stringCodec,
  json: jsonCodec,
  eavt: eavtCodec,
  form: formCodec,
  mermaid: mermaidCodec,
  plantuml: plantUmlCodec,
  rmn: rmnCodec,
  svg: svgCodec,
  xmi: xmiCodec,
});

/** The available wire codec names — the finite vocabulary. */
export const WIRE_CODEC_NAMES: readonly string[] = Object.freeze(Object.keys(REGISTRY).sort());

/** Resolve a wire codec by name, or throw — the vocabulary witness. */
export function wireCodec(name: string): WireCodec {
  const codec = REGISTRY[name];
  if (codec === undefined) {
    throw new TypeError(`unknown wire codec ${JSON.stringify(name)}; known: ${WIRE_CODEC_NAMES.join(", ")}`);
  }
  return codec;
}

/** The wire codec whose media type matches, or undefined — the inverse of
 *  `wireCodec(name).mediaType`. The media-type comparison ignores parameters
 *  (charset), so `application/json` matches the `json` wire. */
export function wireByMediaType(mediaType: string): WireCodec | undefined {
  const base = mediaType.split(";")[0]?.trim().toLowerCase() ?? "";
  for (const name of WIRE_CODEC_NAMES) {
    const codec = REGISTRY[name] as WireCodec;
    if ((codec.mediaType.split(";")[0]?.trim().toLowerCase() ?? "") === base) return codec;
  }
  return undefined;
}
