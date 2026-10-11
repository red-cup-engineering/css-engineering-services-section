import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { inCidr } from "@red-cup-engineering/http-services-section/address";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
function clientIp(req, trustProxy) {
    if (trustProxy) {
        const fwd = req.headers["x-forwarded-for"];
        if (fwd) return String(fwd).split(",")[0].trim();
    }
    return req.socket?.remoteAddress ?? "127.0.0.1";
}
export function ipFilter(opts) {
    const store = new TellingLog();
    const trust = opts.trustProxy !== false;
    const status = opts.statusCode ?? 403;
    const message = opts.message ?? "Forbidden";
    const allowCidrs = opts.allow ?? [];
    const denyCidrs = opts.deny ?? [];
    for (const cidr of allowCidrs){
        tellSides(store, {
            subject: cidr,
            predicate: "ip-rule",
            object: "allow"
        }, [
            true,
            false
        ]);
    }
    for (const cidr of denyCidrs){
        tellSides(store, {
            subject: cidr,
            predicate: "ip-rule",
            object: "deny"
        }, [
            false,
            true
        ]);
    }
    return async (ctx)=>{
        const ip = clientIp(ctx.req, trust);
        const denied = denyCidrs.some((cidr)=>inCidr(ip, cidr));
        const allowed = allowCidrs.length > 0 ? allowCidrs.some((cidr)=>inCidr(ip, cidr)) : !denied;
        const reading = readingOfSides("knowledge", allowed, denied || !allowed);
        if (reading === "potential") return;
        await opts.onDeny?.(ctx, ip);
        ctx.res.writeHead(status).end(message);
        return true;
    };
}
export function localhostOnly() {
    return ipFilter({
        allow: [
            "127.0.0.0/8",
            "::1/128"
        ],
        trustProxy: false
    });
}
export function denyList(cidrs) {
    return ipFilter({
        deny: cidrs
    });
}
