import assert from "node:assert/strict";
import test from "node:test";
import { extractRmnActivity } from "@red-cup-engineering/activitypub-services-section/rmn-activity";
import { decodeSemantic, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { relationalRwilDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { deliverFounderFormationLead, founderLeadActivity } from "../src/activitypub-founder-client.mjs";
import { ACTOR } from "../src/improvement-board-forager.mjs";

const founder = { actor: "urn:ame:561-group:founder-enterprise-formation-demand-service", activityPubActor: "https://founder.example/actors/formation-demand", activityPubInbox: "https://founder.example/actors/formation-demand/inbox", agentCard: "https://founder.example/a2a/formation-demand" };
const sender = { actor: ACTOR, origin: "https://supplier.example/", identifier: "free-compute", agentCard: "https://supplier.example/a2a/free-compute", keyPath: "/injected" };
const body = { type: "FounderEnterpriseFormationMarketLead", supplier: ACTOR };
const signal = { id: semanticId(relationalRwilDocument(body)), ...body };

test("the supplier projects one exact lead through the founder's ActivityPub treaty", async () => {
  const calls = [];
  const result = await deliverFounderFormationLead(founder, signal, { sender, deliver: async (activity, options) => { calls.push({ activity, options }); return { id: "urn:receipt:founder" }; } });
  assert.equal(result.activity.id, founderLeadActivity(signal, founder).id); assert.equal(calls.length, 1); assert.equal(calls[0].options.inbox, founder.activityPubInbox);
  const projection = extractRmnActivity(calls[0].activity, { expectedActor: "https://supplier.example/actors/free-compute", expectedRecipient: founder.activityPubActor, expectedAgentCard: sender.agentCard });
  const term = decodeSemantic(projection.objectBytes), semantic = decodeRelationalValue(term[1], term[2]);
  assert.equal(semantic.actor, ACTOR); assert.equal(semantic.target, founder.actor); assert.deepEqual(semantic.object, signal);
});

test("the lead client refuses an uncontracted founder face", async () => {
  await assert.rejects(deliverFounderFormationLead({ ...founder, activityPubActor: "http://foreign.example/actor" }, signal, { sender, deliver: assert.fail }), /exact HTTPS actor/u);
});
