function normalizePrefix(prefix) {
    let p = prefix.trim();
    if (!p.startsWith("/")) p = "/" + p;
    if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
    return p === "/" ? "" : p;
}
function underPrefix(path, prefix) {
    return prefix === "" || path === prefix || path.startsWith(prefix + "/");
}
function stripPrefix(path, prefix) {
    if (prefix === "") return path;
    if (path === prefix) return "/";
    const rest = path.slice(prefix.length);
    return rest.startsWith("/") ? rest : "/" + rest;
}
function matchAddress(match, path, ctx) {
    if (typeof match === "function") {
        const result = match(path, ctx);
        if (!result) return false;
        return typeof result === "object" ? result : {};
    }
    if (match instanceof RegExp) {
        const m = match.exec(path);
        return m ? {
            ...m.groups
        } : false;
    }
    if (!match.includes(":")) return match === path ? {} : false;
    const parts = match.split("/");
    const pathParts = path.split("/");
    if (parts.length !== pathParts.length) return false;
    const params = {};
    for(let i = 0; i < parts.length; i++){
        const p = parts[i] ?? "";
        const pp = pathParts[i] ?? "";
        if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(pp);
        else if (p !== pp) return false;
    }
    return params;
}
function rebaseContext(ctx, prefix) {
    const inner = stripPrefix(ctx.url.pathname, prefix);
    const url = new URL(inner + ctx.url.search + ctx.url.hash, ctx.url.origin);
    return new Proxy(ctx, {
        get (target, key, recv) {
            if (key === "url") return url;
            return Reflect.get(target, key, recv);
        }
    });
}
function mountResource(prefix, resource) {
    return {
        ...resource,
        match: (path, ctx)=>{
            if (!underPrefix(path, prefix)) return false;
            return matchAddress(resource.match, stripPrefix(path, prefix), ctx);
        },
        ...resource.route !== undefined ? {
            route: prefix + resource.route
        } : {},
        handler: (ctx)=>resource.handler(rebaseContext(ctx, prefix)),
        ...resource.middlewares !== undefined ? {
            middlewares: resource.middlewares.map((mw)=>(ctx)=>mw(rebaseContext(ctx, prefix)))
        } : {}
    };
}
export function mountAt(prefix, app) {
    const p = normalizePrefix(prefix);
    const mounted = {
        resources: (app.resources ?? []).map((r)=>mountResource(p, r))
    };
    if (app.middlewares && app.middlewares.length) {
        mounted.middlewares = app.middlewares.map((mw)=>(ctx)=>underPrefix(ctx.url.pathname, p) ? mw(rebaseContext(ctx, p)) : []);
    }
    return mounted;
}
