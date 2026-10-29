import type { WebApplicationMiddleware as Middleware, WebApplicationResource as Resource } from "@red-cup-engineering/http-server-application-contract-service/web";
import {
  settleRequestTrace,
  type RequestAdmissionJudgment,
  type RequestTrace,
  type RequestTraceSettlement,
} from "./request.mts";
import { parseContentType } from "@red-cup-engineering/code-http-content-type-service";
import {
  validateJsonSchema,
  type JsonSchema,
  type ValidationIssue,
  type ValidationResult,
} from "@red-cup-engineering/computer-data-engine";
import type { OpenApiMetadata, OpenApiParameter, OpenApiResponse, OpenApiResponses } from "./openapi.mts";

export {
  validateJsonSchema,
  type ValidationIssue,
  type ValidationResult,
} from "@red-cup-engineering/computer-data-engine";

type Context = Parameters<Middleware>[0];

function issue(path: string, keyword: string, message: string): ValidationIssue {
  return Object.freeze({ kind: "instance", path, keyword, message });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonSchema(value: unknown): value is JsonSchema {
  return typeof value === "boolean" || isObject(value);
}

function objectKeyword(
  schema: JsonSchema | undefined,
  keyword: string,
): Record<string, unknown> | undefined {
  if (!isObject(schema)) return undefined;
  const value = schema[keyword];
  return isObject(value) ? value : undefined;
}

export type RequestValidationSpec = Readonly<{
  params?: JsonSchema;
  query?: JsonSchema;
  headers?: JsonSchema;
  body?: JsonSchema;
  contentType?: string | readonly string[];
  maxBytes?: number;
}>;

export type ValidatedRequest = Readonly<{
  params?: unknown;
  query?: unknown;
  headers?: unknown;
  body?: unknown;
}>;

export type ValidatedResource = Resource & Readonly<{
  validation?: RequestValidationSpec;
}>;

export type RequestValidationArea = keyof ValidatedRequest | "contentType";

export type RequestValidationInput = Readonly<{
  trace: RequestTrace;
  spec: RequestValidationSpec;
  values: ValidatedRequest;
  contentType?: string;
}>;

export type RequestValidationReport = Readonly<{
  trace: RequestTrace;
  settled: RequestTraceSettlement;
  judgments: readonly RequestAdmissionJudgment[];
  valid: boolean;
  invalidArea: RequestValidationArea | null;
  issues: readonly ValidationIssue[];
  validated?: ValidatedRequest;
}>;

export type ResponseValidationContract = Readonly<{
  description?: string;
  body?: JsonSchema;
  headers?: JsonSchema;
  contentType?: string | readonly string[];
}>;

export type ResponseValidationSpec = Readonly<Record<string | number, ResponseValidationContract>>;

export type ObservedResponse = Readonly<{
  status: number;
  headers?: Readonly<Record<string, string>>;
  body?: unknown;
  contentType?: string;
}>;

export type ResponseValidationArea = "status" | "headers" | "body" | "contentType";

export type ResponseValidationInput = Readonly<{
  trace: RequestTrace;
  spec: ResponseValidationSpec;
  response: ObservedResponse;
}>;

export type ResponseValidationReport = Readonly<{
  trace: RequestTrace;
  settled: RequestTraceSettlement;
  judgments: readonly RequestAdmissionJudgment[];
  valid: boolean;
  invalidArea: ResponseValidationArea | null;
  issues: readonly ValidationIssue[];
  contract?: ResponseValidationContract;
}>;

function queryObject(ctx: Context): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of ctx.url.searchParams) {
    if (!Object.hasOwn(out, key)) out[key] = value;
    else if (Array.isArray(out[key])) (out[key] as string[]).push(value);
    else out[key] = [out[key] as string, value];
  }
  return out;
}

function headerObject(ctx: Context): Record<string, unknown> {
  return Object.fromEntries(ctx.request.headers);
}

function contentTypeAllowedValue(contentType: string | undefined, spec: RequestValidationSpec): boolean {
  if (spec.body === undefined || spec.contentType === undefined) return true;
  const parsed = parseContentType(contentType);
  const requestType = parsed?.type ?? "";
  const allowed = [spec.contentType].flat();
  return allowed.some((type) => type.toLowerCase() === requestType);
}

