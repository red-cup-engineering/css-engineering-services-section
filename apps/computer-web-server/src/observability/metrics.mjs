export const DEFAULT_BUCKETS = [
    0.005,
    0.01,
    0.025,
    0.05,
    0.1,
    0.25,
    0.5,
    1,
    2.5,
    5,
    10
];
function escapeLabelValue(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
function escapeHelp(text) {
    return String(text).replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}
function labelSet(labels) {
    const keys = Object.keys(labels).filter((key)=>labels[key] !== undefined && labels[key] !== null).sort();
    if (!keys.length) return "";
    return `{${keys.map((key)=>`${key}="${escapeLabelValue(labels[key])}"`).join(",")}}`;
}
function formatNumber(value) {
    if (value === Infinity) return "+Inf";
    if (value === -Infinity) return "-Inf";
    if (Number.isNaN(value)) return "NaN";
    return String(value);
}
function keyOf(labels) {
    return Object.keys(labels).sort().map((key)=>`${key}=${labels[key]}`).join("\0");
}
function pickLabels(labelNames, labels = {}) {
    const picked = {};
    for (const name of labelNames)picked[name] = String(labels[name] ?? "");
    return picked;
}
export class Counter {
    family;
    constructor(family){
        this.family = family;
    }
    get name() {
        return this.family.name;
    }
    get help() {
        return this.family.help;
    }
    get labelNames() {
        return this.family.labelNames;
    }
    inc(labels = {}, delta = 1) {
        if (delta < 0) throw new Error("counter cannot decrease");
        const picked = pickLabels(this.family.labelNames, labels);
        const key = keyOf(picked);
        const series = this.family.series.get(key);
        if (series) series.value += delta;
        else this.family.series.set(key, {
            labels: picked,
            value: delta
        });
    }
    get(labels = {}) {
        return this.family.series.get(keyOf(pickLabels(this.family.labelNames, labels)))?.value ?? 0;
    }
    collect() {
        return renderFamily(this.family);
    }
}
export class Gauge {
    family;
    constructor(family){
        this.family = family;
    }
    get name() {
        return this.family.name;
    }
    get help() {
        return this.family.help;
    }
    get labelNames() {
        return this.family.labelNames;
    }
    at(labels = {}) {
        const picked = pickLabels(this.family.labelNames, labels);
        const key = keyOf(picked);
        let series = this.family.series.get(key);
        if (!series) {
            series = {
                labels: picked,
                value: 0
            };
            this.family.series.set(key, series);
        }
        return series;
    }
    set(labels = {}, value) {
        this.at(labels).value = value;
    }
    inc(labels = {}, delta = 1) {
        this.at(labels).value += delta;
    }
    dec(labels = {}, delta = 1) {
        this.at(labels).value -= delta;
    }
    get(labels = {}) {
        return this.family.series.get(keyOf(pickLabels(this.family.labelNames, labels)))?.value ?? 0;
    }
    collect() {
        return renderFamily(this.family);
    }
}
export class Histogram {
    family;
    constructor(family){
        this.family = family;
    }
    get name() {
        return this.family.name;
    }
    get help() {
        return this.family.help;
    }
    get labelNames() {
        return this.family.labelNames;
    }
    at(labels = {}) {
        const picked = pickLabels(this.family.labelNames, labels);
        const key = keyOf(picked);
        let series = this.family.series.get(key);
        if (!series) {
            series = {
                labels: picked,
                counts: new Array(this.family.buckets.length).fill(0),
                sum: 0,
                count: 0
            };
            this.family.series.set(key, series);
        }
        return series;
    }
    observe(labels = {}, value) {
        const series = this.at(labels);
        series.count += 1;
        series.sum += value;
        for(let i = 0; i < this.family.buckets.length; i++){
            if (value <= this.family.buckets[i]) series.counts[i] = (series.counts[i] ?? 0) + 1;
        }
    }
    get(labels = {}) {
        return this.family.series.get(keyOf(pickLabels(this.family.labelNames, labels)));
    }
    collect() {
        return renderFamily(this.family);
    }
}
function renderFamily(family) {
    const lines = [];
    if (family.help) lines.push(`# HELP ${family.name} ${escapeHelp(family.help)}`);
    lines.push(`# TYPE ${family.name} ${family.type}`);
    if (family.type === "histogram") {
        for (const series of family.series.values()){
            for(let i = 0; i < family.buckets.length; i++){
                lines.push(`${family.name}_bucket${labelSet({
                    ...series.labels,
                    le: formatNumber(family.buckets[i])
                })} ${series.counts[i]}`);
            }
            lines.push(`${family.name}_bucket${labelSet({
                ...series.labels,
                le: "+Inf"
            })} ${series.count}`);
            lines.push(`${family.name}_sum${labelSet(series.labels)} ${formatNumber(series.sum)}`);
            lines.push(`${family.name}_count${labelSet(series.labels)} ${series.count}`);
        }
        return lines.join("\n");
    }
    for (const series of family.series.values()){
        lines.push(`${family.name}${labelSet(series.labels)} ${formatNumber(series.value)}`);
    }
    return lines.join("\n");
}
export class MetricsRegistry {
    families = new Map();
    render;
    constructor(){
        this.render = Object.assign(()=>this.collect(), {
            contentType: "text/plain; version=0.0.4; charset=utf-8"
        });
    }
    registerFamily(name, type, help, labelNames = [], buckets = DEFAULT_BUCKETS) {
        const existing = this.families.get(name);
        if (existing) {
            if (existing.type !== type) throw new Error(`metric ${name} already registered as ${existing.type}`);
            return existing;
        }
        const family = type === "histogram" ? {
            name,
            type,
            help,
            labelNames,
            buckets: [
                ...new Set(buckets.filter((bucket)=>Number.isFinite(bucket)))
            ].sort((a, b)=>a - b),
            series: new Map()
        } : {
            name,
            type,
            help,
            labelNames,
            series: new Map()
        };
        this.families.set(name, family);
        return family;
    }
    counter(name, help, labelNames = []) {
        return new Counter(this.registerFamily(name, "counter", help, labelNames));
    }
    gauge(name, help, labelNames = []) {
        return new Gauge(this.registerFamily(name, "gauge", help, labelNames));
    }
    histogram(name, help, labelNames = [], buckets = DEFAULT_BUCKETS) {
        return new Histogram(this.registerFamily(name, "histogram", help, labelNames, buckets));
    }
    collect() {
        const blocks = [
            ...this.families.values()
        ].map((family)=>renderFamily(family));
        return blocks.join("\n") + (blocks.length ? "\n" : "");
    }
    reset() {
        for (const family of this.families.values())family.series.clear();
    }
    scrapeHandler() {
        return async (ctx)=>{
            ctx.res.setHeader("Content-Type", this.render.contentType);
            ctx.res.writeHead(200).end(this.render());
        };
    }
}
export function registry() {
    return new MetricsRegistry();
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEXLONG_RE = /^[0-9a-f]{16,}$/i;
const NUM_RE = /^\d+$/;
export function normalizeRoute(ctx, req) {
    const explicit = ctx?.route ?? ctx?.matchedRoute ?? ctx?.routeTemplate;
    if (typeof explicit === "string" && explicit) return explicit;
    const raw = typeof ctx?.path === "string" ? ctx.path : (()=>{
        try {
            return new URL(req?.url ?? ctx?.url?.pathname ?? "/", "http://x/").pathname;
        } catch  {
            return req?.url ?? "/";
        }
    })();
    if (raw === "/" || raw === "") return "/";
    const route = raw.split("/").map((segment)=>{
        if (!segment) return segment;
        if (NUM_RE.test(segment)) return ":id";
        if (UUID_RE.test(segment)) return ":uuid";
        if (HEXLONG_RE.test(segment)) return ":hash";
        return segment;
    }).join("/");
    return route || "/";
}
function responseParts(info, now) {
    if ("req" in info && "res" in info && "startedAt" in info) {
        return {
            req: info.req,
            res: info.res,
            ctx: info,
            status: info.res.statusCode,
            ms: now() - info.startedAt
        };
    }
    const shaped = info;
    const req = shaped.req ?? shaped.ctx?.req;
    const res = shaped.res ?? shaped.ctx?.res;
    if (!req || !res) throw new Error("metrics response info requires req and res");
    const startedAt = typeof shaped.ctx?.startedAt === "number" ? shaped.ctx.startedAt : now();
    return {
        req,
        res,
        ctx: shaped.ctx ?? {},
        status: shaped.status ?? res.statusCode,
        ms: shaped.ms ?? now() - startedAt
    };
}
function nowNanos(now) {
    return BigInt(now()) * 1_000_000n + process.hrtime.bigint() % 1_000_000n;
}
const NOOP_EXPORTER = ()=>{};
export function span({ name, attrs = {}, kind = "INTERNAL", traceId, parentSpanId, exporter = NOOP_EXPORTER, now, generateId } = {}) {
    if (typeof now !== "function") throw new TypeError("span: now (a clock function) is required");
    if (typeof generateId !== "function") throw new TypeError("span: generateId (a random-hex function) is required");
    const tid = traceId ?? generateId(16);
    const sid = generateId(8);
    const startTime = nowNanos(now);
    const attributes = {
        ...attrs
    };
    let status = {
        code: "UNSET"
    };
    let ended = false;
    return {
        spanId: sid,
        traceId: tid,
        setAttribute (key, value) {
            attributes[key] = value;
        },
        setStatus (next) {
            status = typeof next === "string" ? {
                code: next
            } : next;
        },
        end (endAttrs) {
            if (ended) return null;
            ended = true;
            if (endAttrs) Object.assign(attributes, endAttrs);
            const endTime = nowNanos(now);
            const out = {
                name: name ?? "span",
                traceId: tid,
                spanId: sid,
                ...parentSpanId !== undefined ? {
                    parentSpanId
                } : {},
                kind,
                startTimeUnixNano: String(startTime),
                endTimeUnixNano: String(endTime),
                durationNanos: String(endTime - startTime),
                attributes,
                status
            };
            exporter(out);
            return out;
        }
    };
}
export function metrics(options = {}) {
    if (typeof options.now !== "function") throw new TypeError("metrics: options.now (a clock function) is required");
    if (typeof options.generateId !== "function") throw new TypeError("metrics: options.generateId (a random-hex function) is required");
    const reg = options.registry ?? registry();
    const total = reg.counter("http_requests_total", "Total HTTP requests.", [
        "method",
        "route",
        "status"
    ]);
    const duration = reg.histogram("http_request_duration_seconds", "HTTP request duration.", [
        "method",
        "route"
    ], options.buckets);
    const inFlight = reg.gauge("http_requests_in_flight", "In-flight HTTP requests.");
    inFlight.set({}, 0);
    const middleware = (ctx)=>{
        if (ctx.url?.pathname === "/metrics") return;
        let settled = false;
        inFlight.inc();
        const settle = ()=>{
            if (settled) return;
            settled = true;
            inFlight.dec();
        };
        ctx.res.on("finish", settle);
        ctx.res.on("close", settle);
    };
    function onResponse(info) {
        const { req, ctx, status, ms } = responseParts(info, options.now);
        const method = req.method ?? "GET";
        const route = normalizeRoute(ctx, req);
        total.inc({
            method,
            route,
            status: String(status)
        });
        duration.observe({
            method,
            route
        }, ms / 1000);
    }
    return {
        registry: reg,
        middleware,
        onResponse,
        resource: {
            match: "/metrics",
            methods: [
                "GET"
            ],
            produces: [
                reg.render.contentType
            ],
            handler: reg.scrapeHandler()
        },
        span (spanOptions = {}) {
            const merged = {
                now: options.now,
                generateId: options.generateId,
                ...spanOptions
            };
            if (!merged.exporter && options.exporter) merged.exporter = options.exporter;
            return span(merged);
        }
    };
}
export function requestMetrics(opts) {
    const surface = metrics({
        registry: opts.registry,
        now: opts.now,
        generateId: opts.generateId
    });
    return (ctx)=>{
        void surface.middleware(ctx);
        ctx.res.on("finish", ()=>{
            const extra = opts.labelFn?.(ctx) ?? {};
            const route = extra.route === undefined || extra.route === null ? ctx.url.pathname : String(extra.route);
            surface.onResponse({
                ctx: {
                    ...ctx,
                    route
                },
                req: ctx.req,
                res: ctx.res
            });
        });
    };
}
