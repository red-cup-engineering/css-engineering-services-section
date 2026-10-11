import { readFileSync } from "node:fs";
import { createSchema, schemaCorpus, unfoldSchema, validateInstance } from "@red-cup-engineering/json-schema-services-section";
const load = (name) => createSchema(JSON.parse(readFileSync(new URL(`../schemas/${name}`, import.meta.url), "utf8")));
export const STRATEGY_PROGRAM_SYNTHESIS_REQUEST_CARRIER = load("strategy-program-synthesis-request.schema.json");
export const STRATEGY_PROGRAM_SYNTHESIS_REFUSAL_CARRIER = load("strategy-program-synthesis-refusal.schema.json");
export const STRATEGY_PROGRAM_SYNTHESIS_RESULT_CARRIER = load("strategy-program-synthesis-result.schema.json");
const corpus = schemaCorpus([STRATEGY_PROGRAM_SYNTHESIS_REQUEST_CARRIER.schema, STRATEGY_PROGRAM_SYNTHESIS_REFUSAL_CARRIER.schema, STRATEGY_PROGRAM_SYNTHESIS_RESULT_CARRIER.schema]);
export const STRATEGY_PROGRAM_SYNTHESIS_CARRIER_ASSERTIONS = Object.freeze([STRATEGY_PROGRAM_SYNTHESIS_REQUEST_CARRIER, STRATEGY_PROGRAM_SYNTHESIS_REFUSAL_CARRIER, STRATEGY_PROGRAM_SYNTHESIS_RESULT_CARRIER].flatMap(({ schema, identity }) => unfoldSchema(schema, { base: schema.$id, t: identity.ni })));
export const validateStrategyProgramSynthesisRequestCarrier = (value) => validateInstance(value, STRATEGY_PROGRAM_SYNTHESIS_REQUEST_CARRIER.schema, corpus);
export const validateStrategyProgramSynthesisResult = (value) => validateInstance(value, STRATEGY_PROGRAM_SYNTHESIS_RESULT_CARRIER.schema, corpus);
export const validateStrategyProgramCandidate = (value) => validateInstance(value, STRATEGY_PROGRAM_SYNTHESIS_RESULT_CARRIER.schema.$defs.candidate, corpus);
export function requireStrategyCarrier(value, name, validate) { const verdict = validate(value); if (!verdict.ok) throw new TypeError(`${name}-invalid:${verdict.errors.map(({ pointer, keyword }) => `${pointer || "/"}:${keyword}`).join(",")}`); return value; }