function validationProblem(status: number, title: string, issues: readonly ValidationIssue[]): Response {
  return Response.json({ type: "urn:561-group:web-server:problem:request-validation", title, status, issues }, { status, headers: { "cache-control": "no-store", "content-type": "application/problem+json" } });
}

function firstInvalid(
  entries: readonly [keyof ValidatedRequest, unknown, JsonSchema | undefined][],
): { area: keyof ValidatedRequest; result: ValidationResult } | null {
  for (const [area, value, schema] of entries) {
    if (schema === undefined) continue;
    const result = validateJsonSchema(value, schema);
    if (!result.valid) return { area, result };
  }
  return null;
}

function selectedValidated(spec: RequestValidationSpec, values: ValidatedRequest): ValidatedRequest {
  return Object.freeze({
    ...(spec.params !== undefined ? { params: values.params } : {}),
    ...(spec.query !== undefined ? { query: values.query } : {}),
    ...(spec.headers !== undefined ? { headers: values.headers } : {}),
    ...(spec.body !== undefined ? { body: values.body } : {}),
  } satisfies ValidatedRequest);
}

function validationProjection(input: RequestValidationInput): {
  judgments: readonly RequestAdmissionJudgment[];
  valid: boolean;
  invalidArea: RequestValidationArea | null;
  issues: readonly ValidationIssue[];
  validated?: ValidatedRequest;
} {
  if (!contentTypeAllowedValue(input.contentType, input.spec)) {
    const issues = Object.freeze([
      issue("/body", "contentType", `expected ${[input.spec.contentType].flat().join(", ")}`),
    ]);
    return {
      judgments: Object.freeze([{
        name: "request-validation:content-type",
        value: "active",
        reason: "request body media type was not admitted",
        path: "/body",
      }]),
      valid: false,
      invalidArea: "contentType",
      issues,
    };
  }

  const invalid = firstInvalid([
    ["params", input.values.params, input.spec.params],
    ["query", input.values.query, input.spec.query],
    ["headers", input.values.headers, input.spec.headers],
    ["body", input.values.body, input.spec.body],
  ]);
  if (invalid) {
    return {
      judgments: Object.freeze([{
        name: `request-validation:${invalid.area}`,
        value: "active",
        reason: `request ${invalid.area} did not satisfy schema`,
        path: `/${invalid.area}`,
      }]),
      valid: false,
      invalidArea: invalid.area,
      issues: invalid.result.issues,
    };
  }

  return {
    judgments: Object.freeze([{
      name: "request-validation",
      value: "potential",
      reason: "request contract admitted observed values",
      path: "",
    }]),
    valid: true,
    invalidArea: null,
    issues: Object.freeze([]),
    validated: selectedValidated(input.spec, input.values),
  };
}

export function requestValidationJudgments(input: RequestValidationInput): readonly RequestAdmissionJudgment[] {
  return validationProjection(input).judgments;
}

export function requestValidationReport(input: RequestValidationInput): RequestValidationReport {
  const projection = validationProjection(input);
  const settled = settleRequestTrace(input.trace, projection.judgments);
  return Object.freeze({
    trace: input.trace,
    settled,
    judgments: projection.judgments,
    valid: projection.valid,
    invalidArea: projection.invalidArea,
    issues: projection.issues,
    ...(projection.validated !== undefined ? { validated: projection.validated } : {}),
  });
}

function responseContractFor(spec: ResponseValidationSpec, status: number): ResponseValidationContract | undefined {
  return spec[String(status)] ?? spec[`${Math.floor(status / 100)}XX`] ?? spec[`${Math.floor(status / 100)}xx`] ?? spec.default;
}

function contentTypeMatches(contentType: string | undefined, allowed: string | readonly string[] | undefined): boolean {
  if (allowed === undefined) return true;
  const parsed = parseContentType(contentType);
  const observed = parsed?.type ?? "";
  return [allowed].flat().some((type) => type.toLowerCase() === observed);
}

