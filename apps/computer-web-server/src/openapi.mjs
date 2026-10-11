import { validationOpenApiMetadata } from "./validation.mjs";
const HTTP_METHODS = new Set([
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace"
]);
function defaultResponses() {
    return Object.freeze({
        "200": Object.freeze({
            description: "OK"
        })
    });
}
function methodList(methods) {
    return Object.freeze((methods?.length ? methods : [
        "GET"
    ]).map((method)=>method.toLowerCase()).filter((method)=>HTTP_METHODS.has(method)));
}
export function openApiPath(pattern) {
    let wildcard = 0;
    return pattern.replace(/:([A-Za-z0-9_]+)\??/g, "{$1}").replace(/\*/g, ()=>`{wildcard${wildcard++ || ""}}`);
}
export function pathParameterNames(pattern) {
    const names = [];
    for (const match of pattern.matchAll(/:([A-Za-z0-9_]+)\??/g)){
        if (match[1] && !names.includes(match[1])) names.push(match[1]);
    }
    let wildcard = 0;
    for (const _ of pattern.matchAll(/\*/g))names.push(`wildcard${wildcard++ || ""}`);
    return Object.freeze(names);
}
function inferredPathParameters(pattern, existing = []) {
    const seen = new Set(existing.filter((parameter)=>parameter.in === "path").map((parameter)=>parameter.name));
    const inferred = pathParameterNames(pattern).filter((name)=>!seen.has(name)).map((name)=>Object.freeze({
            name,
            in: "path",
            required: true,
            schema: Object.freeze({
                type: "string"
            })
        }));
    return Object.freeze([
        ...inferred,
        ...existing
    ]);
}
function hasHeaderParameter(parameters, name) {
    return Boolean(parameters?.some((parameter)=>parameter.in === "header" && parameter.name.toLowerCase() === name.toLowerCase()));
}
function negotiationParameters(route, existing) {
    const parameters = [];
    if (route.produces?.length && !hasHeaderParameter(existing, "Accept")) {
        parameters.push(Object.freeze({
            name: "Accept",
            in: "header",
            required: false,
            description: `Preferred response media type. Offered types: ${route.produces.join(", ")}.`,
            schema: Object.freeze({
                type: "string"
            })
        }));
    }
    if (route.languages?.length && !hasHeaderParameter(existing, "Accept-Language")) {
        parameters.push(Object.freeze({
            name: "Accept-Language",
            in: "header",
            required: false,
            description: `Preferred response language. Offered languages: ${route.languages.join(", ")}.`,
            schema: Object.freeze({
                type: "string"
            })
        }));
    }
    return Object.freeze(parameters);
}
function responsesWithAdmission(route, responses) {
    if (!route.produces?.length && !route.languages?.length || responses["406"]) return responses;
    return Object.freeze({
        ...responses,
        "406": Object.freeze({
            description: "Not Acceptable"
        })
    });
}
function sameParameter(a, b) {
    return a.in === b.in && a.name.toLowerCase() === b.name.toLowerCase();
}
function mergeValidationMetadata(raw, validation) {
    if (!validation) return raw;
    const generated = validationOpenApiMetadata(validation);
    const explicit = raw.parameters ?? [];
    const generatedParameters = (generated.parameters ?? []).filter((parameter)=>!explicit.some((candidate)=>sameParameter(candidate, parameter)));
    return Object.freeze({
        ...generated,
        ...raw,
        ...generatedParameters.length || explicit.length ? {
            parameters: Object.freeze([
                ...generatedParameters,
                ...explicit
            ])
        } : {},
        requestBody: raw.requestBody ?? generated.requestBody,
        responses: Object.freeze({
            ...generated.responses ?? {},
            ...raw.responses ?? {}
        })
    });
}
function operationFor(method, route) {
    const input = route.operation;
    const keyed = input;
    const raw = keyed[method] ?? keyed[method.toUpperCase()] ?? (isOperationLike(input) ? input : undefined);
    if (!raw || raw.hide) return null;
    const merged = mergeValidationMetadata(raw, route.validation);
    const parameters = inferredPathParameters(route.path, [
        ...negotiationParameters(route, merged.parameters),
        ...merged.parameters ?? []
    ]);
    return Object.freeze({
        ...merged,
        parameters,
        responses: responsesWithAdmission(route, merged.responses ?? defaultResponses())
    });
}
function isOperationLike(value) {
    return Boolean(value && typeof value === "object" && ("responses" in value || "summary" in value || "description" in value || "operationId" in value || "tags" in value || "requestBody" in value));
}
export function openApiDocument(routes, options) {
    if (!options.title) throw new TypeError("openApiDocument requires options.title");
    const paths = {};
    for (const route of routes){
        const path = openApiPath(route.path);
        const pathItem = paths[path] ?? {};
        for (const method of methodList(route.methods)){
            const operation = operationFor(method, route);
            if (operation) pathItem[method] = operation;
        }
        if (Object.keys(pathItem).length > 0) paths[path] = pathItem;
    }
    const info = {
        title: options.title,
        version: options.version ?? "0.0.0"
    };
    if (options.description) info.description = options.description;
    const doc = {
        openapi: "3.1.1",
        info: Object.freeze(info),
        paths: Object.freeze(paths)
    };
    if (options.servers) doc.servers = Object.freeze([
        ...options.servers
    ]);
    if (options.components) doc.components = options.components;
    if (options.webhooks) doc.webhooks = options.webhooks;
    return Object.freeze(doc);
}
export function documentedResource(resource, operation) {
    return Object.freeze({
        ...resource,
        openapi: operation
    });
}
export function openApiRoutesFromApp(app) {
    return Object.freeze((app.resources ?? []).flatMap((resource)=>{
        const candidate = resource;
        const path = typeof candidate.match === "string" ? candidate.match : candidate.route;
        if (candidate.openapi === false || !candidate.openapi || !path) return [];
        const route = Object.freeze({
            path,
            methods: Object.freeze([
                ...candidate.methods ?? [
                    "GET"
                ]
            ]),
            operation: candidate.openapi,
            produces: candidate.produces ?? [],
            languages: candidate.languages ?? [],
            ...candidate.validation !== undefined ? {
                validation: candidate.validation
            } : {}
        });
        return [
            route
        ];
    }));
}
export function openApiResource(document, path = "/openapi.json") {
    return Object.freeze({
        match: path,
        methods: [
            "GET"
        ],
        produces: [
            "application/json"
        ],
        handler: ()=>{
            const doc = typeof document === "function" ? document() : document;
            return Response.json(doc);
        }
    });
}
export function withOpenApi(app, options) {
    const document = ()=>openApiDocument(openApiRoutesFromApp(app), options);
    return Object.freeze({
        ...app,
        resources: Object.freeze([
            ...app.resources ?? [],
            openApiResource(document, options.path ?? "/openapi.json")
        ])
    });
}
