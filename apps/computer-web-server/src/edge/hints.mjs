export const REL_TOKENS = Object.freeze([
    "preload",
    "preconnect",
    "modulepreload",
    "prefetch",
    "dns-prefetch",
    "prerender"
]);
const EARLY_HINTS_SENT = Symbol.for("@red-cup-engineering/web-server.earlyHintsSent");
function quoteParam(key, value) {
    const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `${key}="${escaped}"`;
}
function linkHref(hint) {
    const value = hint.href ?? hint.url;
    return value == null || value === "" ? undefined : String(value);
}
function hintToLink(hint) {
    const href = linkHref(hint);
    if (!href || hint.rel == null || hint.rel === "") return undefined;
    const parts = [
        `<${href}>`,
        quoteParam("rel", hint.rel)
    ];
    if (hint.as != null) parts.push(quoteParam("as", hint.as));
    if (hint.type != null && hint.type !== "") parts.push(quoteParam("type", hint.type));
    if (hint.crossorigin != null) {
        if (hint.crossorigin === true || hint.crossorigin === "" || hint.crossorigin === "anonymous") {
            parts.push("crossorigin");
        } else {
            parts.push(quoteParam("crossorigin", hint.crossorigin));
        }
    }
    for (const [key, value] of Object.entries(hint)){
        if (key === "href" || key === "url" || key === "rel" || key === "as" || key === "type" || key === "crossorigin") continue;
        if (value == null || value === false) continue;
        if (value === true) parts.push(key);
        else parts.push(quoteParam(key, value));
    }
    return parts.join("; ");
}
function normalizeLinks(hints) {
    if (!Array.isArray(hints)) return [];
    const out = [];
    const seen = new Set();
    for (const hint of hints){
        let link;
        if (typeof hint === "string") {
            link = hint.trim();
        } else if (hint && typeof hint === "object") {
            link = hintToLink(hint);
        }
        if (!link || seen.has(link)) continue;
        seen.add(link);
        out.push(link);
    }
    return out;
}
export function buildLinkHeader(hints) {
    return normalizeLinks(hints).join(", ");
}
function responseLinkHeaders(existing, next) {
    const values = [
        ...typeof existing === "number" ? [
            String(existing)
        ] : typeof existing === "string" ? [
            existing
        ] : Array.isArray(existing) ? existing.map(String) : [],
        ...next
    ];
    return Array.from(new Set(values.filter(Boolean)));
}
function canWriteEarlyHints(res) {
    return Boolean(typeof res.writeEarlyHints === "function" && !res.headersSent && !res.writableEnded && !res.destroyed);
}
async function writeEarlyHints(res, linkValues) {
    if (!canWriteEarlyHints(res)) return;
    await new Promise((resolve)=>{
        let settled = false;
        const done = ()=>{
            if (settled) return;
            settled = true;
            resolve();
        };
        try {
            const writer = res.writeEarlyHints;
            const result = writer.call(res, {
                link: [
                    ...linkValues
                ]
            }, done);
            if (result === undefined) setImmediate(done);
        } catch  {
            done();
        }
    });
}
export function earlyHints(optsOrHints, options = {}) {
    const opts = Array.isArray(optsOrHints) || typeof optsOrHints === "function" ? {
        ...options,
        hints: optsOrHints
    } : optsOrHints;
    const doEarlyHints = opts.earlyHints !== false;
    const doLinkHeader = opts.linkHeader !== false;
    const once = opts.once !== false;
    return async (ctx)=>{
        const { res } = ctx;
        try {
            const rawHints = typeof opts.hints === "function" ? await opts.hints(ctx) : opts.hints;
            const linkValues = normalizeLinks(rawHints);
            if (linkValues.length === 0) return;
            if (doEarlyHints && (!once || !res[EARLY_HINTS_SENT])) {
                if (once) res[EARLY_HINTS_SENT] = true;
                await writeEarlyHints(res, linkValues);
            }
            if (doLinkHeader && !res.headersSent) {
                res.setHeader("Link", responseLinkHeaders(res.getHeader("Link"), linkValues));
            }
        } catch (error) {
            opts.onError?.(error);
        }
    };
}
export function preload(urls, as = "script") {
    return earlyHints({
        hints: urls.map((url)=>({
                url,
                rel: "preload",
                as
            }))
    });
}