function responseValidationProjection(input: ResponseValidationInput): {
  judgments: readonly RequestAdmissionJudgment[];
  valid: boolean;
  invalidArea: ResponseValidationArea | null;
  issues: readonly ValidationIssue[];
  contract?: ResponseValidationContract;
} {
  const contract = responseContractFor(input.spec, input.response.status);
  if (!contract) {
    const issues = Object.freeze([issue("/status", "status", `no response contract for status ${input.response.status}`)]);
    return {
      judgments: Object.freeze([{
        name: "response-validation:status",
        value: "active",
        reason: "response status had no admitted contract",
        path: "/status",
      }]),
      valid: false,
      invalidArea: "status",
      issues,
    };
  }

  if (!contentTypeMatches(input.response.contentType, contract.contentType)) {
    const issues = Object.freeze([
      issue("/contentType", "contentType", `expected ${[contract.contentType].flat().join(", ")}`),
    ]);
    return {
      judgments: Object.freeze([{
        name: "response-validation:content-type",
        value: "active",
        reason: "response media type was not admitted",
        path: "/contentType",
      }]),
      valid: false,
      invalidArea: "contentType",
      issues,
      contract,
    };
  }

  if (contract.headers !== undefined) {
    const result = validateJsonSchema(input.response.headers ?? {}, contract.headers);
    if (!result.valid) {
      return {
        judgments: Object.freeze([{
          name: "response-validation:headers",
          value: "active",
          reason: "response headers did not satisfy schema",
          path: "/headers",
        }]),
        valid: false,
        invalidArea: "headers",
        issues: result.issues,
        contract,
      };
    }
  }

  if (contract.body !== undefined) {
    const result = validateJsonSchema(input.response.body, contract.body);
    if (!result.valid) {
      return {
        judgments: Object.freeze([{
          name: "response-validation:body",
          value: "active",
          reason: "response body did not satisfy schema",
          path: "/body",
        }]),
        valid: false,
        invalidArea: "body",
        issues: result.issues,
        contract,
      };
    }
  }

  return {
    judgments: Object.freeze([{
      name: "response-validation",
      value: "potential",
      reason: "response contract admitted observed values",
      path: "",
    }]),
    valid: true,
    invalidArea: null,
    issues: Object.freeze([]),
    contract,
  };
}

export function responseValidationJudgments(input: ResponseValidationInput): readonly RequestAdmissionJudgment[] {
  return responseValidationProjection(input).judgments;
}

export function responseValidationReport(input: ResponseValidationInput): ResponseValidationReport {
  const projection = responseValidationProjection(input);
  const settled = settleRequestTrace(input.trace, projection.judgments);
  return Object.freeze({
    trace: input.trace,
    settled,
    judgments: projection.judgments,
    valid: projection.valid,
    invalidArea: projection.invalidArea,
    issues: projection.issues,
    ...(projection.contract !== undefined ? { contract: projection.contract } : {}),
  });
}

export function requestValidation(spec: RequestValidationSpec): Middleware {
  return async (ctx) => {
    const params = ctx.params;
    const query = queryObject(ctx);
    const headers = headerObject(ctx);
    const bodyContentType = ctx.request.headers.get("content-type") ?? undefined;

    if (!contentTypeAllowedValue(bodyContentType, spec)) {
      const report = requestValidationReport({
        trace: ctx.trace,
        spec,
        values: Object.freeze({ params, query, headers }),
        ...(bodyContentType !== undefined ? { contentType: bodyContentType } : {}),
      });
      return validationProblem(415, "Unsupported Media Type", report.issues);
    }

    const body = spec.body !== undefined ? await ctx.input.json() : undefined;

    const report = requestValidationReport({
      trace: ctx.trace,
      spec,
      values: Object.freeze({ params, query, headers, body }),
      ...(bodyContentType !== undefined ? { contentType: bodyContentType } : {}),
    });
    if (!report.valid && report.invalidArea) {
      return validationProblem(400, `Invalid ${report.invalidArea}`, report.issues);
    }

    ctx.locals.validated = report.validated ?? Object.freeze({});
  };
}

