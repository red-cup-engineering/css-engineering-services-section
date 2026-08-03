import { createFederation, importJwk, MemoryKvStore } from "@fedify/fedify";
import { Activity, Endpoints, PropertyValue, Service } from "@fedify/vocab";

export const ACTIVITYPUB_MEDIA_TYPE = "application/activity+json";
export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams";

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function requiredFunction(value, label) {
  if (typeof value !== "function") throw new TypeError(`${label} must be a function`);
  return value;
}

function identityAttachments(cell, controller) {
  if (cell === undefined && controller === undefined) return [];
  if (typeof cell !== "string" || !/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u.test(cell)) {
    throw new TypeError("ActivityPub cell identity must be one canonical SHA-256 ni URI");
  }
  if (typeof controller !== "string" || !/^did:pkh:eip155:\d+:0x[0-9a-fA-F]{40}$/u.test(controller)) {
    throw new TypeError("ActivityPub cell controller must be one did:pkh EVM account");
  }
  return [
    new PropertyValue({ name: "Capability Cell", value: cell }),
    new PropertyValue({ name: "Controller", value: controller }),
  ];
}

export async function importActorKeyPairs(material) {
  if (!Array.isArray(material) || material.length < 2) {
    throw new TypeError("ActivityPub actor keys must contain RSA and Ed25519 key pairs");
  }
  const pairs = [];
  for (const [index, pair] of material.entries()) {
    if (pair === null || typeof pair !== "object" || pair.privateKey === undefined || pair.publicKey === undefined) {
      throw new TypeError(`ActivityPub actor key pair ${index} must contain publicKey and privateKey JWKs`);
    }
    pairs.push(Object.freeze({
      privateKey: await importJwk(pair.privateKey, "private"),
      publicKey: await importJwk(pair.publicKey, "public"),
    }));
  }
  const algorithms = new Set(pairs.map((pair) => pair.privateKey.algorithm.name));
  if (!algorithms.has("RSASSA-PKCS1-v1_5") || !algorithms.has("Ed25519")) {
    throw new TypeError("ActivityPub actor keys must include RSASSA-PKCS1-v1_5 and Ed25519");
  }
  return Object.freeze(pairs);
}

/**
 * Construct one customer-scoped ActivityPub federation service. Fedify owns
 * protocol parsing, content negotiation, discovery, signatures, proofs,
 * idempotency, and delivery. The customer owns its actor metadata, keys,
 * accepted activity callback, and outbox view.
 */
