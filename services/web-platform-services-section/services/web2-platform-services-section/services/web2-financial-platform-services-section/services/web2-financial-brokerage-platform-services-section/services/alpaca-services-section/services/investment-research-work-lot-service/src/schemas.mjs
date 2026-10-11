import { readFileSync } from "node:fs";
import { admitSchema } from "@red-cup-engineering/json-schema-services-section/admit-schema";
import { unfoldSchema } from "@red-cup-engineering/json-schema-services-section/unfold-schema";
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";

function load(name) {
  return admitSchema({ schema: JSON.parse(readFileSync(new URL(`../schemas/${name}`, import.meta.url), "utf8")) });
}

export const INVESTMENT_RESEARCH_REQUEST_CARRIER = load("investment-research-request.schema.json");
export const INVESTMENT_RESEARCH_REFUSAL_CARRIER = load("investment-research-refusal.schema.json");
export const INVESTMENT_RESEARCH_RESULT_CARRIER = load("investment-research-result.schema.json");

const corpus = Object.freeze([
  INVESTMENT_RESEARCH_REQUEST_CARRIER.schema,
  INVESTMENT_RESEARCH_REFUSAL_CARRIER.schema,
  INVESTMENT_RESEARCH_RESULT_CARRIER.schema,
]);

export const INVESTMENT_RESEARCH_CARRIER_ASSERTIONS = Object.freeze([
  INVESTMENT_RESEARCH_REQUEST_CARRIER,
  INVESTMENT_RESEARCH_REFUSAL_CARRIER,
  INVESTMENT_RESEARCH_RESULT_CARRIER,
].flatMap(({ schema, identity }) => unfoldSchema({ schema, base: schema.$id, time: identity.ni }).assertions));

function validate(value, carrier) {
  return validateSchemaInstance({ instance: value, schema: carrier.schema, schemas: corpus });
}

export const validateInvestmentResearchRequest = (value) => validate(value, INVESTMENT_RESEARCH_REQUEST_CARRIER);
export const validateInvestmentResearchRefusal = (value) => validate(value, INVESTMENT_RESEARCH_REFUSAL_CARRIER);
export const validateInvestmentResearchResult = (value) => validate(value, INVESTMENT_RESEARCH_RESULT_CARRIER);
export const validateInvestmentResearchCandidate = (value) => validateSchemaInstance({ instance: value, schema: { $ref: `${INVESTMENT_RESEARCH_RESULT_CARRIER.schema.$id}#/$defs/candidate` }, schemas: corpus });

export function requireValidCarrier(value, carrierName, validator) {
  const verdict = validator(value);
  if (!verdict.ok) {
    const detail = verdict.errors.map(({ pointer, keyword }) => `${pointer || "/"}:${keyword}`).join(",");
    throw new TypeError(`${carrierName}-invalid:${detail}`);
  }
  return value;
}
