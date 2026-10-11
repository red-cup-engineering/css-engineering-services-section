// A declarative web application composed with provider lifetime: the same
// spec composition, bounded body intake, validation and OpenAPI document as
// @red-cup-engineering/computer-web-server/create-application, wrapped in this
// platform's capability lifecycle (createWebPlatform). A caller with no
// `platform` to name should use computer-web-server/create-application
// directly instead; this module exists for the one that does.
import { composeWebApplicationSpec } from "@red-cup-engineering/computer-web-server/create-application";
import { createWebPlatform } from "./index.mjs";

export function createWebApplication(specification) {
  const { platform, ...rest } = specification;
  const { server, openapi } = composeWebApplicationSpec(rest);
  const engine = createWebPlatform({ ...server, ...platform !== undefined ? { platform } : {} });
  return Object.freeze({ ...engine, openapi });
}
