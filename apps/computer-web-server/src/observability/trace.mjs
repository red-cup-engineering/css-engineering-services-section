import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
function partsFromArgs(args) {
    if (args.length === 1) return {
        req: args[0].req,
        res: args[0].res,
        ctx: args[0]
    };
    return {
        req: args[0],
        res: args[1],
        ctx: args[2]
    };
}
const TIMINGS = Symbol.for("@red-cup-engineering/webserver.serverTimings");
const SERVER_TIMING_ARMED = Symbol.for("@red-cup-engineering/webserver.serverTimingArmed");
const TRACE_OBJECT = Symbol.for("@red-cup-engineering/webserver.traceObject");
function nowMs() {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Number(process.hrtime.bigint()) / 1e6;
}
function timingsOf(ctx) {
    let map = ctx[TIMINGS];
    if (!map) {
        map = new Map();
        ctx[TIMINGS] = map;
    }
    return map;
}
function sanitizeTimingName(name) {
    const token = String(name ?? "").replace(/[^!#$%&'*+\-.^_`|~0-9A-Za-z]/g, "");
    return token || "_";
}
function quoteDesc(desc) {
    return `"${String(desc).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function formatDur(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n < 0) return "0";
    return String(Math.round(n * 1000) / 1000);
}
export function renderServerTiming(ctx) {
    const map = ctx?.[TIMINGS];
    if (!map?.size) return "";
    const members = [];
    for (const [name, measure] of map){
        let member = sanitizeTimingName(name);
        if (measure.dur !== undefined) member += `;dur=${formatDur(measure.dur)}`;
        if (measure.desc !== undefined && measure.desc !== "") member += `;desc=${quoteDesc(measure.desc)}`;
        members.push(member);
    }
    return members.join(", ");
}
export function serverTiming(options = {}) {
    const headerName = (options.headerName ?? "server-timing").toLowerCase();
    const total = options.total ?? true;
    const totalName = options.totalName ?? "total";
    function start(ctx, name, desc) {
        timingsOf(ctx).set(name, {
            start: nowMs(),
            ...desc !== undefined ? {
                desc
            } : {}
        });
        return ()=>end(ctx, name);
    }
    function end(ctx, name, desc) {
        const map = timingsOf(ctx);
        const measure = map.get(name);
        const dur = measure?.start !== undefined ? nowMs() - measure.start : 0;
        const next = {
            dur
        };
        const nextDesc = desc ?? measure?.desc;
        if (nextDesc !== undefined) next.desc = nextDesc;
        map.set(name, next);
        return dur;
    }
    function record(ctx, name, dur, desc) {
        const measure = {};
        if (dur !== undefined) measure.dur = Number(dur);
        if (desc !== undefined) measure.desc = desc;
        timingsOf(ctx).set(name, measure);
    }
    function emit(res, ctx, began) {
        try {
            if (!res || res.headersSent || !ctx) return;
            if (total && !ctx[TIMINGS]?.has(totalName)) {
                record(ctx, totalName, began !== undefined ? nowMs() - began : 0, "Total response time");
            }
            const value = renderServerTiming(ctx);
            if (value) res.setHeader(headerName, value);
        } catch  {}
    }
    const middleware = (...args)=>{
        const { res, ctx } = partsFromArgs(args);
        if (res[SERVER_TIMING_ARMED]) return false;
        res[SERVER_TIMING_ARMED] = true;
        const began = nowMs();
        const api = {
            start: (name, desc)=>start(ctx, name, desc),
            end: (name, desc)=>end(ctx, name, desc),
            record: (name, dur, desc)=>record(ctx, name, dur, desc),
            add: (name, dur, desc)=>record(ctx, name, dur, desc)
        };
        ctx.serverTiming = api;
        if (ctx.locals && typeof ctx.locals === "object") ctx.locals.timing = api;
        if (typeof res.writeHead === "function") {
            const original = res.writeHead.bind(res);
            res.writeHead = (...writeArgs)=>{
                emit(res, ctx, began);
                return original(...writeArgs);
            };
        }
        return false;
    };
    return {
        middleware,
        start,
        end,
        record,
        header: renderServerTiming,
        onResponse (info = {}) {
            if ("res" in info && "req" in info && "startedAt" in info) emit(info.res, info);
            else emit(info.res, info.ctx);
        }
    };
}
const HEX2 = /^[0-9a-f]{2}$/;
const HEX16 = /^[0-9a-f]{16}$/;
const HEX32 = /^[0-9a-f]{32}$/;
const ZERO16 = "0".repeat(16);
const ZERO32 = "0".repeat(32);
export function newTraceId(generateBytes) {
    if (typeof generateBytes !== "function") throw new TypeError("newTraceId: generateBytes (a random-bytes function) is required");
    let id = generateBytes(16).toString("hex");
    if (id === ZERO32) id = `${ZERO32.slice(0, -1)}1`;
    return id;
}
export function newSpanId(generateBytes) {
    if (typeof generateBytes !== "function") throw new TypeError("newSpanId: generateBytes (a random-bytes function) is required");
    let id = generateBytes(8).toString("hex");
    if (id === ZERO16) id = `${ZERO16.slice(0, -1)}1`;
    return id;
}
export function parseTraceparent(value) {
    if (typeof value !== "string") return null;
    const parts = value.trim().toLowerCase().split("-");
    if (parts.length < 4) return null;
    const [version, traceId, parentId, flags] = parts;
    if (!version || !traceId || !parentId || !flags) return null;
    if (!HEX2.test(version) || version === "ff") return null;
    if (version === "00" && parts.length !== 4) return null;
    if (!HEX32.test(traceId) || traceId === ZERO32) return null;
    if (!HEX16.test(parentId) || parentId === ZERO16) return null;
    if (!HEX2.test(flags)) return null;
    return {
        version,
        traceId,
        parentId,
        flags,
        sampled: (parseInt(flags, 16) & 1) === 1
    };
}
export function formatTraceparent({ traceId, spanId, flags, sampled }) {
    const renderedFlags = flags !== undefined ? String(flags).padStart(2, "0").slice(-2) : sampled ? "01" : "00";
    return `00-${traceId}-${spanId}-${renderedFlags}`;
}
export function parseTracestate(value) {
    if (typeof value !== "string" || !value.trim()) return [];
    const out = [];
    for (const raw of value.split(",")){
        const member = raw.trim();
        const eq = member.indexOf("=");
        if (eq <= 0) continue;
        const key = member.slice(0, eq).trim();
        const val = member.slice(eq + 1).trim();
        if (!key || !val) continue;
        out.push({
            key,
            value: val
        });
        if (out.length >= 32) break;
    }
    return out;
}
export function formatTracestate(members) {
    const list = Array.isArray(members) ? members : Object.entries(members ?? {}).map(([key, value])=>({
            key,
            value: value === undefined ? "" : String(value)
        }));
    return list.filter((member)=>member.key && member.value !== "").slice(0, 32).map((member)=>`${member.key}=${member.value}`).join(",");
}
function withVendor(members, key, value) {
    if (!key) return members;
    return [
        {
            key,
            value
        },
        ...members.filter((member)=>member.key !== key)
    ].slice(0, 32);
}
export function traceObjectOf(ctx, key = TRACE_OBJECT) {
    return ctx[key];
}
export function traceContext(options = {}) {
    if (typeof options.generateBytes !== "function") throw new TypeError("traceContext: options.generateBytes (a random-bytes function) is required");
    if (typeof options.random !== "function") throw new TypeError("traceContext: options.random (a function returning a float in [0,1)) is required");
    const { generateBytes, random } = options;
    const store = new TellingLog();
    const trustIncoming = options.trustIncoming ?? true;
    const trust = typeof trustIncoming === "function" ? trustIncoming : ()=>Boolean(trustIncoming);
    const respond = options.respond ?? true;
    const responseHeader = (options.headerName ?? "traceresponse").toLowerCase();
    const localsKey = options.localsKey ?? "traceContext";
    const sampleRate = options.sampleRate ?? 1;
    return (...args)=>{
        const { req, res, ctx } = partsFromArgs(args);
        const rawTraceparent = Array.isArray(req.headers.traceparent) ? req.headers.traceparent[0] : req.headers.traceparent;
        const incoming = parseTraceparent(rawTraceparent);
        const rawTracestate = Array.isArray(req.headers.tracestate) ? req.headers.tracestate.join(",") : req.headers.tracestate;
        const tracestate = parseTracestate(rawTracestate);
        let traceId;
        let parentId;
        let sampled;
        let version = "00";
        if (incoming && trust(req, ctx)) {
            traceId = incoming.traceId;
            parentId = incoming.parentId;
            sampled = incoming.sampled;
            version = incoming.version;
        } else {
            traceId = newTraceId(generateBytes);
            parentId = null;
            sampled = options.sampler ? Boolean(options.sampler(incoming, req, ctx)) : incoming ? incoming.sampled : random() < sampleRate;
        }
        if (options.forceSample) sampled = true;
        const spanId = newSpanId(generateBytes);
        const flags = sampled ? "01" : "00";
        const trace = {
            traceId,
            spanId,
            parentId,
            sampled,
            flags: sampled ? "01" : flags,
            version,
            tracestate,
            traceparent () {
                return formatTraceparent({
                    traceId,
                    spanId,
                    flags: this.flags
                });
            },
            propagationHeaders (extra) {
                const members = withVendor(tracestate, options.vendor, spanId);
                const headers = {
                    traceparent: formatTraceparent({
                        traceId,
                        spanId,
                        flags: this.flags
                    })
                };
                const renderedState = formatTracestate(members);
                if (renderedState) headers.tracestate = renderedState;
                return {
                    ...headers,
                    ...extra ?? {}
                };
            },
            child () {
                const childSpan = newSpanId(generateBytes);
                return {
                    traceId,
                    spanId: childSpan,
                    parentId: spanId,
                    sampled,
                    flags: this.flags,
                    traceparent () {
                        return formatTraceparent({
                            traceId,
                            spanId: childSpan,
                            flags: this.flags
                        });
                    }
                };
            }
        };
        ctx[TRACE_OBJECT] = trace;
        if (ctx.locals && typeof ctx.locals === "object") ctx.locals[localsKey] = {
            traceId,
            spanId,
            flags: sampled ? 1 : 0,
            ...rawTracestate !== undefined ? {
                state: String(rawTracestate)
            } : {}
        };
        if (respond && !res.headersSent) {
            try {
                res.setHeader(responseHeader, trace.traceparent());
            } catch  {}
        }
        tellSides(store, {
            subject: traceId,
            predicate: "trace",
            object: spanId
        }, [
            true,
            false
        ]);
        return false;
    };
}
export function propagationHeaders(tc) {
    if ("propagationHeaders" in tc) return tc.propagationHeaders();
    const headers = {
        traceparent: formatTraceparent({
            traceId: tc.traceId,
            spanId: tc.spanId,
            sampled: tc.flags === 1
        })
    };
    if (tc.state) headers.tracestate = tc.state;
    return headers;
}
export function span(name, opts = {}) {
    if (typeof opts.now !== "function") throw new TypeError("span: opts.now (a clock function) is required");
    if (typeof opts.generateBytes !== "function") throw new TypeError("span: opts.generateBytes (a random-bytes function) is required");
    const localsKey = opts.localsKey ?? "trace";
    return (ctx)=>{
        const tc = ctx.locals[localsKey];
        const parentSpanId = tc?.spanId;
        const current = {
            traceId: tc?.traceId ?? ZERO32,
            spanId: newSpanId(opts.generateBytes),
            ...parentSpanId !== undefined ? {
                parentSpanId
            } : {},
            name,
            startMs: opts.now(),
            attributes: {
                "http.method": ctx.req.method ?? "GET",
                "http.url": ctx.url.href
            },
            status: "unset",
            end (attrs = {}) {
                this.endMs = opts.now();
                Object.assign(this.attributes, attrs, {
                    "http.status_code": ctx.res.statusCode
                });
                this.status = ctx.res.statusCode < 500 ? "ok" : "error";
                opts.exporter?.(this);
            }
        };
        ctx.locals.span = current;
        const originalEnd = ctx.res.end.bind(ctx.res);
        ctx.res.end = function patchedEnd(...args) {
            if (!current.endMs) current.end();
            return originalEnd(...args);
        };
    };
}
const REQUEST_ID_HEADERS = [
    "x-request-id",
    "x-correlation-id",
    "x-amzn-trace-id",
    "x-amz-request-id"
];
function validId(value) {
    return typeof value === "string" && /^[\x21-\x7e]{1,200}$/.test(value);
}
export function correlationId(options = {}) {
    const headerName = (options.headerName ?? options.header ?? "x-request-id").toLowerCase();
    const reads = (options.headerNames?.length ? options.headerNames : REQUEST_ID_HEADERS).map((header)=>header.toLowerCase());
    const trustIncoming = options.trustIncoming ?? options.trustProxy ?? true;
    const trust = typeof trustIncoming === "function" ? trustIncoming : ()=>Boolean(trustIncoming);
    if (typeof options.generate !== "function") throw new TypeError("correlationId: options.generate (a random-id function) is required");
    const generate = options.generate;
    const localsKey = options.localsKey ?? "requestId";
    const echo = options.echo ?? true;
    return (...args)=>{
        const { req, res, ctx } = partsFromArgs(args);
        let id;
        if (trust(req, ctx)) {
            for (const header of reads){
                const value = req.headers[header];
                const candidate = Array.isArray(value) ? value[0] : value;
                if (validId(candidate)) {
                    id = candidate;
                    break;
                }
            }
        }
        id ??= String(generate(req, ctx));
        ctx.requestId = id;
        if (ctx.locals && typeof ctx.locals === "object") ctx.locals[localsKey] = id;
        req.id = id;
        if (echo && !res.headersSent) {
            try {
                res.setHeader(headerName, id);
            } catch  {}
        }
        return false;
    };
}
