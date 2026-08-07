import { ACTIVITYSTREAMS_PUBLIC, extractRmnActivity } from "./rmn-activity.mjs";

function one(value) { return Array.isArray(value) ? value : [value]; }
function exactActivityId(value) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError("ActivityPub activity identity must be an absolute URL"); }
  if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") throw new TypeError("ActivityPub activity identity must use HTTPS outside loopback development");
  return url.href;
}
async function jsonFrom(url, fetcher) {
  const response = await fetcher(url, { headers: { accept: "application/activity+json" } });
  if (!response?.ok) throw new Error(`ActivityPub outbox read failed with HTTP ${response?.status ?? "unknown"}`);
  return response.json();
}

/**
 * Read one finite standard ActivityPub outbox and return only canonical RMN
 * projections that are public or addressed to the exact customer actor URL.
 * Private activities for other customers are invisible, not malformed input.
 */
export async function listAddressedRmnOutbox({ outboxUrl, expectedActor, expectedAgentCard, recipient, fetcher = fetch }) {
  if (![outboxUrl, expectedActor, expectedAgentCard, recipient].every((value) => typeof value === "string" && value.length > 0)) throw new TypeError("RMN outbox observation requires exact outbox, actor, Agent Card, and recipient URLs");
  const root = await jsonFrom(outboxUrl, fetcher), projections = [];
  let page = root.type === "OrderedCollection" && !Array.isArray(root.orderedItems) ? root.first : root;
  const observedPages = new Set();
  while (page) {
    const pageIdentity = typeof page === "string"
      ? new URL(page).href
      : page?.id ?? (page === root ? new URL(outboxUrl).href : null);
    if (typeof pageIdentity !== "string" || pageIdentity === "") throw new Error("ActivityPub outbox page lacks a stable identity");
    if (observedPages.has(pageIdentity)) throw new Error(`ActivityPub outbox pagination cycle repeats ${pageIdentity}`);
    observedPages.add(pageIdentity);
    const value = typeof page === "string" ? await jsonFrom(page, fetcher) : page;
    if (!["OrderedCollection", "OrderedCollectionPage"].includes(value?.type) || !Array.isArray(value.orderedItems)) throw new Error("ActivityPub outbox returned no ordered collection page or embedded ordered items");
    for (const envelope of value.orderedItems) {
      const recipients = one(envelope?.to), publicAddressed = recipients.some((value) => [ACTIVITYSTREAMS_PUBLIC, "as:Public"].includes(value));
      if (!publicAddressed && !recipients.includes(recipient)) continue;
      const activityId = exactActivityId(envelope?.id);
      const projection = extractRmnActivity(envelope, { expectedActor, expectedRecipient: publicAddressed ? ACTIVITYSTREAMS_PUBLIC : recipient, expectedAgentCard });
      projections.push(Object.freeze({ activityId, ...projection }));
    }
    page = value.next;
  }
  return Object.freeze(projections);
}
