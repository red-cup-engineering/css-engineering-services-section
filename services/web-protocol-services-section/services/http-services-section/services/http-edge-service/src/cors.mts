import type { CorsOptions, Middleware } from "@red-cup-engineering/http-server-core-service/types";
import { applyCors, corsPreflight } from "@red-cup-engineering/http-server-core-service/http";

export type CorsMiddlewareOptions = CorsOptions & {
  preflight?: boolean;
  optionsSuccessStatus?: number;
};

export function cors(options: CorsMiddlewareOptions = {}): Middleware {
  const {
    preflight = true,
    optionsSuccessStatus = 204,
    ...corsOptions
  } = options;
  return (ctx) => {
    if (preflight && ctx.req.method === "OPTIONS" && ctx.req.headers["access-control-request-method"]) {
      corsPreflight(ctx.req, ctx.res, corsOptions, optionsSuccessStatus);
      return true;
    }
    applyCors(ctx.res, ctx.req, corsOptions);
  };
}
