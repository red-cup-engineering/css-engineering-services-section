import assert from "node:assert/strict";
import { test } from "node:test";
import { requestValidationReport, responseValidationOpenApiMetadata, responseValidationReport, validationOpenApiMetadata } from "@red-cup-engineering/computer-web-server/validation";
const trace = Object.freeze({
    kind: "web-server.request-trace",
    id: "validation-test",
    entries: Object.freeze([])
});
test("request validation describes a rejected content type with a validation issue", ()=>{
    const report = requestValidationReport({
        trace,
        spec: {
            body: {
                type: "object"
            },
            contentType: "application/json"
        },
        values: {},
        contentType: "text/plain"
    });
    assert.equal(report.valid, false);
    assert.equal(report.invalidArea, "contentType");
    assert.deepEqual(report.issues, [
        {
            kind: "instance",
            path: "/body",
            keyword: "contentType",
            message: "expected application/json"
        }
    ]);
});
test("response validation describes a status without a contract", ()=>{
    const report = responseValidationReport({
        trace,
        spec: {},
        response: {
            status: 418
        }
    });
    assert.equal(report.valid, false);
    assert.equal(report.invalidArea, "status");
    assert.deepEqual(report.issues, [
        {
            kind: "instance",
            path: "/status",
            keyword: "status",
            message: "no response contract for status 418"
        }
    ]);
});
test("request OpenAPI metadata admits only JSON Schemas from schema properties", ()=>{
    const metadata = validationOpenApiMetadata({
        query: {
            type: "object",
            required: [
                "term",
                17
            ],
            properties: {
                term: {
                    type: "string"
                },
                unconstrained: true,
                forbidden: false,
                malformedArray: [],
                malformedNull: null
            }
        }
    });
    assert.deepEqual(metadata.parameters, [
        {
            name: "term",
            in: "query",
            required: true,
            schema: {
                type: "string"
            }
        },
        {
            name: "unconstrained",
            in: "query",
            required: false,
            schema: true
        },
        {
            name: "forbidden",
            in: "query",
            required: false,
            schema: false
        }
    ]);
});
test("response OpenAPI metadata narrows header properties before projecting them", ()=>{
    const metadata = responseValidationOpenApiMetadata({
        200: {
            headers: {
                type: "object",
                properties: {
                    etag: {
                        type: "string"
                    },
                    optional: true,
                    malformed: [
                        "not",
                        "a",
                        "schema"
                    ]
                }
            }
        }
    });
    assert.deepEqual(metadata.responses["200"]?.headers, {
        etag: {
            schema: {
                type: "string"
            }
        },
        optional: {
            schema: true
        }
    });
});
