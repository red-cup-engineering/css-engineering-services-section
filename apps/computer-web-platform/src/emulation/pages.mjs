import { createReadStream, readFileSync } from "node:fs";
import { stat, readFile } from "node:fs/promises";
import { join, extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_TYPES, staticFiles } from "@red-cup-engineering/computer-web-server/static";
import { httpDate } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/date";
import { fileSystemRouteManifest } from "./fs-router.mjs";
export async function loadPages(opts) {
    const exts = opts.extensions ?? [
        "ts",
        "js",
        "mjs"
    ];
    const manifest = await fileSystemRouteManifest({
        dir: opts.dir,
        extensions: exts,
        ...opts.prefix === undefined ? {} : {
            prefix: opts.prefix
        }
    });
    const resources = [];
    for (const route of manifest){
        try {
            const mod = await import(pathToFileURL(resolve(route.file)).href);
            const handler = mod.handler ?? mod.default;
            if (!handler) continue;
            const resource = {
                match: route.pattern,
                handler
            };
            if (mod.methods) resource.methods = mod.methods;
            resources.push(resource);
        } catch  {}
    }
    return resources;
}
export async function pagesApp(opts) {
    const resources = await loadPages(opts);
    return {
        resources
    };
}
export function devPages(opts) {
    return async (ctx)=>{
        const resources = await loadPages(opts);
        ctx.app.resources = resources;
    };
}
function parseRedirectLine(line) {
    const trimmed = line.replace(/(^|\s)#.*$/, "$1").trim();
    if (!trimmed) return null;
    const [from, to, rawStatus] = trimmed.split(/\s+/);
    if (!from || !to) return null;
    let status = 301;
    let force = false;
    if (rawStatus) {
        const token = rawStatus.endsWith("!") ? rawStatus.slice(0, -1) : rawStatus;
        force = rawStatus.endsWith("!");
        const parsed = parseInt(token, 10);
        if (Number.isFinite(parsed)) status = parsed;
    }
    return {
        from,
        to,
        status,
        force
    };
}
function compileFrom(from) {
    const names = [];
    const pattern = from.startsWith("/") ? from : `/${from}`;
    let source = "^";
    for(let i = 0; i < pattern.length;){
        const ch = pattern[i];
        if (ch === "*") {
            names.push("splat");
            source += "(.*)";
            i++;
        } else if (ch === ":") {
            let j = i + 1;
            while(j < pattern.length && /[A-Za-z0-9_]/.test(pattern[j]))j++;
            const name = pattern.slice(i + 1, j);
            names.push(name);
            source += name === "splat" ? "(.*)" : "([^/]+)";
            i = j;
        } else {
            source += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            i++;
        }
    }
    source += "/?$";
    const rx = new RegExp(source);
    return (path)=>{
        const match = rx.exec(path);
        if (!match) return null;
        const params = {};
        names.forEach((name, index)=>{
            params[name] = match[index + 1] ?? "";
        });
        return params;
    };
}
function expandTarget(to, params) {
    let out = to.replace(/:([A-Za-z0-9_]+)/g, (_all, name)=>params[name] ?? `:${name}`);
    if (params.splat !== undefined) out = out.replace(/\*/g, params.splat);
    return out;
}
function compileRedirects(text) {
    return text.split(/\r?\n/).map(parseRedirectLine).filter((rule)=>rule !== null).map((rule)=>({
            ...rule,
            test: compileFrom(rule.from)
        }));
}
function compileHeaderPattern(pattern) {
    const normalized = pattern.startsWith("/") ? pattern : `/${pattern}`;
    if (normalized === "/*" || normalized === "*") return ()=>true;
    if (normalized.endsWith("/*")) {
        const prefix = normalized.slice(0, -1);
        const bare = prefix.replace(/\/$/, "");
        return (path)=>path === bare || path.startsWith(prefix);
    }
    const bare = normalized.replace(/\/$/, "");
    return (path)=>path === normalized || path.replace(/\/$/, "") === bare;
}
function compileHeaders(text) {
    const blocks = [];
    let current = null;
    for (const raw of text.split(/\r?\n/)){
        if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
        if (!/^\s/.test(raw)) {
            const pattern = raw.trim();
            current = {
                pattern,
                test: compileHeaderPattern(pattern),
                headers: []
            };
            blocks.push(current);
            continue;
        }
        const index = raw.indexOf(":");
        if (!current || index <= 0) continue;
        const name = raw.slice(0, index).trim();
        const value = raw.slice(index + 1).trim();
        if (name) current.headers.push([
            name,
            value
        ]);
    }
    return blocks;
}
function readSiteFile(dir, name, compile, fallback) {
    const full = join(dir, name);
    if (full !== dir && !full.startsWith(dir + sep)) return fallback;
    try {
        return compile(readFileSync(full, "utf8"));
    } catch  {
        return fallback;
    }
}
function inside(root, full) {
    return full === root || full.startsWith(root + sep);
}
async function resolveCleanRel(root, reqPath) {
    let decoded;
    try {
        decoded = decodeURIComponent(reqPath);
    } catch  {
        return null;
    }
    const rel = decoded.replace(/^\/+/, "");
    const base = resolve(root, rel);
    if (rel !== "" && !inside(root, base)) return null;
    const candidates = [];
    if (rel === "" || reqPath.endsWith("/")) {
        candidates.push(join(base, "index.html"));
    } else {
        candidates.push(base);
        candidates.push(`${base}.html`);
        candidates.push(join(base, "index.html"));
    }
    for (const full of candidates){
        if (!inside(root, full)) continue;
        try {
            const st = await stat(full);
            if (st.isFile()) return full.slice(root.length + 1).split(sep).join("/");
        } catch  {}
    }
    return null;
}
function rewriteUrl(ctx, rel) {
    const search = ctx.url.search;
    ctx.req.url = `/${rel}${search}`;
    ctx.url = new URL(ctx.req.url, ctx.url);
}
function fileEtag(size, mtimeMs) {
    return `"${size.toString(36)}-${mtimeMs.toString(36)}"`;
}
async function writeFileResponse(ctx, root, rel, opts, status = 200) {
    const full = resolve(root, rel);
    if (!inside(root, full)) return false;
    let st;
    try {
        st = await stat(full);
    } catch  {
        return false;
    }
    if (!st.isFile()) return false;
    const type = opts.types[extname(full).toLowerCase()] ?? "application/octet-stream";
    const headers = {
        "content-type": type,
        etag: fileEtag(st.size, st.mtimeMs),
        "last-modified": httpDate(st.mtime)
    };
    if (st.size <= opts.maxBuffer) {
        const body = await readFile(full);
        headers["content-length"] = body.length;
        ctx.res.writeHead(status, headers).end(ctx.req.method === "HEAD" ? undefined : body);
        return true;
    }
    headers["content-length"] = st.size;
    headers["accept-ranges"] = "bytes";
    ctx.res.writeHead(status, headers);
    if (ctx.req.method === "HEAD") ctx.res.end();
    else createReadStream(full).pipe(ctx.res);
    return true;
}
async function writeNotFound(ctx, root, opts) {
    if (await writeFileResponse(ctx, root, "404.html", opts, 404)) return;
    ctx.res.writeHead(404, {
        "content-type": "text/plain; charset=utf-8"
    }).end(ctx.req.method === "HEAD" ? undefined : "Not Found");
}
export function pagesSite(options) {
    const root = resolve(options.dir);
    const pageOptions = {
        types: options.types ?? DEFAULT_TYPES,
        maxBuffer: options.maxBuffer ?? 262_144
    };
    const redirects = readSiteFile(root, "_redirects", compileRedirects, []);
    const headerBlocks = readSiteFile(root, "_headers", compileHeaders, []);
    const serveStatic = staticFiles({
        root,
        extensions: [
            "html"
        ],
        maxBuffer: pageOptions.maxBuffer
    });
    const headersMiddleware = (ctx)=>{
        for (const block of headerBlocks){
            if (!block.test(ctx.url.pathname)) continue;
            for (const [name, value] of block.headers){
                if (!ctx.res.headersSent) ctx.res.setHeader(name, value);
            }
        }
    };
    const redirectMiddleware = async (ctx)=>{
        for (const rule of redirects){
            const params = rule.test(ctx.url.pathname);
            if (!params) continue;
            const target = expandTarget(rule.to, params);
            if (rule.status >= 300 && rule.status < 400) {
                const location = target.includes("?") ? target : `${target}${ctx.url.search}`;
                ctx.res.writeHead(rule.status, {
                    location,
                    "content-type": "text/plain; charset=utf-8"
                }).end(ctx.req.method === "HEAD" ? undefined : `Redirecting to ${location}`);
                return true;
            }
            if (rule.status === 404) {
                await writeNotFound(ctx, root, pageOptions);
                return true;
            }
            if (rule.status === 200) {
                const rel = await resolveCleanRel(root, target.split("?")[0] ?? target);
                if (rel) {
                    rewriteUrl(ctx, rel);
                    await serveStatic(ctx);
                    return true;
                }
            }
        }
    };
    const resource = {
        match: ()=>true,
        methods: [
            "GET",
            "HEAD"
        ],
        handler: async (ctx)=>{
            const rel = await resolveCleanRel(root, ctx.url.pathname);
            if (!rel) {
                await writeNotFound(ctx, root, pageOptions);
                return;
            }
            rewriteUrl(ctx, rel);
            await serveStatic(ctx);
        }
    };
    const app = {
        ...options.base ? {
            base: options.base
        } : {},
        middlewares: [
            headersMiddleware,
            redirectMiddleware
        ],
        resources: [
            resource
        ]
    };
    return Object.assign(app, {
        app,
        middlewares: app.middlewares,
        resources: app.resources
    });
}
