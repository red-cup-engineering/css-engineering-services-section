/**
 * static-mirror — an HTTP application rendered to static files without a socket: each GET path is
 * answered by invoking the first matching resource's handler (the router's precedence), starting from
 * the home page, sitemap, robots and feeds and following same-site links and sitemap locations, each
 * response written at its clean path (a page as its directory's index.html).
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

function crawlOutputPath(pathname) {
    const trimmed = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, "");
    if (trimmed === "")
        return "index.html";
    const last = trimmed.split("/").pop() ?? "";
    // Anything without a file extension is a rendered page, written as the
    // directory's index.html so the static host serves it at the clean URL.
    return /\.[a-z0-9]+$/i.test(last) ? trimmed : `${trimmed}/index.html`;
}
// Extensions that are content assets or source, never a rendered page route.
// Following them only ever yields a 404, so the crawl skips them — this keeps
// broken relative markdown links (../foo/index.md) and image references in
// post bodies from each costing a wasted render.
const NON_PAGE_EXT = /\.(?:md|markdown|png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|map|pdf|zip|woff2?|ttf|eot|mp[34]|webm|wav)$/i;
function internalPaths(html, pageUrl, baseOrigin) {
    const out = new Set();
    const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
    for (let m = re.exec(html); m; m = re.exec(html)) {
        const raw = (m[1] ?? "").trim();
        if (!raw || raw.startsWith("#") || /^(?:mailto:|tel:|data:|javascript:)/i.test(raw))
            continue;
        let url;
        try {
            url = new URL(raw, pageUrl);
        }
        catch {
            continue;
        }
        // Same-site links only; drop the query (static files have no query space).
        if ((url.protocol === "http:" || url.protocol === "https:") && url.origin === baseOrigin && !NON_PAGE_EXT.test(url.pathname)) {
            out.add(url.pathname);
        }
    }
    return [...out];
}
function sitemapPaths(xml, baseOrigin) {
    const out = new Set();
    const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
    for (let m = re.exec(xml); m; m = re.exec(xml)) {
        try {
            const url = new URL(m[1] ?? "", baseOrigin);
            if (url.origin === baseOrigin)
                out.add(url.pathname);
        }
        catch { /* skip malformed loc */ }
    }
    return [...out];
}
function matchResource(resource, pathname, ctx) {
    const m = resource.match;
    if (typeof m === "string")
        return m === pathname ? {} : null;
    if (m instanceof RegExp) {
        const result = m.exec(pathname);
        return result ? { ...(result.groups ?? {}) } : null;
    }
    const verdict = m(pathname, ctx);
    if (verdict === false || verdict === null || verdict === undefined)
        return null;
    return verdict === true ? {} : { ...verdict };
}
function reprBody(body) {
    if (typeof body === "string")
        return body;
    if (body instanceof Uint8Array)
        return body;
    return body == null ? "" : JSON.stringify(body);
}
// Render a single GET path against the app's resources in array order — the
// authored order encodes precedence (specific routes before catch-alls), the
// same order the router answers in. The first matching resource wins.
async function renderGet(app, pathname, baseUrl) {
    const url = new URL(pathname, baseUrl);
    const base = { url, params: {}, nonce: "", locals: {} };
    for (const resource of app.resources ?? []) {
        if (resource.methods && !resource.methods.includes("GET"))
            continue;
        const params = matchResource(resource, url.pathname, base);
        if (params === null)
            continue;
        const ctx = { ...base, params };
        const result = await resource.handler(ctx);
        if (result == null || typeof result.arrayBuffer === "function")
            return null;
        return result;
    }
    return null;
}
// Mirror an application at a directory: render it in memory, crawl it, and write each response at its
// clean path. `options.baseUrl` names the origin; `entryPaths` adds crawl seeds; `clean` empties the directory first.
export async function mirrorApplication(app, directory, options) {
    if (options.clean)
        rmSync(directory, { recursive: true, force: true });
    const baseOrigin = new URL(options.baseUrl).origin;
    const seeds = ["/", "/sitemap.xml", "/robots.txt", "/feed.json", "/feed.atom", "/feed.xml", ...(options.entryPaths ?? [])];
    const queue = [...new Set(seeds)];
    const seen = new Set();
    const written = [];
    let rendered = 0;
    for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
        if (seen.has(path))
            continue;
        seen.add(path);
        const repr = await renderGet(app, path, options.baseUrl);
        if (!repr || (repr.status !== undefined && repr.status >= 400))
            continue;
        rendered += 1;
        const contentType = repr.type ?? "";
        const body = reprBody(repr.body);
        const target = join(directory, crawlOutputPath(new URL(path, options.baseUrl).pathname));
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, body);
        written.push(target);
        const text = typeof body === "string" ? body : "";
        if (contentType.includes("html")) {
            for (const next of internalPaths(text, new URL(path, options.baseUrl).href, baseOrigin)) {
                if (!seen.has(next))
                    queue.push(next);
            }
        }
        else if (contentType.includes("xml") || path.endsWith("sitemap.xml")) {
            for (const next of sitemapPaths(text, baseOrigin)) {
                if (!seen.has(next))
                    queue.push(next);
            }
        }
    }
    return Object.freeze({ directory, written: Object.freeze(written.sort()), rendered });
}
