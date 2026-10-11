
/**
 * @packageDocumentation
 *
 * services/http/policy - package-wide HTTP service policy.
 *
 * This module records the current service defaults. It does not install a
 * middleware framework: CORS and security headers remain resource-owned unless
 * a caller supplies them on a representation or Node Response.
 */
import {
  httpServicePolicyContract,

} from "./policy-schema.mjs";
import { supportedCompressionCodings } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-coding";

/** The service-side HTTP policy actually used by the package HTTP bindings. */
export function httpServicePolicy() {
  return httpServicePolicyContract.assert(Object.freeze({
    kind: "metroplat.services.http.policy",
    service: "services/http",
    compression: Object.freeze({
      requestDecode: true,
      responseEncode: "not-applied-globally",
      codings: Object.freeze([...supportedCompressionCodings()]),
    }),
    cors: Object.freeze({
      mode: "resource-owned",
      headers: Object.freeze(["access-control-allow-origin", "access-control-allow-methods", "access-control-allow-headers"]),
    }),
    securityHeaders: Object.freeze({
      mode: "resource-owned",
      headers: Object.freeze(["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy"]),
    }),
    obligations: Object.freeze([
      "Request Content-Encoding is decoded before body projection when callers enable decoding.",
      "No package-wide response compression is applied by services/http/server.",
      "CORS headers are not installed globally; resource handlers must set them when exposing cross-origin routes.",
      "Security headers are not installed globally; resource handlers must set them when serving browser-facing routes.",
    ]),
    evidence: Object.freeze([
      "services/http/body-read.mts",
      "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-coding",
      "services/http/server.mts",
      "services/http/sse.mts",
      "src/integrations/http/schema.mts",
    ]),
  }), "HTTP service policy");
}
