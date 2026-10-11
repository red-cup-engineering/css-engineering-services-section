import { stat } from "node:fs/promises";
import { join, resolve, normalize } from "node:path";
import { send } from "@red-cup-engineering/http-services-section/response";
import { staticFiles } from "../static.mjs";
function safePath(root, path) {
    const clean = normalize(decodeURIComponent(path)).replace(/^(\.\.\/|\/)+/, "");
    const full = resolve(join(root, clean));
    return full.startsWith(resolve(root)) ? full : null;
}
async function fileExists(path) {
    try {
        const s = await stat(path);
        return s.isFile();
    } catch  {
        return false;
    }
}
export function tryFiles(opts) {
    const { root, fallback = "next" } = opts;
    const files = opts.files ?? opts.paths ?? [
        "$uri"
    ];
    const serveStatic = staticFiles({
        root,
        ...opts.staticOpts ?? {}
    });
    return async (ctx)=>{
        const urlPath = ctx.url.pathname;
        for (const candidate of files){
            const path = candidate.replace("$uri", urlPath);
            const fullPath = safePath(root, path);
            if (!fullPath) continue;
            if (!await fileExists(fullPath)) continue;
            const origUrl = ctx.url;
            ctx.url = new URL(path.startsWith("/") ? path : "/" + path, ctx.url.origin);
            ctx.req.url = ctx.url.pathname;
            await serveStatic(ctx);
            ctx.url = origUrl;
            return true;
        }
        if (fallback === "next") return;
        if (fallback === "404") {
            ctx.res.writeHead(404).end("Not Found");
            return true;
        }
        if (typeof fallback === "object") {
            await send(ctx.req, ctx.res, fallback, Date.now());
            return true;
        }
        const fallbackFull = safePath(root, fallback);
        if (fallbackFull && await fileExists(fallbackFull)) {
            ctx.url = new URL(fallback.startsWith("/") ? fallback : "/" + fallback, ctx.url.origin);
            ctx.req.url = ctx.url.pathname;
            await serveStatic(ctx);
            return true;
        }
        ctx.res.writeHead(404).end("Not Found");
        return true;
    };
}
