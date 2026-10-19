import { projectPublicActorPosts } from "@red-cup-engineering/activitypub-services-section/public-posts";
export { PUBLIC } from "@red-cup-engineering/activitypub-services-section/as2";

const actorPattern = /^[a-z0-9][a-z0-9._-]*$/u;
const identity = value => typeof value === "string" ? value : value?.id;

/** Read the original source-owned public outbox; protocol interpretation is upstream. */
export async function readPublicTimeline({ origin, provider, identifiers, limit = 40 } = {}) {
  const base = new URL(origin);
  if (base.href !== base.origin + "/" ||
      (base.protocol !== "https:" &&
       !(base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)))) {
    throw new TypeError("MOOSE needs one canonical HTTPS origin (or loopback HTTP)");
  }
  if (!provider || typeof provider.fetch !== "function" || provider.origin !== base.origin) {
    throw new TypeError("MOOSE reads the original same-origin ActivityPub provider");
  }
  if (!Array.isArray(identifiers) || identifiers.length < 1 || identifiers.length > 100 ||
      identifiers.some(id => typeof id !== "string" || !actorPattern.test(id)) ||
      new Set(identifiers).size !== identifiers.length) {
    throw new TypeError("MOOSE needs distinct source-owned actor identifiers");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError("MOOSE timeline limit must be between 1 and 100");
  }
  const request = async address => {
    const result = await provider.fetch(new Request(address, { headers: { accept: "application/activity+json" } }));
    if (!result.ok) throw new Error("MOOSE original public outbox refused with status " + result.status);
    return result.json();
  };
  const entries = await Promise.all(identifiers.map(async identifier => {
    const outbox = new URL("/actors/" + identifier + "/outbox", base);
    const collection = await request(outbox.href);
    if (collection.type !== "OrderedCollection" || !Number.isSafeInteger(collection.totalItems) ||
        collection.totalItems < 0) throw new TypeError("MOOSE received a malformed public outbox collection");
    let items;
    if (Array.isArray(collection.orderedItems)) {
      items = collection.orderedItems;
    } else if (collection.totalItems === 0) {
      items = [];
    } else {
      const firstId = identity(collection.first);
      if (typeof firstId !== "string") throw new TypeError("MOOSE outbox lacks the original first page");
      const first = new URL(firstId);
      if (first.origin !== base.origin || first.pathname !== outbox.pathname ||
          first.username || first.password || first.hash ||
          first.searchParams.get("page") !== "true" ||
          [...first.searchParams.keys()].some(key => !["page", "cursor"].includes(key))) {
        throw new TypeError("MOOSE refuses a foreign or noncanonical outbox cursor");
      }
      const page = await request(first.href);
      if (page.type !== "OrderedCollectionPage" || !Array.isArray(page.orderedItems)) {
        throw new TypeError("MOOSE received a malformed public outbox page");
      }
      items = page.orderedItems;
    }
    if (items.length > 100) throw new TypeError("MOOSE public outbox exceeds a bounded page");
    const actor = new URL("/actors/" + identifier, base).href;
    return projectPublicActorPosts(items, { actor, origin: base.origin })
      .map(post => Object.freeze({ ...post, identifier }));
  }));
  const unique = new Map();
  for (const post of entries.flat()) unique.set(post.id, post);
  return Object.freeze([...unique.values()]
    // Time is optional. Undated authoring is not assigned a fictional timestamp.
    .sort((a, b) => a.published && b.published
      ? b.published.localeCompare(a.published) || a.id.localeCompare(b.id)
      : a.published ? -1 : b.published ? 1 : 0)
    .slice(0, limit));
}
