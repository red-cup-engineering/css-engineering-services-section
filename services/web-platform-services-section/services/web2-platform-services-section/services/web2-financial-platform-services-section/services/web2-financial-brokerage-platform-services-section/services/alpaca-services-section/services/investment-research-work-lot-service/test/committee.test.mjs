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

test("the frontier seats multiple research disciplines using the existing typed provider", async () => {
  const { INVESTMENT_RESEARCH_FRONTIER_ROLES: roles } = await import("../src/committee.mjs");
  assert.equal(roles.length, 20);
  assert.equal(new Set(roles.map(({ id }) => id)).size, roles.length);
  for (const name of ["news-claim-provenance", "primary-issuer-disclosures", "options-and-volatility", "obsmetrologia-structure", "information-value-and-search"])
    assert.ok(roles.some(({ id }) => id === name), name);
  let index = 0;
  const committee = createInvestmentResearchCommittee({
    roles,
    contractInference: async (lot) => {
      const role = roles[index];
      const provider = "urn:frontier:independent-" + index++;
      assert.equal(JSON.parse(lot.context).role, role.id);
      assert.equal(lot.excludeProviders.length, index - 1);
      assert.ok(lot.objective.includes(role.objective));
      return { resultNi: "urn:receipt:" + index, result: { provider: { actor: provider }, candidate: {
        role: role.id, sections: [{ symbol: "BLK", horizonDays: 20, expectedExcessReturn: 0,
          confidence: 0, evidenceReferences: [ni], basisFactIds: ["fact:ir"], thesis: "research only" }],
        assumptions: ["not calibrated"], falsifiers: ["no source"], nonClaims: ["no orders"] } } };
    },
  });
  const result = await committee(request);
  assert.equal(result.seats.length, roles.length);
  assert.equal(result.committeeComplete, true);
  assert.equal(result.providerDistinct, true);
  assert.equal(result.executionEstablished, false);
  assert.equal(validateInvestmentResearchResult(result).ok, true);
});

test("untrusted or duplicate role rosters are rejected before provider dispatch", () => {
  const dispatch = async () => { throw new Error("must not dispatch"); };
  for (const roles of [[], [{ id: "a", objective: "x" }, { id: "a", objective: "other" }],
    [{ id: "../invalid", objective: "x" }], [{ id: "valid", objective: "" }],
    Array.from({ length: 25 }, (_, i) => ({ id: "seat-" + i, objective: "x" }))])
    assert.throws(() => createInvestmentResearchCommittee({ contractInference: dispatch, roles }));
});
