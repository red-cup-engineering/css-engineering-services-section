// The generic declarative application shape (nested `applications`
// composition, shared bounded body intake) moved down to http-services-section
// (create-application.mjs): TUFTE (the gui server) needs exactly that and
// nothing about OpenAPI or JSON-schema validation, so the generic composer
// lives there now, taking an optional `validate` capability instead of
// hard-wiring this package's own JSON-schema request validation. This file
// keeps composeWebApplicationSpec/createWebApplication's established shape
// (the `{ server, openapi }` pair, still refusing a `platform` specification)
// by layering this package's own OpenAPI document generation and JSON-schema
// request validation over the moved primitive -- both stay specific to the
// web server.
import { createWebServer } from "@red-cup-engineering/http-services-section/web-application";
import { composeWebApplicationSpec as composeGeneric } from "@red-cup-engineering/http-services-section/create-application";
import { requestValidation } from "./validation.mjs";
import { openApiDocument, openApiRoutesFromApp } from "./openapi.mjs";

/** Composes a declarative application specification into the plain server
 * spec createWebServer (or createWebPlatform, for a caller that also needs
 * provider lifetime) expects, plus the OpenAPI document that describes it.
 * `specification.platform` is refused here: name it to
 * @red-cup-engineering/computer-web-platform/application instead. */
export function composeWebApplicationSpec(specification) {
  if (specification.platform !== undefined) throw new TypeError("Use @red-cup-engineering/computer-web-platform/application to compose provider lifetime with a web application");
  const { server, spec } = composeGeneric(specification, { validate: requestValidation });
  return { server, openapi: () => openApiDocument(openApiRoutesFromApp(spec), { title: "Web application", version: "1.0.0" }) };
}

/** The plain (no provider lifetime) web application: compose, validate,
 * bound-and-share one request body, and serve it over createWebServer. */
export function createWebApplication(specification) {
  const { server, openapi } = composeWebApplicationSpec(specification);
  return Object.freeze({ ...createWebServer(server), openapi });
}
