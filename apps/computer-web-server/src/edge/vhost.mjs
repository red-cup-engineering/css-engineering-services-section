function matches(pattern, host) {
    if (pattern instanceof RegExp) return new RegExp(pattern.source, pattern.flags).test(host);
    const name = pattern.toLowerCase();
    if (name === "*") return true;
    return name.startsWith("*.") ? host === name.slice(2) || host.endsWith(name.slice(1)) : name === host;
}
export function vhost(entries) {
    const hosts = entries.map(({ host, app })=>Object.freeze({
            host: host instanceof RegExp ? new RegExp(host.source, host.flags) : host,
            app
        }));
    return (ctx)=>{
        const matched = hosts.filter(({ host })=>matches(host, ctx.url.hostname.toLowerCase()));
        if (!matched.length) return;
        if (matched.length > 1) return Response.json({
            error: "contradicted vhost"
        }, {
            status: 503
        });
        return matched[0].app.fetch(ctx.request, {
            capabilities: ctx.capabilities,
            ...ctx.remoteAddress !== undefined ? {
                remoteAddress: ctx.remoteAddress
            } : {},
            ...ctx.httpVersion !== undefined ? {
                httpVersion: ctx.httpVersion
            } : {}
        });
    };
}
