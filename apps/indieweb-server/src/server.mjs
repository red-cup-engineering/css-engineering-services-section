/**
 * The IndieWeb server: IndieAuth, Micropub, Microsub and Webmention composed around a site. The
 * IndieAuth server checks the bearer tokens Micropub and Microsub receive (unless the profile names
 * another `verifyToken`), and the site's context says which targets are its own for
 * Webmention. Each protocol is its own networking section; this server only composes them.
 *
 * `profile`: `indieAuth` (the IndieAuth server's options: `profileUrl`, `authenticate`, `loginUrl`, a grant `store`), `micropub`, `microsub`
 * and `webmention` (each that section's options), and `verifyToken`.
 */
import { indieAuthApp } from "@red-cup-engineering/indieauth-profile-service";
import { micropubApp } from "@red-cup-engineering/micropub-services-section/resource";
import { microsubResource } from "@red-cup-engineering/microsub-services-section/resource";
import { webmentionReceiverApp } from "@red-cup-engineering/webmention-service/receiver";

function section(value, name) {
  if (value === undefined || value === false) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`IndieWeb ${name} configuration must be an object`);
  return value;
}

/** The HTTP applications of the IndieWeb protocols the profile turns on, for a site's `context`
 *  (whose `ownsTarget(url)` says which Webmention targets are the site's). */
export function indiewebApplications(context = {}, profile = {}) {
  const indieAuth = section(profile.indieAuth, "indieAuth");
  const micropub = section(profile.micropub, "micropub");
  const microsub = section(profile.microsub, "microsub");
  const webmention = section(profile.webmention, "webmention");
  const indieAuthServer = indieAuth ? indieAuthApp(indieAuth) : undefined;
  const verifyToken = profile.verifyToken ?? indieAuthServer?.verifyIndieAuthToken;
  if ((micropub || microsub) && typeof verifyToken !== "function") throw new TypeError("Micropub and Microsub need IndieAuth or a verifyToken");
  const ownsTarget = webmention?.ownsTarget ?? context.ownsTarget;
  if (webmention && typeof ownsTarget !== "function" && webmention.baseUrl === undefined) throw new TypeError("Webmention needs the site's ownsTarget(url) or a baseUrl");
  return Object.freeze([
    ...(indieAuthServer ? [indieAuthServer.app] : []),
    ...(micropub ? [micropubApp({ verifyToken, ...micropub })] : []),
    ...(microsub ? [{ resources: [microsubResource({ verifyToken, ...microsub })] }] : []),
    ...(webmention ? [webmentionReceiverApp({ ...webmention, ...(typeof ownsTarget === "function" ? { ownsTarget } : {}) })] : []),
  ]);
}

/** The IndieWeb server as an application factory a host (VICTOR's runtime, say) calls with its context. */
export function createIndiewebApplicationFactory(profile = {}) {
  return (context) => indiewebApplications(context, profile);
}
