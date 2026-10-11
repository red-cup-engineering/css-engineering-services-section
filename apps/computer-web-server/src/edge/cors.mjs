import { applyCors, corsPreflight } from "@red-cup-engineering/http-services-section/response";
export function cors(options = {}) {
    const { preflight = true, optionsSuccessStatus = 204, ...corsOptions } = options;
    return (ctx)=>{
        if (preflight && ctx.req.method === "OPTIONS" && ctx.req.headers["access-control-request-method"]) {
            corsPreflight(ctx.req, ctx.res, corsOptions, optionsSuccessStatus);
            return true;
        }
        applyCors(ctx.res, ctx.req, corsOptions);
    };
}
