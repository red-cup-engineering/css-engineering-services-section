import { createTufteApplication, tuftePage } from "@red-cup-engineering/web-page-tiling-engine/application";
import { startWebServer } from "@red-cup-engineering/computer-web-server/node";

/**
 * Living Web Server: the live TUFTE application platform. Consumers provide
 * authorized source readers, never pre-rendered cached worlds or a competing
 * HTTP router. Calling fetch re-reads the original source for each page.
 *
 * MOOSE is one consumer; unrelated applications can contribute their pages.
 */
function canonicalOrigin(input) {
  const uri = new URL(input);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname);
  if ((uri.protocol !== "https:" && !(loopback && uri.protocol === "http:")) ||
      uri.username || uri.password || uri.pathname !== "/" || uri.search || uri.hash) {
    throw new TypeError("Living Web Server origin must be a canonical HTTPS origin (or loopback HTTP)");
  }
  return uri.origin;
}

const hidden = () => new Response(null, {
  status: 404, headers: { "cache-control": "no-store" },
});

export function createLivingWebServer({
  origin, home, pages = [], authorizePublicRead, document = {},
} = {}) {
  const base = canonicalOrigin(origin);
  if (typeof authorizePublicRead !== "function") {
    throw new TypeError("Living Web Server requires an original source-owned public-read authority");
  }
  if (home !== undefined && typeof home !== "function") throw new TypeError("Living Web home must read source data");
  if (!Array.isArray(pages) || pages.some(page =>
    !page || typeof page !== "object" || typeof page.read !== "function" || page.match === undefined)) {
    throw new TypeError("Living Web pages need original source readers and route declarations");
  }
  const toPage = (read, identity) => async context => {
    // Origin is admitted before any reader or identity check is called.
    if (await authorizePublicRead({ context, resource: identity }) !== true) return hidden();
    const current = await read(context);
    if (current === null || current === undefined) return hidden();
    if (current instanceof Response) return current;
    // TUFTE alone owns HTML, content negotiation, accessibility, and models.
    return tuftePage(current, { enhance: false });
  };
  const declarations = [
    ...(home === undefined ? [] : [{ match: "/", load: toPage(home, "home") }]),
    ...pages.map((page, index) => ({
      match: page.match,
      load: toPage(page.read, page.name ?? `page-${index + 1}`),
    })),
  ];
  const app = createTufteApplication({ pages: declarations, enhance: false, document });
  return Object.freeze({
    origin: base,
    // An unrecognized host must not use a different site's content authority.
    fetch(request) {
      if (new URL(request.url).origin !== base) {
        return new Response(null, { status: 421, headers: { "cache-control": "no-store" } });
      }
      return app.fetch(request);
    },
  });
}

/** Reuse the ONE Node HTTP transport, not a Living-Web-specific listener. */
export async function serveLivingWebServer(application, {
  hostname = "127.0.0.1", port = 8000, trustProxy = false,
} = {}) {
  if (typeof application?.fetch !== "function" || typeof application?.origin !== "string") {
    throw new TypeError("Living Web Server requires an admitted application");
  }
  if (trustProxy && !["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) {
    throw new TypeError("Trusted proxy input requires the original loopback listener");
  }
  return startWebServer(application, { host: hostname, port, trustProxy });
}