export function createActivityPubProvider(options) {
  if (options === null || typeof options !== "object") throw new TypeError("ActivityPub provider options are required");
  const identifier = requiredText(options.identifier, "ActivityPub actor identifier");
  const actorName = requiredText(options.actorName, "ActivityPub actor name");
  const summary = requiredText(options.summary, "ActivityPub actor summary");
  const keyPairs = options.keyPairs;
  if (!Array.isArray(keyPairs) || keyPairs.length < 2) {
    throw new TypeError("ActivityPub provider requires imported RSA and Ed25519 key pairs");
  }
  const onActivity = requiredFunction(options.onActivity, "ActivityPub onActivity");
  const listOutbox = requiredFunction(options.listOutbox, "ActivityPub listOutbox");
  const authorizeInbox = requiredFunction(options.authorizeInbox, "ActivityPub authorizeInbox");
  const inboxIndex = options.inboxIndex;
  if (inboxIndex !== undefined && (!inboxIndex || typeof inboxIndex.list !== "function")) {
    throw new TypeError("ActivityPub inboxIndex must expose bounded list");
  }
  const attachments = identityAttachments(options.cell, options.controller);
  const federation = createFederation({
    kv: options.kv ?? new MemoryKvStore(),
    ...(options.origin === undefined ? {} : { origin: options.origin }),
    ...(options.queue === undefined ? {} : { queue: options.queue }),
    ...(options.allowPrivateAddress === undefined ? {} : { allowPrivateAddress: options.allowPrivateAddress }),
  });

  federation
    .setActorDispatcher("/actors/{identifier}", async (ctx, requestedIdentifier) => {
      if (requestedIdentifier !== identifier) return null;
      const dispatchedKeys = await ctx.getActorKeyPairs(identifier);
      return new Service({
        id: ctx.getActorUri(identifier),
        preferredUsername: identifier,
        name: actorName,
        summary,
        attachments,
        inbox: ctx.getInboxUri(identifier),
        outbox: ctx.getOutboxUri(identifier),
        endpoints: new Endpoints({ sharedInbox: ctx.getInboxUri() }),
        publicKey: dispatchedKeys[0]?.cryptographicKey,
        assertionMethods: dispatchedKeys.map((pair) => pair.multikey),
      });
    })
    .setKeyPairsDispatcher((_contextData, requestedIdentifier) =>
      requestedIdentifier === identifier ? keyPairs : []);

  federation
    .setInboxListeners("/actors/{identifier}/inbox", "/inbox")
    .withIdempotency("per-inbox")
    .on(Activity, async (ctx, activity) => {
      await onActivity(Object.freeze({
        recipient: ctx.recipient,
        activity,
        jsonLd: await activity.toJsonLd({ format: "compact" }),
      }));
    });

  federation.setOutboxDispatcher(
    "/actors/{identifier}/outbox",
    async (_ctx, requestedIdentifier, cursor) => {
      if (requestedIdentifier !== identifier) return null;
      const result = await listOutbox(Object.freeze({ identifier, cursor }));
      if (result === null || typeof result !== "object" || !Array.isArray(result.items)) {
        throw new TypeError("ActivityPub listOutbox must return { items, nextCursor? }");
      }
      return result;
    },
  );

  federation.setNodeInfoDispatcher("/nodeinfo/2.1", () => ({
    software: {
      name: "activitypub-services-section",
      version: { major: 1, minor: 0, patch: 0 },
    },
    protocols: ["activitypub"],
    services: { inbound: [], outbound: [] },
    openRegistrations: false,
    usage: {
      users: { total: 1, activeHalfyear: 1, activeMonth: 1 },
      localPosts: options.localPosts ?? 0,
      localComments: options.localComments ?? 0,
    },
    metadata: {
      semanticRepresentation: "typed RMN",
      protocolOwner: "@red-cup-engineering/activitypub-services-section",
    },
  }));

  async function fetch(request) {
    const url = new URL(request.url);
    const actorInboxPath = `/actors/${identifier}/inbox`;
    if (request.method === "GET" && url.pathname === actorInboxPath) {
      const canonicalOrigin = new URL(options.origin ?? url.origin);
      const authorized = await authorizeInbox(Object.freeze({ identifier, request }));
      if (authorized !== true) {
        return new Response(JSON.stringify({
          "@context": ACTIVITYSTREAMS_CONTEXT,
          type: "Reject",
          object: { type: "ActivityPubInboxRefusal", code: "authorization-required" },
        }), {
          status: 401,
          headers: {
            "content-type": ACTIVITYPUB_MEDIA_TYPE,
            "www-authenticate": `Bearer realm="${canonicalOrigin.origin}${actorInboxPath}"`,
            "cache-control": "private, no-store",
            vary: "Authorization, Accept",
          },
        });
      }
      // Custody retains verified arrivals; it is not a history authority.  An
      // inbox collection exists only when the customer explicitly injects a
      // bounded index capable of serving it.
      if (inboxIndex === undefined) return new Response(null, { status: 404, headers: { "cache-control": "private, no-store", vary: "Authorization, Accept" } });
      const page = url.searchParams.get("page") === "true";
      const cursor = url.searchParams.get("cursor") ?? undefined;
      const listed = await inboxIndex.list(Object.freeze({ identifier, cursor, limit: 100 }));
      if (listed === null || typeof listed !== "object" || !Array.isArray(listed.items)
          || !Number.isSafeInteger(listed.totalItems) || listed.totalItems < 0
          || (listed.nextCursor !== undefined && (typeof listed.nextCursor !== "string" || listed.nextCursor === ""))) {
        throw new TypeError("ActivityPub listInbox must return { items, totalItems, nextCursor? }");
      }
      const inbox = new URL(actorInboxPath, canonicalOrigin);
      const first = new URL(inbox);
      first.searchParams.set("page", "true");
      const body = page
        ? {
            "@context": ACTIVITYSTREAMS_CONTEXT,
            id: (() => {
              const id = new URL(inbox);
              id.search = url.search;
              return id.href;
            })(),
            type: "OrderedCollectionPage",
            partOf: inbox.href,
            orderedItems: listed.items,
            ...(listed.nextCursor === undefined ? {} : {
              next: (() => {
                const next = new URL(first);
                next.searchParams.set("cursor", listed.nextCursor);
                return next.href;
              })(),
            }),
          }
        : {
            "@context": ACTIVITYSTREAMS_CONTEXT,
            id: inbox.href,
            type: "OrderedCollection",
            totalItems: listed.totalItems,
            first: first.href,
          };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          "content-type": ACTIVITYPUB_MEDIA_TYPE,
          "cache-control": "private, no-store",
          vary: "Authorization, Accept",
        },
      });
    }
    return federation.fetch(request, { contextData: undefined });
  }

  return Object.freeze({
    origin: options.origin,
    identifier,
    federation,
    fetch,
  });
}

/**
 * Deliver one already-authored ActivityStreams activity through the customer's
 * ActivityPub face.  The provider supplies protocol signatures and transport;
 * it cannot author or reinterpret the customer's activity.
 */
export async function deliverActivity(provider, input) {
  if (provider === null || typeof provider !== "object") throw new TypeError("ActivityPub provider is required");
  if (input === null || typeof input !== "object") throw new TypeError("ActivityPub delivery input is required");
  const inbox = new URL(requiredText(input.inbox, "ActivityPub recipient inbox"));
  const recipient = new URL(requiredText(input.recipient, "ActivityPub recipient actor"));
  if (inbox.protocol !== "https:" && inbox.hostname !== "127.0.0.1" && inbox.hostname !== "localhost") {
    throw new TypeError("ActivityPub recipient inbox must use HTTPS outside loopback development");
  }
  const activity = await Activity.fromJsonLd(input.activity);
  const expectedActor = new URL(`/actors/${provider.identifier}`, requiredText(provider.origin, "ActivityPub provider origin"));
  if (activity.actorIds.length !== 1 || activity.actorIds[0]?.href !== expectedActor.href) {
    throw new TypeError(`ActivityPub activity actor must equal the contracted actor ${expectedActor.href}`);
  }
  const context = provider.federation.createContext(new URL(provider.origin), undefined);
  await context.sendActivity(
    { identifier: provider.identifier },
    new Service({ id: recipient, inbox }),
    activity,
  );
  return Object.freeze({
    type: "Accept",
    actor: expectedActor.href,
    object: Object.freeze({
      type: "ActivityPubDeliveryReceipt",
      activity: activity.id?.href ?? null,
      recipient: recipient.href,
      inbox: inbox.href,
      delivered: true,
    }),
  });
}
