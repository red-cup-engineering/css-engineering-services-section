

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const jsonValueSchema = {};
const nonemptyStringSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: nonemptyStringSchema };

export const httpResourceDescriptorSchema = {
  $id: "metroplat/projections/protocols/http/resource-descriptor",
  title: "HttpResourceDescriptor",
  description: "Finite descriptor of one HTTP resource in the pure app surface; live handler functions remain outside the descriptor.",
  type: "object",
  required: ["kind", "match", "methods", "produces", "languages", "middlewareCount", "hasHandler"],
  properties: {
    kind: { const: "metroplat.http.resource-descriptor" },
    id: nonemptyStringSchema,
    name: nonemptyStringSchema,
    route: nonemptyStringSchema,
    match: { enum: ["string", "regexp", "function"] },
    methods: stringSequenceSchema,
    produces: stringSequenceSchema,
    languages: stringSequenceSchema,
    middlewareCount: { type: "integer", minimum: 0 },
    hasHandler: { type: "boolean" },
  },
  additionalProperties: false,
};

export const httpAppSurfaceSchema = {
  $id: "metroplat/projections/protocols/http/app-surface",
  title: "HttpAppSurface",
  description: "Finite descriptor of the constructed HTTP app resource surface that services/http binds to Node sockets.",
  type: "object",
  required: ["kind", "resources", "resourceCount", "methods", "produces", "runnable"],
  properties: {
    kind: { const: "metroplat.http.app-surface" },
    resources: { type: "array", items: httpResourceDescriptorSchema },
    resourceCount: { type: "integer", minimum: 0 },
    methods: stringSequenceSchema,
    produces: stringSequenceSchema,
    runnable: { type: "boolean" },
  },
  additionalProperties: false,
};

export const httpResourceMatchSchema = {
  $id: "metroplat/projections/protocols/http/resource-match",
  title: "HttpResourceMatch",
  description: "Finite method/path route decision for one HTTP resource.",
  type: "object",
  required: ["kind", "operation", "path", "method", "methodAllowed", "matched", "params"],
  properties: {
    kind: { const: "metroplat.http.resource-match" },
    operation: { const: "match-http-resource" },
    path: { type: "string" },
    method: nonemptyStringSchema,
    methodAllowed: { type: "boolean" },
    matched: { type: "boolean" },
    params: {
      type: "object",
      additionalProperties: { type: "string" },
    },
    route: nonemptyStringSchema,
    resourceId: nonemptyStringSchema,
    resourceName: nonemptyStringSchema,
  },
  additionalProperties: false,
};

const httpObservationBaseProperties = {
};

export const httpSseTransportObservationSchema = {
  $id: "metroplat/projections/protocols/http/sse-transport-observation",
  title: "HttpSseTransportObservation",
  description: "Contract-lensed receipt for opening one live HTTP Server-Sent Events transport.",
  type: "object",
  required: ["kind", "operation"],
  properties: {
    kind: { const: "metroplat.http.sse-transport-observation" },
    operation: { const: "open-sse-transport" },
    ...httpObservationBaseProperties,
  },
  additionalProperties: false,
};

export const httpResourceMatchObservationSchema = {
  $id: "metroplat/projections/protocols/http/resource-match-observation",
  title: "HttpResourceMatchObservation",
  description: "Contract-lensed receipt for one HTTP resource match decision.",
  type: "object",
  required: ["kind", "operation", "match"],
  properties: {
    kind: { const: "metroplat.http.resource-match-observation" },
    operation: { const: "match-http-resource" },
    match: httpResourceMatchSchema,
    ...httpObservationBaseProperties,
  },
  additionalProperties: false,
};

export const httpMiddlewareExecutionObservationSchema = {
  $id: "metroplat/projections/protocols/http/middleware-execution-observation",
  title: "HttpMiddlewareExecutionObservation",
  description: "Contract-lensed receipt for one HTTP resource middleware execution decision.",
  type: "object",
  required: ["kind", "operation", "decision"],
  properties: {
    kind: { const: "metroplat.http.middleware-execution-observation" },
    operation: { const: "execute-resource-middleware" },
    decision: { enum: ["continue", "append-trace", "respond", "stop"] },
    ...httpObservationBaseProperties,
  },
  additionalProperties: false,
};

export const httpResourceDescriptorContract = schemaFrom(httpResourceDescriptorSchema);

export const httpAppSurfaceContract = schemaFrom(httpAppSurfaceSchema);

export const httpResourceMatchContract = schemaFrom(httpResourceMatchSchema);


export const httpSseTransportObservationContract = schemaFrom(httpSseTransportObservationSchema);

export const httpResourceMatchObservationContract = schemaFrom(httpResourceMatchObservationSchema);

export const httpMiddlewareExecutionObservationContract = schemaFrom(httpMiddlewareExecutionObservationSchema);

