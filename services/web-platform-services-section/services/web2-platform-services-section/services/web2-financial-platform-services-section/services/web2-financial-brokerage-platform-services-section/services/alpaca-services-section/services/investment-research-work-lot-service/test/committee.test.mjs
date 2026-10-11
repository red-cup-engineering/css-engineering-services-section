import assert from "node:assert/strict";
import test from "node:test";
import { createInvestmentResearchCommittee, INVESTMENT_RESEARCH_ROLES } from "../src/committee.mjs";
import {
  INVESTMENT_RESEARCH_CARRIER_ASSERTIONS,
  INVESTMENT_RESEARCH_REQUEST_CARRIER,
  validateInvestmentResearchRequest,
  validateInvestmentResearchResult,
} from "../src/schemas.mjs";

const ni = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const request = {
  contextProduct: ni,
  customerActor: "urn:ame:receiver-assay",
  universe: ["BLK"],
  horizonDays: 20,
  maxTokensPerSeat: 512,
  evidenceReferences: [ni],
  evidenceFacts: [{ id: "fact:ir", metric: "holdoutInformationRatio", value: 0.9 }],
};

test("request/result/refusal schemas have content identities and unfold to addressed assertions", () => {
  assert.equal(validateInvestmentResearchRequest(request).ok, true);
  assert.match(INVESTMENT_RESEARCH_REQUEST_CARRIER.identity.ni, /^ni:\/\/\/sha-256;/u);
  assert.ok(INVESTMENT_RESEARCH_CARRIER_ASSERTIONS.length > 100);
  assert.ok(INVESTMENT_RESEARCH_CARRIER_ASSERTIONS.every(({ e, t }) => e.startsWith("urn:schema:rsc-quiescent:") && t.startsWith("ni:///sha-256;")));
});

test("dispatcher validates each returned candidate and its final result carrier", async () => {
  let seat = 0;
  const committee = createInvestmentResearchCommittee({ contractInference: async (lot) => {
    const role = INVESTMENT_RESEARCH_ROLES[seat];
    const provider = `urn:provider:${seat++}`;
    assert.equal(lot.outputSchema.$id, undefined);
    return { resultNi: `urn:receipt:${seat}`, result: { provider: { actor: provider }, candidate: {
      role: role.id,
      sections: [{ symbol: "BLK", horizonDays: 20, expectedExcessReturn: 0.01, confidence: 0.6, evidenceReferences: [ni], basisFactIds: ["fact:ir"], thesis: role.id }],
      assumptions: ["bounded"], falsifiers: ["loss"], nonClaims: ["not an order"],
    } } };
  } });
  const result = await committee(request);
  assert.equal(result.committeeComplete, true);
  assert.equal(validateInvestmentResearchResult(result).ok, true);
});

test("receiver-facing invalid JSON is refused before dispatch", async () => {
  const committee = createInvestmentResearchCommittee({ contractInference: async () => { throw new Error("must not dispatch"); } });
  await assert.rejects(committee({ ...request, surprise: true }), /investment-research-request-invalid/);
});

test("transport failures become schema-valid explicit refusal carriers", async () => {
  const committee = createInvestmentResearchCommittee({ contractInference: async () => { throw new Error("offline"); } });
  const result = await committee(request);
  assert.equal(result.residues.length, 4);
  assert.equal(result.residues[0].disposition, "transport-refusal");
  assert.equal(validateInvestmentResearchResult(result).ok, true);
});
