import { readFileSync } from "node:fs";
import {
  createSchema,
  schemaCorpus,
  unfoldSchema,
  validateInstance,
} from "@red-cup-engineering/json-schema-services-section";

function load(name) {
  return createSchema(JSON.parse(readFileSync(new URL(`../schemas/${name}`, import.meta.url), "utf8")));
}

export const INVESTMENT_RESEARCH_REQUEST_CARRIER = load("investment-research-request.schema.json");
export const INVESTMENT_RESEARCH_REFUSAL_CARRIER = load("investment-research-refusal.schema.json");
export const INVESTMENT_RESEARCH_RESULT_CARRIER = load("investment-research-result.schema.json");

const corpus = schemaCorpus([
  INVESTMENT_RESEARCH_REQUEST_CARRIER.schema,
  INVESTMENT_RESEARCH_REFUSAL_CARRIER.schema,
  INVESTMENT_RESEARCH_RESULT_CARRIER.schema,
]);

export const INVESTMENT_RESEARCH_CARRIER_ASSERTIONS = Object.freeze([
  INVESTMENT_RESEARCH_REQUEST_CARRIER,
  INVESTMENT_RESEARCH_REFUSAL_CARRIER,
  INVESTMENT_RESEARCH_RESULT_CARRIER,
].flatMap(({ schema, identity }) => unfoldSchema(schema, { base: schema.$id, t: identity.ni })));

function validate(value, carrier) {
  return validateInstance(value, carrier.schema, corpus);
}

export const validateInvestmentResearchRequest = (value) => validate(value, INVESTMENT_RESEARCH_REQUEST_CARRIER);
export const validateInvestmentResearchRefusal = (value) => validate(value, INVESTMENT_RESEARCH_REFUSAL_CARRIER);
export const validateInvestmentResearchResult = (value) => validate(value, INVESTMENT_RESEARCH_RESULT_CARRIER);
export const validateInvestmentResearchCandidate = (value) => validateInstance(value, INVESTMENT_RESEARCH_RESULT_CARRIER.schema.$defs.candidate, corpus);

export function requireValidCarrier(value, carrierName, validator) {
  const verdict = validator(value);
  if (!verdict.ok) {
    const detail = verdict.errors.map(({ pointer, keyword }) => `${pointer || "/"}:${keyword}`).join(",");
    throw new TypeError(`${carrierName}-invalid:${detail}`);
  }
  return value;
}
