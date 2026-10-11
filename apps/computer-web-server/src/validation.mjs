import { settleRequestTrace } from "@red-cup-engineering/http-services-section/request-trace";
import { parseContentType } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-type";
import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";
export { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";
function issue(path, keyword, message) {
    return Object.freeze({
        kind: "instance",
        path,
        keyword,
        message
    });
}
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isJsonSchema(value) {
    return typeof value === "boolean" || isObject(value);
}
function objectKeyword(schema, keyword) {
    if (!isObject(schema)) return undefined;
    const value = schema[keyword];
    return isObject(value) ? value : undefined;
}
function queryObject(ctx) {
    const out = {};
    for (const [key, value] of ctx.url.searchParams){
        if (!Object.hasOwn(out, key)) out[key] = value;
        else if (Array.isArray(out[key])) out[key].push(value);
        else out[key] = [
            out[key],
            value
        ];
    }
    return out;
}
function headerObject(ctx) {
    return Object.fromEntries(ctx.request.headers);
}
function contentTypeAllowedValue(contentType, spec) {
    if (spec.body === undefined || spec.contentType === undefined) return true;
    const parsed = parseContentType(contentType);
    const requestType = parsed?.type ?? "";
    const allowed = [
        spec.contentType
    ].flat();
    return allowed.some((type)=>type.toLowerCase() === requestType);
}
function validationProblem(status, title, issues) {
    return Response.json({
        type: "urn:561-group:web-server:problem:request-validation",
        title,
        status,
        issues
    }, {
        status,
        headers: {
            "cache-control": "no-store",
            "content-type": "application/problem+json"
        }
    });
}
function firstInvalid(entries) {
    for (const [area, value, schema] of entries){
        if (schema === undefined) continue;
        const result = validateJsonSchema(value, schema);
        if (!result.valid) return {
            area,
            result
        };
    }
    return null;
}
function selectedValidated(spec, values) {
    return Object.freeze({
        ...spec.params !== undefined ? {
            params: values.params
        } : {},
        ...spec.query !== undefined ? {
            query: values.query
        } : {},
        ...spec.headers !== undefined ? {
            headers: values.headers
        } : {},
        ...spec.body !== undefined ? {
            body: values.body
        } : {}
    });
}
function validationProjection(input) {
    if (!contentTypeAllowedValue(input.contentType, input.spec)) {
        const issues = Object.freeze([
            issue("/body", "contentType", `expected ${[
                input.spec.contentType
            ].flat().join(", ")}`)
        ]);
        return {
            judgments: Object.freeze([
                {
                    name: "request-validation:content-type",
                    value: "active",
                    reason: "request body media type was not admitted",
                    path: "/body"
                }
            ]),
            valid: false,
            invalidArea: "contentType",
            issues
        };
    }
    const invalid = firstInvalid([
        [
            "params",
            input.values.params,
            input.spec.params
        ],
        [
            "query",
            input.values.query,
            input.spec.query
        ],
        [
            "headers",
            input.values.headers,
            input.spec.headers
        ],
        [
            "body",
            input.values.body,
            input.spec.body
        ]
    ]);
    if (invalid) {
        return {
            judgments: Object.freeze([
                {
                    name: `request-validation:${invalid.area}`,
                    value: "active",
                    reason: `request ${invalid.area} did not satisfy schema`,
                    path: `/${invalid.area}`
                }
            ]),
            valid: false,
            invalidArea: invalid.area,
            issues: invalid.result.issues
        };
    }
    return {
        judgments: Object.freeze([
            {
                name: "request-validation",
                value: "potential",
                reason: "request contract admitted observed values",
                path: ""
            }
        ]),
        valid: true,
        invalidArea: null,
        issues: Object.freeze([]),
        validated: selectedValidated(input.spec, input.values)
    };
}
export function requestValidationJudgments(input) {
    return validationProjection(input).judgments;
}
export function requestValidationReport(input) {
    const projection = validationProjection(input);
    const settled = settleRequestTrace(input.trace, projection.judgments);
    return Object.freeze({
        trace: input.trace,
        settled,
        judgments: projection.judgments,
        valid: projection.valid,
        invalidArea: projection.invalidArea,
        issues: projection.issues,
        ...projection.validated !== undefined ? {
            validated: projection.validated
        } : {}
    });
}
function responseContractFor(spec, status) {
    return spec[String(status)] ?? spec[`${Math.floor(status / 100)}XX`] ?? spec[`${Math.floor(status / 100)}xx`] ?? spec.default;
}
function contentTypeMatches(contentType, allowed) {
    if (allowed === undefined) return true;
    const parsed = parseContentType(contentType);
    const observed = parsed?.type ?? "";
    return [
        allowed
    ].flat().some((type)=>type.toLowerCase() === observed);
}
function responseValidationProjection(input) {
    const contract = responseContractFor(input.spec, input.response.status);
    if (!contract) {
        const issues = Object.freeze([
            issue("/status", "status", `no response contract for status ${input.response.status}`)
        ]);
        return {
            judgments: Object.freeze([
                {
                    name: "response-validation:status",
                    value: "active",
                    reason: "response status had no admitted contract",
                    path: "/status"
                }
            ]),
            valid: false,
            invalidArea: "status",
            issues
        };
    }
    if (!contentTypeMatches(input.response.contentType, contract.contentType)) {
        const issues = Object.freeze([
            issue("/contentType", "contentType", `expected ${[
                contract.contentType
            ].flat().join(", ")}`)
        ]);
        return {
            judgments: Object.freeze([
                {
                    name: "response-validation:content-type",
                    value: "active",
                    reason: "response media type was not admitted",
                    path: "/contentType"
                }
            ]),
            valid: false,
            invalidArea: "contentType",
            issues,
            contract
        };
    }
    if (contract.headers !== undefined) {
        const result = validateJsonSchema(input.response.headers ?? {}, contract.headers);
        if (!result.valid) {
            return {
                judgments: Object.freeze([
                    {
                        name: "response-validation:headers",
                        value: "active",
                        reason: "response headers did not satisfy schema",
                        path: "/headers"
                    }
                ]),
                valid: false,
                invalidArea: "headers",
                issues: result.issues,
                contract
            };
        }
    }
    if (contract.body !== undefined) {
        const result = validateJsonSchema(input.response.body, contract.body);
        if (!result.valid) {
            return {
                judgments: Object.freeze([
                    {
                        name: "response-validation:body",
                        value: "active",
                        reason: "response body did not satisfy schema",
                        path: "/body"
                    }
                ]),
                valid: false,
                invalidArea: "body",
                issues: result.issues,
                contract
            };
        }
    }
    return {
        judgments: Object.freeze([
            {
                name: "response-validation",
                value: "potential",
                reason: "response contract admitted observed values",
                path: ""
            }
        ]),
        valid: true,
        invalidArea: null,
        issues: Object.freeze([]),
        contract
    };
}
export function responseValidationJudgments(input) {
    return responseValidationProjection(input).judgments;
}
export function responseValidationReport(input) {
    const projection = responseValidationProjection(input);
    const settled = settleRequestTrace(input.trace, projection.judgments);
    return Object.freeze({
        trace: input.trace,
        settled,
        judgments: projection.judgments,
        valid: projection.valid,
        invalidArea: projection.invalidArea,
        issues: projection.issues,
        ...projection.contract !== undefined ? {
            contract: projection.contract
        } : {}
    });
}
export function requestValidation(spec) {
    return async (ctx)=>{
        const params = ctx.params;
        const query = queryObject(ctx);
        const headers = headerObject(ctx);
        const bodyContentType = ctx.request.headers.get("content-type") ?? undefined;
        if (!contentTypeAllowedValue(bodyContentType, spec)) {
            const report = requestValidationReport({
                trace: ctx.trace,
                spec,
                values: Object.freeze({
                    params,
                    query,
                    headers
                }),
                ...bodyContentType !== undefined ? {
                    contentType: bodyContentType
                } : {}
            });
            return validationProblem(415, "Unsupported Media Type", report.issues);
        }
        const body = spec.body !== undefined ? await ctx.input.json() : undefined;
        const report = requestValidationReport({
            trace: ctx.trace,
            spec,
            values: Object.freeze({
                params,
                query,
                headers,
                body
            }),
            ...bodyContentType !== undefined ? {
                contentType: bodyContentType
            } : {}
        });
        if (!report.valid && report.invalidArea) {
            return validationProblem(400, `Invalid ${report.invalidArea}`, report.issues);
        }
        ctx.locals.validated = report.validated ?? Object.freeze({});
    };
}
function schemaParameter(name, location, schema, required = false) {
    return Object.freeze({
        name,
        in: location,
        required,
        schema
    });
}
function objectProperties(schema) {
    const properties = objectKeyword(schema, "properties");
    if (properties === undefined) return {};
    const out = {};
    for (const [key, value] of Object.entries(properties)){
        if (isJsonSchema(value)) out[key] = value;
    }
    return out;
}
function requiredSet(schema) {
    if (!isObject(schema)) return new Set();
    const required = schema["required"];
    if (!Array.isArray(required)) return new Set();
    return new Set(required.filter((item)=>typeof item === "string"));
}
export function validationOpenApiMetadata(spec) {
    const parameters = [];
    for (const [name, schema] of Object.entries(objectProperties(spec.params))){
        parameters.push(schemaParameter(name, "path", schema, true));
    }
    const requiredQuery = requiredSet(spec.query);
    for (const [name, schema] of Object.entries(objectProperties(spec.query))){
        parameters.push(schemaParameter(name, "query", schema, requiredQuery.has(name)));
    }
    const requiredHeaders = requiredSet(spec.headers);
    for (const [name, schema] of Object.entries(objectProperties(spec.headers))){
        parameters.push(schemaParameter(name, "header", schema, requiredHeaders.has(name)));
    }
    const responses = Object.freeze({
        "400": Object.freeze({
            description: "Invalid request"
        }),
        ...spec.contentType !== undefined ? {
            "415": Object.freeze({
                description: "Unsupported Media Type"
            })
        } : {}
    });
    return Object.freeze({
        ...parameters.length ? {
            parameters: Object.freeze(parameters)
        } : {},
        ...spec.body !== undefined ? {
            requestBody: Object.freeze({
                required: true,
                content: Object.freeze(Object.fromEntries([
                    spec.contentType ?? "application/json"
                ].flat().map((type)=>[
                        type,
                        Object.freeze({
                            schema: spec.body
                        })
                    ])))
            })
        } : {},
        responses
    });
}
function responseContent(contract) {
    if (contract.body === undefined) return undefined;
    const body = contract.body;
    return Object.freeze(Object.fromEntries([
        contract.contentType ?? "application/json"
    ].flat().map((type)=>[
            type,
            Object.freeze({
                schema: body
            })
        ])));
}
function responseHeaders(contract) {
    const properties = objectKeyword(contract.headers, "properties");
    if (properties === undefined) return undefined;
    return Object.freeze(Object.fromEntries(Object.entries(properties).filter((entry)=>isJsonSchema(entry[1])).map(([name, schema])=>[
            name,
            Object.freeze({
                schema
            })
        ])));
}
export function responseValidationOpenApiMetadata(spec) {
    const responses = Object.freeze(Object.fromEntries(Object.entries(spec).map(([status, contract])=>[
            status,
            Object.freeze({
                description: contract.description ?? (status === "default" ? "Default response" : `HTTP ${status}`),
                ...responseContent(contract) !== undefined ? {
                    content: responseContent(contract)
                } : {},
                ...responseHeaders(contract) !== undefined ? {
                    headers: responseHeaders(contract)
                } : {}
            })
        ])));
    return Object.freeze({
        responses
    });
}
export function validatedResource(resource, validation, operation) {
    return Object.freeze({
        ...resource,
        validation,
        middlewares: Object.freeze([
            requestValidation(validation),
            ...resource.middlewares ?? []
        ]),
        ...operation !== undefined ? {
            openapi: operation
        } : {}
    });
}
