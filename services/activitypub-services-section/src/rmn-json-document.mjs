import { jsonToTerm, termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";
import {
  admitNormalizedSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyNormalizedSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";

const DOCUMENT_KIND = "activitypub.rmn-json-document";

function immutable(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) immutable(child);
  return Object.freeze(value);
}

function refuseAmbiguousBoolean(value) {
  if (typeof value === "boolean") throw new TypeError("current RMN JSON documents cannot distinguish JSON booleans from charge-name marks");
  if (value !== null && typeof value === "object") for (const child of Object.values(value)) refuseAmbiguousBoolean(child);
}

export function identifyJsonDocument(value) {
  refuseAmbiguousBoolean(value);
  const term = jsonToTerm(value);
  const semanticType = inferTy([], term);
  if (semanticType === null) throw new TypeError("RMN JSON document did not earn an RMN type");
  const identity = identifyNormalizedSemanticContent({
    objectKind: DOCUMENT_KIND,
    semanticType,
    term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
  return Object.freeze({ bytes: Buffer.from(identity.bytes), ni: identity.token });
}

export function admitTermBytes(bytes, label = "RMN document") {
  const source = Buffer.from(bytes ?? []);
  let identity;
  try { identity = admitNormalizedSemanticContent(source); }
  catch { throw new TypeError(`${label} must contain admitted semantic RMN content`); }
  if (identity.envelope.objectKind !== DOCUMENT_KIND) throw new TypeError(`${label} must contain an ActivityPub RMN JSON document`);
  return Object.freeze({ term: immutable(identity.envelope.settledBody), ni: identity.token });
}

export function admitJsonDocument(bytes, label = "RMN JSON document") {
  const admitted = admitTermBytes(bytes, label);
  let value;
  try { value = termToJson(admitted.term); }
  catch { throw new TypeError(`${label} must contain one JSON-document RMN term`); }
  return Object.freeze({ value: immutable(value), ni: admitted.ni });
}
