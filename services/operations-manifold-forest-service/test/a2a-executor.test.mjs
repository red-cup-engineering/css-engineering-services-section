import assert from "node:assert/strict";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR } from "../src/forest.mjs";
import { executeA2aMessage, operationBytes, operationFromBytes } from "../src/a2a-executor.mjs";

const exact = (body) => ({ id: semanticId(relationalWitnessJournalDocument(body)), ...body });
test("the Actor returns a provider-bound forest result", async () => {
  const request = exact({
    type: "OperationsManifoldForestOperation", provider: ACTOR,
    manifolds: [{ package: "@test/only", protocol: "stdio", extrema: { domains: [], codomains: [] } }],
  });
  const source = Message.toJSON({ messageId: "00000000-0000-4000-8000-000000000002", contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(request))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const response = operationFromBytes(extractRmnPart(Message.fromJSON(await executeA2aMessage(source, {
    forestOptions: { purchase: async () => { throw new Error("empty manifold must not purchase"); } },
  })).parts).bytes);
  assert.equal(response.provider, ACTOR);
  assert.equal(response.request, request.id);
  assert.equal(response.forest.type, "OperationsManifoldBondForest");
  assert.equal(response.forest.candidateCount, "0");
});
