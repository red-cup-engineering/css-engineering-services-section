import path from "node:path";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { createLivingWebServer } from "@red-cup-engineering/living-web-server";
import { serveManagedActivityPubSites } from "@red-cup-engineering/activitypub-server/managed-sites";
import { readPublicTimeline } from "./timeline.mjs";

function admittedOrigin(origin) {
  if (typeof origin !== "string") throw new TypeError("MOOSE origin is required");
  const url = new URL(origin);
  if (origin !== url.origin || (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) ||
      url.username || url.password) {
    throw new TypeError("MOOSE requires a canonical HTTPS origin or loopback HTTP");
  }
  return url.origin;
}

function admittedActors(actors) {
  if (!Array.isArray(actors) || actors.length === 0 || actors.length > 100 ||
      actors.some(actor => !actor || typeof actor !== "object" ||
        typeof actor.identifier !== "string" || !/^[a-z0-9][a-z0-9._-]*$/u.test(actor.identifier) ||
        typeof actor.actorName !== "string" || !actor.actorName.trim() ||
        typeof actor.summary !== "string" ||
        (typeof actor.keyPath !== "string" && !Array.isArray(actor.keyPairs))) ||
      new Set(actors.map(actor => actor.identifier)).size !== actors.length) {
    throw new TypeError("MOOSE requires distinct provisioned actors with original signing keys");
  }
  return Object.freeze(actors.map(actor => Object.freeze({ ...actor })));
}

function timelinePage(posts) {
  return Object.freeze({
    title: "MOOSE · Semioverse",
    navigation: [
      { href: "/", label: "Home" },
      { href: "/timeline", label: "Timeline" },
      { href: "/about", label: "Actors" },
    ],
    tiles: Object.freeze(posts.length === 0 ? [{
      id: "empty-timeline", title: "No public posts yet",
      content: "The actors on this server have not published any public posts.",
    }] : posts.map((post, index) => ({
      id: "post-" + (index + 1),
      title: "@" + post.identifier + (post.published ? " · " + post.published : ""),
      content: post.content,
      links: [
        { href: post.id, label: "Original post" },
        { href: post.actor, label: "Actor" },
      ],
    }))),
  });
}

/**
 * MOOSE is a social *application*, not a second ActivityPub implementation.
 *
 * - Protocol identities, signed delivery, Follow/Accept/Undo, keys, durable
 *   inbox/outbox, idempotency and per-actor bearer rights stay with Fedify.
 * - HTML/JSON presentation and HTTP binding stay with Living Web Server and
 *   ActivityPub Server. A public-page read reopens the source outbox every time.
 * - No inbound social activity is promoted to MetroPlat office authority.
 */
export async function createMoose({
  origin, stateDirectory, actors, authorizePublicRead, onSocialActivity,
} = {}) {
  const base = admittedOrigin(origin);
  if (typeof stateDirectory !== "string" || !path.isAbsolute(stateDirectory) ||
      path.resolve(stateDirectory) !== stateDirectory) {
    throw new TypeError("MOOSE needs an original canonical absolute persistent state directory");
  }
  const identities = admittedActors(actors);
  if (typeof authorizePublicRead !== "function" || typeof onSocialActivity !== "function") {
    throw new TypeError("MOOSE needs explicit public-read and signed social-activity policies");
  }
  const local = await createLocalActivityPubProvider({
    origin: base, stateDirectory, actors: identities, onActivity: onSocialActivity,
    manuallyStartQueue: true,
  });
  try {
    // These are the original persistent KV and delivery spool returned by the
    // networking supplier, never another MOOSE-owned sidecar or credential map.
    if (local.provider.origin !== base || local.provider.queueStartup !== "manual" ||
        !local.kv || typeof local.kv.get !== "function" ||
        !local.queue || typeof local.queue.enqueue !== "function" ||
        typeof local.queue.listen !== "function" || local.custodyRoot !== stateDirectory) {
      throw new TypeError("MOOSE requires the current durable ActivityPub provider/host contract");
    }
    const identifiers = identities.map(actor => actor.identifier);
    const readPosts = () => readPublicTimeline({
      origin: base, provider: local.provider, identifiers,
    });
    const website = createLivingWebServer({
      origin: base, authorizePublicRead,
      home: async () => timelinePage(await readPosts()),
      pages: [
        { match: "/timeline", name: "public-timeline",
          read: async () => timelinePage(await readPosts()) },
        { match: "/about", name: "public-actors", read: async () => ({
          title: "MOOSE actors",
          navigation: [
            { href: "/", label: "Home" },
            { href: "/timeline", label: "Timeline" },
            { href: "/about", label: "Actors" },
          ],
          tiles: identities.map(actor => ({
            id: "actor-" + actor.identifier,
            title: "@" + actor.identifier,
            content: actor.actorName + (actor.summary ? " — " + actor.summary : ""),
            links: [{ href: base + "/actors/" + actor.identifier, label: "Federated actor" }],
          })),
        }) },
      ],
    });
    const site = Object.freeze({
      origin: base, provider: local.provider, website,
      kv: local.kv, queue: local.queue,
      custodyRoot: local.custodyRoot, release: local.close,
    });
    return Object.freeze({
      origin: base, site, website, provider: local.provider,
      actorBearerTokenPaths: local.actorBearerTokenPaths,
      close: local.close,
    });
  } catch (error) {
    await local.close();
    throw error;
  }
}

/** The shared listener and original Fedify queue are the ONLY running host. */
export async function serveMoose({
  hostname = "127.0.0.1", port = 8000, trustProxy = false, ...options
} = {}) {
  const moose = await createMoose(options);
  // Managed hosting owns shutdown of both its listener and the supplied
  // durable provider. On startup failure it closes that provider itself.
  const running = await serveManagedActivityPubSites({
    sites: [moose.site], hostname, port, trustProxy,
  });
  return Object.freeze({
    origin: moose.origin, website: moose.website, provider: moose.provider,
    actorBearerTokenPaths: moose.actorBearerTokenPaths,
    server: running.server, close: running.close,
  });
}
