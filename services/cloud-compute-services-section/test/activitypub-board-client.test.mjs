import assert from "node:assert/strict";
import test from "node:test";
import { extractRmnActivity, projectRmnActivity } from "@red-cup-engineering/activitypub-services-section/rmn-activity";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { invokeActivityPubBoardOperation } from "../src/activitypub-board-client.mjs";
import { ACTOR, CONTEXT } from "../src/improvement-board-forager.mjs";

const PUBLIC = "https://www.w3.org/ns/activitystreams#Public", BOARD = "urn:test:board";
const board = { actor: BOARD, listOperation: "list", submitOperation: "submit", activityPubActor: "https://board.example/actors/board", activityPubOutbox: "https://board.example/actors/board/outbox", activityPubInbox: "https://board.example/actors/board/inbox", a2aAgentCard: "https://board.example/.well-known/agent-card.json" };
const sender = { actor: ACTOR, origin: "https://supplier.example/", identifier: "free-compute", agentCard: "https://supplier.example/.well-known/agent-card.json", keyPath: "/not-used-in-injected-delivery" };
const bytes = (value) => semanticBytes(relationalRwilDocument(value));
const value = (encoded) => { const term = decodeSemantic(encoded); return decodeRelationalValue(term[1], term[2]); };
const record = (body) => Object.freeze({ id: semanticId(relationalRwilDocument(body)), ...body });

test("the supplier discovers public offers and addressed awards through a finite ActivityPub outbox", async () => {
  const offer = record({ "@context": CONTEXT, type: "Offer", actor: BOARD, target: PUBLIC, object: record({ type: "Lot" }) });
  const award = record({ "@context": CONTEXT, type: "Accept", actor: BOARD, target: ACTOR, object: record({ type: "ImprovementProposalAward" }) });
  const envelopes = [projectRmnActivity({ type: offer.type, objectBytes: bytes(offer), agentCard: board.a2aAgentCard, origin: "https://board.example/", identifier: "board", recipient: PUBLIC }), projectRmnActivity({ type: award.type, objectBytes: bytes(award), agentCard: board.a2aAgentCard, origin: "https://board.example/", identifier: "board", recipient: "https://supplier.example/actors/free-compute" })];
  const fetcher = async (url) => ({ ok: true, json: async () => url === board.activityPubOutbox ? { type: "OrderedCollection", first: `${url}?page=true` } : { type: "OrderedCollectionPage", orderedItems: envelopes } });
  const result = await invokeActivityPubBoardOperation(board, "list", null, { fetcher, supplierActor: "https://supplier.example/actors/free-compute" });
  assert.deepEqual(result.orderedItems, [offer, award]);
});

test("the supplier discovers a lawful outbox with embedded ordered items", async () => {
  const offer = record({ "@context": CONTEXT, type: "Offer", actor: BOARD, target: PUBLIC, object: record({ type: "Lot" }) });
  const envelope = projectRmnActivity({ type: offer.type, objectBytes: bytes(offer), agentCard: board.a2aAgentCard, origin: "https://board.example/", identifier: "board", recipient: PUBLIC });
  const fetcher = async () => ({ ok: true, json: async () => ({ type: "OrderedCollection", orderedItems: [envelope] }) });
  const result = await invokeActivityPubBoardOperation(board, "list", null, { fetcher, supplierActor: "https://supplier.example/actors/free-compute" });
  assert.deepEqual(result.orderedItems, [offer]);
});

test("a local board transport keeps public pagination on the contracted local route", async () => {
  const localBoard = { ...board, activityPubOutbox: "http://127.0.0.1:8787/actors/board/outbox" };
  const observed = [];
  const fetcher = async (url) => {
    observed.push(url);
    return { ok: true, json: async () => observed.length === 1
      ? { type: "OrderedCollection", first: "https://board.example/actors/board/outbox?cursor=50" }
      : { type: "OrderedCollectionPage", orderedItems: [] } };
  };
  await invokeActivityPubBoardOperation(localBoard, "list", null, { fetcher, supplierActor: "https://supplier.example/actors/free-compute" });
  assert.deepEqual(observed, [
    "http://127.0.0.1:8787/actors/board/outbox",
    "http://127.0.0.1:8787/actors/board/outbox?cursor=50",
  ]);
});

test("the supplier ignores private board activities addressed to another die", async () => {
  const foreign = record({ "@context": CONTEXT, type: "Accept", actor: BOARD, target: "urn:ame:another-supplier", object: record({ type: "ImprovementProposalAward" }) });
  const envelope = projectRmnActivity({ type: foreign.type, objectBytes: bytes(foreign), agentCard: board.a2aAgentCard, origin: "https://board.example/", identifier: "board", recipient: "https://another.example/actors/supplier" });
  const fetcher = async () => ({ ok: true, json: async () => ({ type: "OrderedCollection", orderedItems: [envelope] }) });
  const result = await invokeActivityPubBoardOperation(board, "list", null, { fetcher, supplierActor: "https://supplier.example/actors/free-compute" });
  assert.deepEqual(result.orderedItems, []);
});

test("the supplier rejects stale deterministic identities at ActivityPub ingress", async () => {
  const exact = record({ "@context": CONTEXT, type: "Offer", actor: BOARD, target: PUBLIC, object: record({ type: "Lot" }) });
  const stale = { ...exact, summary: "changed after identity" };
  const envelope = projectRmnActivity({ type: stale.type, objectBytes: bytes(stale), agentCard: board.a2aAgentCard, origin: "https://board.example/", identifier: "board", recipient: PUBLIC });
  const fetcher = async () => ({ ok: true, json: async () => ({ type: "OrderedCollection", orderedItems: [envelope] }) });
  await assert.rejects(invokeActivityPubBoardOperation(board, "list", null, { fetcher, supplierActor: "https://supplier.example/actors/free-compute" }), /non-deterministic identity/u);
});

test("a supplier bid is deterministically wrapped and handed only to the hired signed-delivery provider", async () => {
  const bid = { "@context": CONTEXT, id: "urn:bid", type: "Offer", actor: ACTOR, target: BOARD, object: { type: "ImprovementServiceBid" } };
  const calls = [];
  const receipt = await invokeActivityPubBoardOperation(board, "submit", bid, { sender, deliver: async (envelope, options) => { calls.push({ envelope, options }); return { type: "Accept", object: { type: "ActivityPubDeliveryReceipt" } }; } });
  assert.equal(receipt.type, "Accept"); assert.equal(calls[0].options.inbox, board.activityPubInbox);
  const projection = extractRmnActivity(calls[0].envelope, { expectedActor: "https://supplier.example/actors/free-compute", expectedRecipient: board.activityPubActor, expectedAgentCard: sender.agentCard });
  assert.deepEqual(value(projection.objectBytes), bid);
});
