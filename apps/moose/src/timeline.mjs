/**
 * The public Semioverse timeline is a live projection of the SAME Fedify
 * outboxes that hold signed ActivityStreams publication. No second post store.
 * Only locally authored, explicitly Public Create{Note,Article} is rendered.
 */
export const PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

const actorPattern = /^[a-z0-9][a-z0-9._-]*$/u;
const values = value => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
const identity = value => typeof value === "string" ? value : value?.id;
const hasPublicAudience = value => [...values(value?.to), ...values(value?.cc)]
  .some(recipient => identity(recipient) === PUBLIC);

function localPost(item, identifier, origin) {
  if (item?.type !== "Create" || !item.object || typeof item.object !== "object") return null;
  const object = item.object;
  if (object.type !== "Note" && object.type !== "Article") return null;
  const actor = new URL("/actors/" + identifier, origin).href;
  if (identity(item.actor) !== actor || identity(object.attributedTo) !== actor) return null;
  if (!hasPublicAudience(item) && !hasPublicAudience(object)) return null;
  if (typeof object.id !== "string" || typeof object.content !== "string") return null;
  let id;
  try { id = new URL(object.id); } catch { return null; }
  if (id.origin !== origin || !id.pathname.startsWith("/actors/" + identifier + "/posts/")
      || id.search || id.hash || id.username || id.password) return null;
  const postId = id.pathname.slice(("/actors/" + identifier + "/posts/").length);
  if (!postId || postId.includes("/")) return null;
  const published = object.published ?? item.published;
  const instant = typeof published === "string" ? Date.parse(published) : NaN;
  if (!Number.isFinite(instant)) return null;
  return Object.freeze({
    id: id.href, identifier, actor, published: new Date(instant).toISOString(),
    content: object.content, summary: typeof object.summary === "string" ? object.summary : "",
    inReplyTo: identity(object.inReplyTo) ?? null,
  });
}

/** Read only same-origin public actor outboxes. A broken upstream read fails closed. */
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
    if (collection.totalItems === 0) return [];
    if (typeof collection.first !== "string") throw new TypeError("MOOSE outbox lacks the original first page");
    const first = new URL(collection.first);
    if (first.origin !== base.origin || first.pathname !== outbox.pathname || first.username || first.password ||
        first.hash || first.searchParams.get("page") !== "true") {
      throw new TypeError("MOOSE refuses a foreign or noncanonical outbox cursor");
    }
    const page = await request(first.href);
    if (page.type !== "OrderedCollectionPage" || !Array.isArray(page.orderedItems) ||
        page.orderedItems.length > 100) {
      throw new TypeError("MOOSE received a malformed public outbox page");
    }
    return page.orderedItems.map(item => localPost(item, identifier, base.origin)).filter(Boolean);
  }));
  const unique = new Map();
  for (const post of entries.flat()) unique.set(post.id, post);
  return Object.freeze([...unique.values()]
    .sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id))
    .slice(0, limit));
}
