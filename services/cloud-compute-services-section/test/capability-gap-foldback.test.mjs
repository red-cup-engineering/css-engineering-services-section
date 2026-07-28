import assert from "node:assert/strict";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { ACTOR, CONTEXT, DEFAULT_FORAGER_POLICY } from "../src/improvement-board-forager.mjs";
import { foldCapabilityGap } from "../src/capability-gap-foldback.mjs";

const PUBLIC = "https://www.w3.org/ns/activitystreams#Public", BOARD = "urn:test:customer-board", CONTRACT = `ni:///sha-256;${"A".repeat(43)}`;
const record = (body) => Object.freeze({ id: semanticId(relationalRwilDocument(body)), ...body });
const policy = { type: "SupplierCapabilityGapFoldbackPolicy", enabled: true, investableCapabilities: ["code-review", "repository-analysis"], founderAudience: { settlement: "561-group", office: "founder" }, investmentDecision: "separate-supplier-local-decision", protectedOracleRequired: true };
function gap(requiredCapabilities) {
  const object = record({ type: "ImprovementMarketCapabilityGap", contract: CONTRACT, customer: BOARD, lot: "urn:lot", observedAtSequence: 9, considerationCeiling: { amount: 31, unit: "relative-resolution-milliquanta-v1" }, requiredCapabilities, disposition: "publish-gap-and-keep-lot-open", strongerModelAuthorized: false });
  return record({ "@context": CONTEXT, type: "Create", actor: BOARD, target: PUBLIC, inReplyTo: "urn:pulse", object });
}

test("an unanswered lot inside current capabilities induces capacity investment, not model escalation", () => {
  const signal = foldCapabilityGap(gap(DEFAULT_FORAGER_POLICY.capabilities), { boardActor: BOARD, supplierCapabilities: DEFAULT_FORAGER_POLICY.capabilities, policy, recordedAt: "2026-07-21T21:00:00.000Z" });
  assert.equal(signal.type, "SupplierCapacityInvestmentOpportunity"); assert.equal(signal.automaticCapacityIncreaseAuthorized, false); assert.equal(signal.strongerModelAuthorized, false);
});

test("an adjacent missing capability induces a supplier-local investment decision", () => {
  const signal = foldCapabilityGap(gap(["software-engineering", "repository-analysis"]), { boardActor: BOARD, supplierCapabilities: DEFAULT_FORAGER_POLICY.capabilities, policy, recordedAt: "2026-07-21T21:00:00.000Z" });
  assert.equal(signal.type, "SupplierCapabilityInvestmentOpportunity"); assert.deepEqual(signal.missingCapabilities, ["repository-analysis"]); assert.equal(signal.automaticImplementationAuthorized, false);
});

test("a non-adjacent capability becomes only a founder-facing market lead", () => {
  const signal = foldCapabilityGap(gap(["semiconductor-fabrication"]), { boardActor: BOARD, supplierCapabilities: DEFAULT_FORAGER_POLICY.capabilities, policy, recordedAt: "2026-07-21T21:00:00.000Z" });
  assert.equal(signal.type, "FounderEnterpriseFormationMarketLead"); assert.equal(signal.enterpriseFormed, false); assert.equal(signal.customerCreatedSupplier, false); assert.equal(signal.founderDecisionRequired, true);
});

test("foreign, non-public, or identity-changed gaps are typed refusals", () => {
  const source = gap(["code-review"]);
  for (const changed of [{ ...source, actor: "urn:foreign" }, { ...source, target: ACTOR }, { ...source, object: { ...source.object, strongerModelAuthorized: true } }]) {
    const signal = foldCapabilityGap(changed, { boardActor: BOARD, supplierCapabilities: DEFAULT_FORAGER_POLICY.capabilities, policy, recordedAt: "2026-07-21T21:00:00.000Z" });
    assert.equal(signal.type, "SupplierCapabilityGapFoldbackRefusal");
  }
});
