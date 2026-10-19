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

function admittedIdentifiers(identifiers) {
  if (!Array.isArray(identifiers) || identifiers.length === 0 || identifiers.length > 100 ||
      identifiers.some(id => typeof id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/u.test(id)) ||
      new Set(identifiers).size !== identifiers.length) {
    throw new TypeError("MOOSE requires distinct source-owned actor identifiers");
  }
  return Object.freeze([...identifiers]);
}

function admittedActors(actors) {
  if (!Array.isArray(actors) || actors.length === 0 || actors.length > 100 ||
      actors.some(actor => !actor || typeof actor !== "object" ||
        typeof actor.actorName !== "string" || !actor.actorName.trim() ||
        typeof actor.summary !== "string" ||
        (typeof actor.keyPath !== "string" && !Array.isArray(actor.keyPairs)))) {
    throw new TypeError("MOOSE requires provisioned actors with original signing keys");
  }
  admittedIdentifiers(actors.map(actor => actor.identifier));
  return Object.freeze(actors.map(actor => Object.freeze({ ...actor })));
}

const navigation = prefix => Object.freeze([
  { href: prefix, label: "Home" },
  { href: prefix === "/" ? "/timeline" : prefix + "/timeline", label: "Timeline" },
  { href: prefix === "/" ? "/about" : prefix + "/actors", label: "Actors" },
]);

