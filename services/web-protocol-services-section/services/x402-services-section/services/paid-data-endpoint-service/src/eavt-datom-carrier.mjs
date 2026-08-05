// The repository's EAVT JSONL carrier is application/eavt+jsonl; charset=utf-8.
// A write is a stream of RDF-compatible object Datoms, never arbitrary inline data.
export const EAVT_DATOM_JSONL_MEDIA_TYPE = "application/eavt+jsonl; charset=utf-8";

const IRI = /^(?:[A-Za-z][A-Za-z0-9+.-]*):[^<>\u0000-\u0020]*$/u;
const LANGUAGE = /^[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*$/u;
const DATOM_KEYS = "a,e,op,tx,v";

function fail(message) { throw new TypeError(message); }

function rdfIri(value, name) {
  if (typeof value !== "string" || !IRI.test(value)) fail(`${name} must be an RDF IRI`);
  try { new URL(value); } catch { fail(`${name} must be an RDF IRI`); }
  return value;
}

function timestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) fail("datom tx must be an ISO timestamp");
  return value;
}

function rdfObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("datom v must be an RDF object");
  const keys = Object.keys(value).sort();
  if (value.kind === "iri" && keys.join(",") === "kind,value") return Object.freeze({ kind: "iri", value: rdfIri(value.value, "datom IRI value") });
  if (value.kind !== "literal") fail("datom v must be an RDF IRI or literal");
  if (typeof value.value !== "string") fail("datom literal value must be a string");
  if (value.datatype !== undefined && value.language !== undefined) fail("datom literal cannot have both datatype and language");
  if (!keys.every((key) => ["kind", "value", "datatype", "language"].includes(key))) fail("datom literal has unsupported fields");
  if (value.datatype !== undefined) rdfIri(value.datatype, "datom literal datatype");
  if (value.language !== undefined && (typeof value.language !== "string" || !LANGUAGE.test(value.language))) fail("datom literal language must be a BCP 47 tag");
  return Object.freeze({ kind: "literal", value: value.value, ...(value.datatype === undefined ? {} : { datatype: value.datatype }), ...(value.language === undefined ? {} : { language: value.language.toLowerCase() }) });
}

function datom(value, line) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`line ${line} must be one object Datom`);
  if (Object.keys(value).sort().join(",") !== DATOM_KEYS) fail(`line ${line} must be exactly {e,a,v,tx,op}`);
  if (value.op !== "assert" && value.op !== "retract") fail(`line ${line} datom op must be assert or retract`);
  return Object.freeze({ e: rdfIri(value.e, `line ${line} datom e`), a: rdfIri(value.a, `line ${line} datom a`), v: rdfObject(value.v), tx: timestamp(value.tx), op: value.op });
}

export function canonicalEavtDatomJsonl({ mediaType, body } = {}) {
  if (mediaType !== EAVT_DATOM_JSONL_MEDIA_TYPE) fail(`mediaType must be ${EAVT_DATOM_JSONL_MEDIA_TYPE}`);
  if (typeof body !== "string" || body.length === 0) fail("body must be a nonempty EAVT Datom JSONL string");
  if (!body.endsWith("\n")) fail("EAVT Datom JSONL must end with one newline");
  const lines = body.slice(0, -1).split("\n");
  if (lines.length > 1024 || lines.some((line) => line.length === 0)) fail("EAVT Datom JSONL must contain 1 through 1024 nonempty lines");
  const normalized = lines.map((line, index) => {
    let parsed;
    try { parsed = JSON.parse(line); } catch { fail(`line ${index + 1} is not JSON`); }
    const value = datom(parsed, index + 1), canonical = JSON.stringify(value);
    if (line !== canonical) fail(`line ${index + 1} is not canonical JSON`);
    return canonical;
  });
  return Object.freeze({ mediaType: EAVT_DATOM_JSONL_MEDIA_TYPE, body: `${normalized.join("\n")}\n`, datomCount: normalized.length });
}
