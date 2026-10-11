import { randomBytes, randomUUID } from "node:crypto";
import { accessLog } from "./access-log.mjs";
import { metrics } from "./metrics.mjs";
import { correlationId, serverTiming, traceContext } from "./trace.mjs";
const defaultNow = () => Date.now();
const defaultGenerateBytes = (size) => randomBytes(size);
const defaultGenerateId = (size) => randomBytes(size).toString("hex");
const defaultRandom = () => Math.random();
const defaultGenerate = () => randomUUID();
export function observability(options = {}) {
    const middlewares = [];
    const resources = [];
    const onResponseHooks = [];
    if (options.correlation !== false) {
        const correlationOptions = options.correlation === true || options.correlation === undefined ? {} : options.correlation;
        middlewares.push(correlationId({ generate: defaultGenerate, ...correlationOptions }));
    }
    if (options.trace !== false) {
        const traceOptions = options.trace === true || options.trace === undefined ? {} : options.trace;
        middlewares.push(traceContext({ generateBytes: defaultGenerateBytes, random: defaultRandom, ...traceOptions }));
    }
    const timing = options.serverTiming === false ? undefined : serverTiming(options.serverTiming === true || options.serverTiming === undefined ? {} : options.serverTiming);
    if (timing) middlewares.push(timing.middleware);
    const metricSurface = options.metrics === false ? undefined : metrics({ now: defaultNow, generateId: defaultGenerateId, ...metricOptions(options.metrics) });
    if (metricSurface) {
        const path = metricPath(options.metrics);
        middlewares.push(metricsMiddleware(metricSurface.middleware, path));
        onResponseHooks.push(metricSurface.onResponse);
        if (path !== false) resources.push(path === metricSurface.resource.match ? metricSurface.resource : {
            ...metricSurface.resource,
            match: path
        });
    }
    if (options.accessLog !== false && options.accessLog !== undefined) {
        middlewares.push(accessLog(options.accessLog === true ? {} : options.accessLog));
    }
    const app = {
        middlewares,
        resources
    };
    if (onResponseHooks.length) {
        app.onResponse = async (ctx)=>{
            for (const hook of onResponseHooks)await hook(ctx);
        };
    }
    if (metricSurface) {
        app.metrics = metricSurface;
        app.registry = metricSurface.registry;
    }
    if (timing) app.serverTiming = timing;
    return app;
}
function metricOptions(input) {
    if (input === true || input === false || input === undefined) return {};
    const { path: _path, ...rest } = input;
    return rest;
}
function metricPath(input) {
    if (input === true || input === false || input === undefined) return "/metrics";
    if (input.path === false) return false;
    return input.path ?? "/metrics";
}
function metricsMiddleware(inner, scrapePath) {
    return (ctx)=>{
        if (scrapePath !== false && ctx.url.pathname === scrapePath) return;
        return inner(ctx);
    };
}
