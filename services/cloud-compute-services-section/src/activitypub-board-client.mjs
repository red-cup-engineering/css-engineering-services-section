import { deliverFromEnvironment } from "@red-cup-engineering/activitypub-services-section/deliver";
import { projectRmnActivity } from "@red-cup-engineering/activitypub-services-section/rmn-activity";
import { listAddressedRmnOutbox } from "@red-cup-engineering/activitypub-services-section/rmn-outbox-client";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { relationalRwilDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR, CONTEXT } from "./improvement-board-forager.mjs";

const PUBLIC = "https://www.w3.org/ns/activitystreams#Public";
function requiredEnvironment(name) { const value = process.env[name]; if (typeof value !== "string" || !value) throw new Error(`${name} is required for ActivityPub board transport`); return value; }

export function activityPubSenderFromEnvironment(overrides = {}) {
  const origin = overrides.origin ?? requiredEnvironment("CLOUD_COMPUTE_ACTIVITYPUB_ORIGIN"), identifier = overrides.identifier ?? requiredEnvironment("CLOUD_COMPUTE_ACTIVITYPUB_IDENTIFIER");
  return Object.freeze({ actor: ACTOR, origin, identifier, agentCard: overrides.agentCard ?? process.env.CLOUD_COMPUTE_A2A_AGENT_CARD ?? requiredEnvironment("IMPROVEMENT_MARKET_SUPPLIER_AGENT_CARD_URL"), keyPath: overrides.keyPath ?? requiredEnvironment("CLOUD_COMPUTE_ACTIVITYPUB_KEYS_PATH"), actorName: overrides.actorName ?? "Cloud Compute Services Supplier", summary: overrides.summary ?? "A sovereign development supplier observing improvement markets." });
}

function activityBytes(activity) { return semanticBytes(relationalRwilDocument(activity)); }
function activityFromBytes(bytes) { const ascribed = decodeSemantic(bytes); if (ascribed?.[0] !== "ascribe" || ascribed.length !== 3) throw new Error("ActivityPub RMN object is not one typed relational document"); return decodeRelationalValue(ascribed[1], ascribed[2]); }
function assertDeterministicIdentities(value, path = "activity") {
  if (Array.isArray(value)) { value.forEach((item, index) => assertDeterministicIdentities(item, `${path}[${index}]`)); return; }
  if (!value || typeof value !== "object") return;
  if (Object.hasOwn(value, "id")) {
    const body = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "id"));
    if (value.id !== semanticId(relationalRwilDocument(body))) throw new Error(`ActivityPub RMN ${path} has a non-deterministic identity`);
  }
  for (const [key, item] of Object.entries(value)) if (key !== "id") assertDeterministicIdentities(item, `${path}.${key}`);
}

export async function listActivityPubBoardOutbox(board, { fetcher = fetch, supplierActor } = {}) {
  if (typeof board?.activityPubActor !== "string" || typeof board.activityPubOutbox !== "string" || typeof board.a2aAgentCard !== "string" || typeof supplierActor !== "string") throw new Error("ActivityPub board policy requires exact actor, outbox, A2A Agent Card, and supplier actor URLs");
  const publicOrigin = new URL(board.activityPubActor).origin;
  const transportOrigin = new URL(board.activityPubOutbox).origin;
  const routedFetcher = (input, init) => {
    const requested = new URL(input);
    const routed = requested.origin === publicOrigin && transportOrigin !== publicOrigin
      ? new URL(`${requested.pathname}${requested.search}`, transportOrigin)
      : requested;
    return fetcher(routed.href, init);
  };
  const projections = await listAddressedRmnOutbox({ outboxUrl: board.activityPubOutbox, expectedActor: board.activityPubActor, expectedAgentCard: board.a2aAgentCard, recipient: supplierActor, fetcher: routedFetcher });
  const items = [];
  for (const projection of projections) {
      const activity = activityFromBytes(projection.objectBytes);
      if (activity?.type !== projection.type || activity?.actor !== board.actor || ![PUBLIC, ACTOR].includes(activity?.target)) throw new Error("ActivityPub projection and RMN activity disagree on type, actor, or target");
      assertDeterministicIdentities(activity);
      items.push(activity);
  }
  return Object.freeze({ "@context": CONTEXT, type: "OrderedCollection", actor: board.actor, totalItems: items.length, orderedItems: items });
}

export async function submitActivityPubBoardActivity(board, activity, { sender, deliver = deliverFromEnvironment } = {}) {
  if (!sender || typeof sender.origin !== "string" || typeof sender.identifier !== "string" || typeof sender.agentCard !== "string" || sender.actor !== ACTOR || typeof board?.activityPubActor !== "string" || typeof board.activityPubInbox !== "string" || activity?.actor !== ACTOR || activity.target !== board.actor) throw new Error("ActivityPub bid delivery requires exact supplier and board treaties");
  const projection = projectRmnActivity({ type: activity.type, origin: sender.origin, identifier: sender.identifier, recipient: board.activityPubActor, objectBytes: activityBytes(activity), agentCard: sender.agentCard });
  return deliver(projection, { ...sender, recipient: board.activityPubActor, inbox: board.activityPubInbox });
}

export async function invokeActivityPubBoardOperation(board, operation, input = null, options = {}) {
  if (operation === board.listOperation && input === null) {
    const supplierActor = options.supplierActor ?? board.supplierActivityPubActor;
    return listActivityPubBoardOutbox(board, { ...options, supplierActor });
  }
  if (operation === board.submitOperation && input) return submitActivityPubBoardActivity(board, input, { ...options, sender: options.sender ?? activityPubSenderFromEnvironment(options.senderOverrides) });
  throw new Error(`operation ${operation} is outside the configured ActivityPub board treaty`);
}
