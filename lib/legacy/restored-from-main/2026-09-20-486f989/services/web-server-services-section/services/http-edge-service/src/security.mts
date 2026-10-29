import type { Middleware, SecurityHeaders } from "@red-cup-engineering/http-server-application-contract-service";
import { applySecurityHeaders } from "@red-cup-engineering/web-server-services-section/http";

export type SecurityHeadersMiddlewareOptions = SecurityHeaders | true;

export function securityHeaders(policy: SecurityHeadersMiddlewareOptions = true): Middleware {
  return (ctx) => {
    applySecurityHeaders(ctx.res, policy);
  };
}

export const helmet = securityHeaders;
