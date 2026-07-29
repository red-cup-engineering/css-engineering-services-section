import assert from "node:assert/strict";
import test from "node:test";
import { semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { encodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { ACTIVITYSTREAMS_PUBLIC, projectRmnActivity } from "../src/rmn-activity.mjs";
import { admitRmnActivityHistory, readRmnActivityHistory, supportFromRmnActivityHistory } from "../src/rmn-history.mjs";

const origin = "https://source.example/", actor = `${origin}actors/source`, card = `${origin}.well-known/agent-card.json`;
const encoded = encodeRelationalValue({ type: "WorldMove", locus: "village-office", move: "inspect" });
const objectBytes = semanticBytes(["ascribe", encoded.type, encoded.term]);
const project = (type) => projectRmnActivity({ type, origin, identifier: "source", recipient: ACTIVITYSTREAMS_PUBLIC, objectBytes, agentCard: card, eventTime: "2026-07-29T12:00:00.000Z" });
const admit = (type, observedAt) => admitRmnActivityHistory(project(type), { expectedActor: actor, expectedRecipient: ACTIVITYSTREAMS_PUBLIC, expectedAgentCard: card, observedAt });

test("typed ActivityPub(CloudEvent(A2A(RMN))) receipts knowledge-join into FOUR", () => {
  const positive = admit("Offer", "2026-07-29T12:00:01.000Z");
  const negative = admit("Reject", "2026-07-29T12:00:02.000Z");
  assert.equal(positive.receipt.standards.cloudEventsSpecversion, "1.0");
  assert.equal(positive.receipt.standards.a2aRole, "ROLE_AGENT");
  assert.equal(positive.receipt.standards.a2aPartMediaType, "application/rmn+cbor");
  assert.equal(readRmnActivityHistory([positive])[0].support.value, "potential");
  assert.equal(readRmnActivityHistory([negative])[0].support.value, "active");
  const held = readRmnActivityHistory([positive, negative]);
  assert.equal(held.length, 1);
  assert.deepEqual(held[0].support, { positive: true, negative: true, value: "stable" });
  assert.equal(supportFromRmnActivityHistory([], positive.receipt.objectNi).value, "absurd");
});

test("history reads receipts and canonical bytes, never recursively discovered lookalikes", () => {
  const admitted = admit("Create", "2026-07-29T12:00:01.000Z");
  assert.throws(() => readRmnActivityHistory([{ receiptNi: admitted.receiptNi, receiptBytes: admitted.receiptBytes, objectBytes: Buffer.from("not RMN") }]), /canonical RMN identity/u);
  assert.throws(() => readRmnActivityHistory([{ nested: admitted }]), /must name its receipt/u);
});

