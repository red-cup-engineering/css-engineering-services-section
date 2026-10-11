

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const idSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: idSchema };

const httpCompressionPolicySchema = {
  type: "object",
  required: ["requestDecode", "responseEncode", "codings"],
  properties: {
    requestDecode: { type: "boolean" },
    responseEncode: { enum: ["not-applied-globally", "resource-owned"] },
    codings: stringSequenceSchema,
  },
  additionalProperties: false,
};

const httpHeaderPolicySchema = {
  type: "object",
  required: ["mode", "headers"],
  properties: {
    mode: { enum: ["not-configured-globally", "resource-owned"] },
    headers: stringSequenceSchema,
  },
  additionalProperties: false,
};

export const httpServicePolicySchema = {
  $id: "metroplat/services/http/policy",
  title: "HttpServicePolicy",
  description: "A service-side HTTP policy record describing the actual package-wide compression, CORS, and security-header defaults without installing a web framework or middleware layer.",
  type: "object",
  required: ["kind", "service", "compression", "cors", "securityHeaders", "obligations", "evidence"],
  properties: {
    kind: { const: "metroplat.services.http.policy" },
    service: { const: "services/http" },
    compression: httpCompressionPolicySchema,
    cors: httpHeaderPolicySchema,
    securityHeaders: httpHeaderPolicySchema,
    obligations: stringSequenceSchema,
    evidence: stringSequenceSchema,
  },
  additionalProperties: false,
};

export const httpServicePolicyContract = schemaFrom(httpServicePolicySchema);
