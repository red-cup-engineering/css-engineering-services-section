import assert from "node:assert/strict";
import test from "node:test";
import { listAddressedRmnOutbox } from "../src/rmn-outbox-client.mjs";
import { ACTIVITYSTREAMS_PUBLIC, projectRmnActivity } from "../src/rmn-activity.mjs";

const bytes = Buffer.from([1, 2, 3]), actor = "https://board.example/actors/board", card = "https://board.example/.well-known/agent-card.json", recipient = "https://supplier.example/actors/supplier";
const envelope = (to) => projectRmnActivity({ type: "Offer", origin: "https://board.example/", identifier: "board", recipient: to, objectBytes: bytes, agentCard: card });
const fetcherFor = (orderedItems) => async () => ({ ok: true, json: async () => ({ type: "OrderedCollection", orderedItems }) });

test("outbox observation admits public and exact-recipient RMN activities only", async () => {
  const publicEnvelope = envelope(ACTIVITYSTREAMS_PUBLIC), privateEnvelope = envelope(recipient);
  const result = await listAddressedRmnOutbox({ outboxUrl: `${actor}/outbox`, expectedActor: actor, expectedAgentCard: card, recipient, fetcher: fetcherFor([publicEnvelope, privateEnvelope, envelope("https://other.example/actors/supplier")]) });
  assert.equal(result.length, 2);
  assert(result.every(({ objectBytes }) => Buffer.from(objectBytes).equals(bytes)));
  assert.deepEqual(result.map(({ activityId }) => activityId), [publicEnvelope.id, privateEnvelope.id]);
});

test("outbox observation refuses an addressed activity without a durable identity", async () => {
  const activity = { ...envelope(ACTIVITYSTREAMS_PUBLIC) };
  delete activity.id;
  await assert.rejects(
    listAddressedRmnOutbox({ outboxUrl: `${actor}/outbox`, expectedActor: actor, expectedAgentCard: card, recipient, fetcher: fetcherFor([activity]) }),
    /activity identity must be an absolute URL/
  );
});