function schemaParameter(name: string, location: OpenApiParameter["in"], schema: JsonSchema, required = false): OpenApiParameter {
  return Object.freeze({ name, in: location, required, schema });
}

function objectProperties(schema: JsonSchema | undefined): Record<string, JsonSchema> {
  const properties = objectKeyword(schema, "properties");
  if (properties === undefined) return {};
  const out: Record<string, JsonSchema> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (isJsonSchema(value)) out[key] = value;
  }
  return out;
}

function requiredSet(schema: JsonSchema | undefined): Set<string> {
  if (!isObject(schema)) return new Set();
  const required = schema["required"];
  if (!Array.isArray(required)) return new Set();
  return new Set(required.filter((item): item is string => typeof item === "string"));
}

export function validationOpenApiMetadata(spec: RequestValidationSpec): OpenApiMetadata {
  const parameters: OpenApiParameter[] = [];
  for (const [name, schema] of Object.entries(objectProperties(spec.params))) {
    parameters.push(schemaParameter(name, "path", schema, true));
  }
  const requiredQuery = requiredSet(spec.query);
  for (const [name, schema] of Object.entries(objectProperties(spec.query))) {
    parameters.push(schemaParameter(name, "query", schema, requiredQuery.has(name)));
  }
  const requiredHeaders = requiredSet(spec.headers);
  for (const [name, schema] of Object.entries(objectProperties(spec.headers))) {
    parameters.push(schemaParameter(name, "header", schema, requiredHeaders.has(name)));
  }
  const responses: OpenApiResponses = Object.freeze({
    "400": Object.freeze({ description: "Invalid request" }),
    ...(spec.contentType !== undefined ? { "415": Object.freeze({ description: "Unsupported Media Type" }) } : {}),
  });
  return Object.freeze({
    ...(parameters.length ? { parameters: Object.freeze(parameters) } : {}),
    ...(spec.body !== undefined ? {
      requestBody: Object.freeze({
        required: true,
        content: Object.freeze(Object.fromEntries([spec.contentType ?? "application/json"].flat().map((type) => [
          type,
          Object.freeze({ schema: spec.body }),
        ]))),
      }),
    } : {}),
    responses,
  });
}

function responseContent(contract: ResponseValidationContract): OpenApiResponse["content"] | undefined {
  if (contract.body === undefined) return undefined;
  const body = contract.body;
  return Object.freeze(Object.fromEntries([contract.contentType ?? "application/json"].flat().map((type) => [
    type,
    Object.freeze({ schema: body }),
  ])));
}

function responseHeaders(contract: ResponseValidationContract): OpenApiResponse["headers"] | undefined {
  const properties = objectKeyword(contract.headers, "properties");
  if (properties === undefined) return undefined;
  return Object.freeze(Object.fromEntries(Object.entries(properties)
    .filter((entry): entry is [string, JsonSchema] => isJsonSchema(entry[1]))
    .map(([name, schema]) => [
      name,
      Object.freeze({ schema }),
    ])));
}

export function responseValidationOpenApiMetadata(spec: ResponseValidationSpec): OpenApiMetadata {
  const responses = Object.freeze(Object.fromEntries(Object.entries(spec).map(([status, contract]) => [
    status,
    Object.freeze({
      description: contract.description ?? (status === "default" ? "Default response" : `HTTP ${status}`),
      ...(responseContent(contract) !== undefined ? { content: responseContent(contract) } : {}),
      ...(responseHeaders(contract) !== undefined ? { headers: responseHeaders(contract) } : {}),
    }),
  ]))) as OpenApiResponses;
  return Object.freeze({ responses });
}

export function validatedResource(
  resource: Resource,
  validation: RequestValidationSpec,
  operation?: OpenApiMetadata | Readonly<Record<string, OpenApiMetadata>>,
): ValidatedResource {
  return Object.freeze({
    ...resource,
    validation,
    middlewares: Object.freeze([requestValidation(validation), ...(resource.middlewares ?? [])]),
    ...(operation !== undefined ? { openapi: operation } : {}),
  }) as ValidatedResource;
}
