import { randomBytes } from "node:crypto";
import { dispatchApplication } from "@red-cup-engineering/http-services-section/web-application-dispatch";
import { traceRequest } from "@red-cup-engineering/http-services-section/request-trace";
import { appendVary, applyCacheControl, applyCors, applySecurityHeaders, corsPreflight, ensureDateHeader, send } from "@red-cup-engineering/http-services-section/response";
import { sendWebResponse } from "@red-cup-engineering/http-services-section/web-bridge";
import { requestAbortSignal, requestTarget, requestBase } from "@red-cup-engineering/http-services-section/node-request";
import { createHttpServer, startHttpServer } from "@red-cup-engineering/http-services-section/node-server";
import { httpProblem, problemFromError, resolveProblemInstance, sendProblem } from "@red-cup-engineering/http-services-section/problem";
export function contextFor(req, res, app) {
    const trace = traceRequest(req, Date.now);
    const raw = req.url ?? "/";
    const base = requestBase(req, app);
    const target = requestTarget(raw);
    const url = (()=>{
        try {
            return new URL(target, base);
        } catch  {
            return new URL("/", base);
        }
    })();
    const signal = requestAbortSignal(req, res);
    const nonce = randomBytes(16).toString("base64url");
    return {
        req,
        res,
        app,
        url,
        params: {},
        locals: {
            ...app.locals ?? {}
        },
        nonce,
        signal,
        trace,
        startedAt: Date.now()
    };
}
function joinedHeaderValue(value) {
    return Array.isArray(value) ? value.join(",") : value;
}
export function nativeHttpHandler(app) {
    if (app.fetch) throw new TypeError("A portable application must use the web engine binding");
    return (req, res)=>{
        void handle(app, req, res).catch((error)=>{
            if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
            else res.destroy(error instanceof Error ? error : undefined);
        });
    };
}
export function createNativeApplicationServer(app, options = {}) {
    return createHttpServer({
        handle: nativeHttpHandler(app)
    }, options);
}
export function startNativeApplication(app, options = {}) {
    const transport = typeof options === "object" ? {
        ...app,
        ...options
    } : typeof options === "string" ? {
        ...app,
        path: options
    } : {
        ...app,
        port: options
    };
    return startHttpServer({
        handle: nativeHttpHandler(app)
    }, transport);
}
async function handle(app, req, res) {
    const ctx = contextFor(req, res, app);
    const rawProblemOptions = appProblemOptions(app);
    const problemOptions = rawProblemOptions ? { ...rawProblemOptions, now: Date.now() } : rawProblemOptions;
    let responseHookCalled = false;
    const fireOnResponse = async ()=>{
        if (responseHookCalled) return;
        responseHookCalled = true;
        await app.onResponse?.(ctx);
    };
    ensureDateHeader(res, Date.now());
    applyCacheControl(res, app.cacheControl);
    applySecurityHeaders(res, app.security, ctx.nonce);
    try {
        await dispatchApplication(app, ctx, {
            method: req.method ?? "GET",
            ...joinedHeaderValue(req.headers.accept) !== undefined ? {
                accept: joinedHeaderValue(req.headers.accept)
            } : {},
            ...joinedHeaderValue(req.headers["accept-language"]) !== undefined ? {
                acceptLanguage: joinedHeaderValue(req.headers["accept-language"])
            } : {}
        }, {
            accept: (value)=>sendReturnedResponse(ctx, value),
            preflight: async ()=>{
                if (req.method === "OPTIONS" && app.cors) {
                    corsPreflight(req, res, app.cors);
                    return true;
                }
                if (app.cors) applyCors(res, req, app.cors);
                return false;
            },
            matched: (resource)=>{
                ctx.resource = resource;
                if (resource.produces?.length) appendVary(res, "Accept");
                if (resource.languages?.length) appendVary(res, "Accept-Language");
            },
            admitted: ()=>{
                if (ctx.negotiatedLanguage) res.setHeader("Content-Language", ctx.negotiatedLanguage);
            },
            refuse: async ({ status, title, headers, evidence })=>{
                if (status === 204) {
                    res.writeHead(status, headers).end();
                    return;
                }
                if (evidence !== undefined && problemOptions) {
                    await sendProblem(req, res, httpProblem(status, title, {
                        extensions: {
                            evidence
                        }
                    }), problemOptions);
                    return;
                }
                if (await maybeSendProblem(ctx, status, title, problemOptions, headers ? {
                    headers
                } : undefined)) return;
                res.writeHead(status, headers).end(req.method === "HEAD" ? undefined : evidence !== undefined ? JSON.stringify({
                    error: "contradicted",
                    evidence
                }) : title);
            }
        });
    } catch (err) {
        if (app.onError) {
            try {
                const result = await app.onError(err, ctx);
                if (result === true || res.headersSent || res.writableEnded) return;
                if (await sendReturnedResponse(ctx, result)) return;
            } catch  {}
        }
        if (problemOptions && !res.headersSent) {
            const source = problemFromError(err, problemOptions);
            const instance = resolveProblemInstance(ctx, problemOptions) ?? source.instance;
            await sendProblem(req, res, instance === source.instance ? source : httpProblem(source.status, source.title, {
                type: source.type,
                headers: source.headers,
                extensions: source.extensions,
                ...source.detail !== undefined ? {
                    detail: source.detail
                } : {},
                ...instance !== undefined ? {
                    instance
                } : {},
                cause: err
            }), problemOptions);
            return;
        }
        if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
    } finally{
        if (res.writableEnded) await fireOnResponse();
    }
}
async function sendReturnedResponse(ctx, result) {
    if (result === undefined || result === null || ctx.res.headersSent || ctx.res.writableEnded) return false;
    if (result === false) return false;
    if (ctx.negotiatedLanguage) ctx.res.setHeader("Content-Language", ctx.negotiatedLanguage);
    if (result instanceof Response) {
        await sendWebResponse(ctx.res, result, {
            ...ctx.req.method === undefined ? {} : {
                method: ctx.req.method
            },
            ...ctx.req.headers["accept-encoding"] === undefined ? {} : {
                acceptEncoding: ctx.req.headers["accept-encoding"]
            },
            ...ctx.req.headers.range === undefined ? {} : {
                range: ctx.req.headers.range
            }
        });
        return true;
    }
    if (isRepr(result)) {
        await send(ctx.req, ctx.res, result, Date.now());
        return true;
    }
    throw new TypeError("request stage returned an unsupported response value");
}
function isRepr(value) {
    return typeof value === "object" && value !== null && ("body" in value || "status" in value || "headers" in value || "type" in value || "etag" in value || "lastModified" in value || "cacheControl" in value || "security" in value);
}
function appProblemOptions(app) {
    if (app.problems === true) return {};
    if (!app.problems) return null;
    return app.problems;
}
async function maybeSendProblem(ctx, status, title, options, extra) {
    if (!options || ctx.res.headersSent) return false;
    const instance = resolveProblemInstance(ctx, options);
    await sendProblem(ctx.req, ctx.res, httpProblem(status, title, {
        ...instance !== undefined ? {
            instance
        } : {},
        ...extra?.headers !== undefined ? {
            headers: extra.headers
        } : {}
    }), options);
    return true;
}