function timelinePage(posts, nav) {
  return Object.freeze({
    title: "MOOSE · Semioverse",
    navigation: nav,
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
 * The reusable MOOSE *application*, consumed by FeltOS with the very same
 * source-owned ActivityPub provider and listener already used by that world.
 *
 * This does not create keys, a second protocol face, a delivery queue or
 * enterprise authority. The standalone MOOSE host below provisions a provider
 * only when there is no FeltOS/world owner for that origin.
 */
export function createMooseSocialApplication({
  origin, provider, identifiers, authorizePublicRead, prefix = "/social",
} = {}) {
  const base = admittedOrigin(origin);
  const names = admittedIdentifiers(identifiers);
  if (!provider || provider.origin !== base || typeof provider.fetch !== "function" ||
      typeof provider.resolveActor !== "function") {
    throw new TypeError("MOOSE requires its original same-origin ActivityPub actor provider");
  }
  if (typeof authorizePublicRead !== "function") {
    throw new TypeError("MOOSE requires its consumer's explicit public-read policy");
  }
  if (prefix !== "/" && !/^\/[a-z][a-z0-9-]*$/u.test(prefix)) {
    throw new TypeError("MOOSE needs an exact public application prefix");
  }
  const nav = navigation(prefix);
  const root = prefix;
  const timeline = prefix === "/" ? "/timeline" : prefix + "/timeline";
  const actors = prefix === "/" ? "/about" : prefix + "/actors";
  const profilePath = identifier =>
    (prefix === "/" ? "/people/" : prefix + "/people/") + identifier;
  const readPosts = () => readPublicTimeline({ origin: base, provider, identifiers: names });
  const readActorPosts = identifier =>
    readPublicTimeline({ origin: base, provider, identifiers: [identifier] });
  const pages = [
    { match: timeline, name: "public-timeline",
      read: async () => timelinePage(await readPosts(), nav) },
    { match: actors, name: "public-actors", read: async () => ({
      title: "MOOSE actors", navigation: nav,
      tiles: (await Promise.all(names.map(identifier => provider.resolveActor(identifier))))
        .filter(actor => actor !== null && actor !== undefined)
        .map(actor => ({
          id: "actor-" + actor.identifier,
          title: "@" + actor.identifier,
          content: actor.actorName + (actor.summary ? " — " + actor.summary : ""),
          links: [
            { href: profilePath(actor.identifier), label: "Public profile" },
            { href: base + "/actors/" + actor.identifier, label: "Federated actor" },
          ],
        })),
    }) },
    // Each profile is an actual exact Living Web route, not an unbounded
    // MOOSE-owned router. An actor removed by the original identity owner
    // is not rendered just because a stale identifier was once configured.
    ...names.map(identifier => ({
      match: profilePath(identifier), name: "public-actor",
      read: async () => {
        const actor = await provider.resolveActor(identifier);
        if (actor === null || actor === undefined) return null;
        const posts = await readActorPosts(identifier);
        return {
          title: "@" + identifier + " · MOOSE",
          navigation: nav,
          tiles: [
            { id: "actor", title: actor.actorName,
              content: actor.summary ?? "",
              links: [{ href: base + "/actors/" + identifier, label: "Federated actor" }] },
            ...timelinePage(posts, nav).tiles,
          ],
        };
      },
    })),
  ];
  const website = createLivingWebServer({
    origin: base, authorizePublicRead,
    ...(prefix === "/" ? { home: async () => timelinePage(await readPosts(), nav) }
                       : { pages: [{ match: root, name: "home", read: async () => timelinePage(await readPosts(), nav) }, ...pages] }),
    ...(prefix === "/" ? { pages } : {}),
  });
  const paths = [
    { id: "moose.home", match: root },
    { id: "moose.timeline", match: timeline },
    { id: "moose.actors", match: actors },
    ...names.map(identifier => ({ id: "moose.actor." + identifier,
      match: profilePath(identifier) })),
  ];
  const resources = Object.freeze(paths.map(resource => Object.freeze({
    ...resource, public: true,
    handler: context => website.fetch(context.request),
  })));
  return Object.freeze({
    origin: base, website, resources, fetch: website.fetch,
  });
}

/** Independent MOOSE node when FeltOS has not supplied a provider. */
export async function createMoose({
  origin, stateDirectory, actors, authorizePublicRead, onSocialActivity,
} = {}) {
  const base = admittedOrigin(origin);
  if (typeof stateDirectory !== "string" || !path.isAbsolute(stateDirectory) ||
      path.resolve(stateDirectory) !== stateDirectory) {
    throw new TypeError("MOOSE needs an original canonical absolute persistent state directory");
  }
  const identities = admittedActors(actors);
  if (typeof onSocialActivity !== "function") {
    throw new TypeError("MOOSE requires an explicit signed social-arrival policy");
  }
  const local = await createLocalActivityPubProvider({
    origin: base, stateDirectory, actors: identities, onActivity: onSocialActivity,
    manuallyStartQueue: true,
  });
  try {
    if (local.provider.origin !== base || local.provider.queueStartup !== "manual" ||
        !local.kv || typeof local.kv.get !== "function" ||
        !local.queue || typeof local.queue.enqueue !== "function" ||
        typeof local.queue.listen !== "function" || local.custodyRoot !== stateDirectory) {
      throw new TypeError("MOOSE requires the current durable ActivityPub provider/host contract");
    }
    const social = createMooseSocialApplication({
      origin: base, provider: local.provider,
      identifiers: identities.map(actor => actor.identifier),
      authorizePublicRead, prefix: "/",
    });
    const site = Object.freeze({
      origin: base, provider: local.provider, website: social.website,
      kv: local.kv, queue: local.queue,
      custodyRoot: local.custodyRoot, release: local.close,
    });
    return Object.freeze({
      origin: base, site, website: social.website, provider: local.provider,
      actorBearerTokenPaths: local.actorBearerTokenPaths,
      close: local.close,
    });
  } catch (error) {
    await local.close();
    throw error;
  }
}

/** Shared HTTP listener and original Fedify queue are the only node host. */
export async function serveMoose({
  hostname = "127.0.0.1", port = 8000, trustProxy = false, ...options
} = {}) {
  const moose = await createMoose(options);
  const running = await serveManagedActivityPubSites({
    sites: [moose.site], hostname, port, trustProxy,
  });
  return Object.freeze({
    origin: moose.origin, website: moose.website, provider: moose.provider,
    actorBearerTokenPaths: moose.actorBearerTokenPaths,
    server: running.server, close: running.close,
  });
}
