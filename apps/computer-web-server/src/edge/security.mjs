import { applySecurityHeaders } from "@red-cup-engineering/http-services-section/response";
export function securityHeaders(policy = true) {
    return (ctx)=>{
        applySecurityHeaders(ctx.res, policy);
    };
}
export const helmet = securityHeaders;
