import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { resolutionCreditPolicy } from "@harmonious-union/inference-work-lot-service/consideration";
import { ACTOR } from "../src/improvement-board-forager.mjs";
import { applySupplierSelfImprovement, executeSupplierSelfImprovement, pendingSupplierSelfImprovement, settleNextSupplierSelfImprovement } from "../src/supplier-self-improvement.mjs";

const record = (body) => Object.freeze({ id: semanticId(relationalRwilDocument(body)), ...body });
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const memoryLedger = (seed = []) => { const rows = [...seed]; return { rows, read: () => [...rows], append: async (value) => { rows.push(value); return value; } }; };
const predecessor = `ni:///sha-256;${"A".repeat(43)}`;
const recipe = {
  type: "SupplierCapabilityImplementationRecipe", capability: "code-review", objective: "gain code-review without weakening independent review",
  focusPaths: ["src/route.mjs", "test/route.test.mjs"], writablePaths: ["src/route.mjs"], acceptanceArtifactPath: "union-acceptance/code-review.test.mjs",
  testVectors: ["supplier-code-review-capability"], given: ["incumbent lacks code-review"], when: "a code-review lot is evaluated", then: ["it qualifies through protected review"], forbidden: ["author self-review"], constraints: ["proposal only"],
};
const policy = { type: "SupplierSelfImprovementExecutionPolicy", enabled: true, customer: ACTOR, spendAuthorized: true, refusalDisposition: "terminal", acceptanceConsiderationPolicy: resolutionCreditPolicy(8), implementationConsiderationPolicy: resolutionCreditPolicy(23), capacityInvestmentDisposition: "typed-residue-until-distinct-capacity-oracle", recipes: { "code-review": recipe } };

function publication(investmentClass = "capability", maximumAmount = 31) {
  const lot = record({
    type: "SupplierSelfImprovementWorkLot", customer: ACTOR, sourceOpportunity: "urn:opportunity", sourceCustomer: "urn:customer", sourceCustomerLot: "urn:lot",
    investmentClass, requestedCapabilities: ["code-review"], objective: "gain code-review", providerNeutral: true, deliveryMode: "proposal-only", openedAt: "2026-07-21T00:00:00.000Z",
    maximumProposalConsideration: { amount: maximumAmount, unit: "relative-resolution-milliquanta-v1" }, acceptanceOracle: record({ type: "SupplierSelfInvestmentAcceptanceOracle", governedBy: ACTOR, assertions: ["protected"] }),
    terms: { spendAuthorized: false, customerMutationAuthorized: false, capacityChangeAuthorized: false, capabilityClaimAuthorized: false, providerPreselected: false, strongerModelAuthorized: false, refinement: "model-to-smaller-model-to-script", behavioralAssayRequired: true },
  });
  return record({ "@context": "https://www.w3.org/ns/activitystreams", type: "Offer", actor: ACTOR, target: "https://www.w3.org/ns/activitystreams#Public", object: lot, attachment: [], published: lot.openedAt });
}

test("one failed exact capability lot is permanently terminal", () => {
  const offered = publication();
  assert.equal(pendingSupplierSelfImprovement([offered], { tick: 10, policy }), offered);
  const residue = record({ type: "SupplierSelfImprovementAttemptResidue", lot: offered.object.id, attemptedAtTick: 10 });
  assert.equal(pendingSupplierSelfImprovement([offered, residue], { tick: 14, policy }), null);
  assert.equal(pendingSupplierSelfImprovement([offered, residue], { tick: 10_000, policy }), null);
  const settled = record({ type: "SupplierSelfImprovementSettlement", lot: offered.object.id });
  assert.equal(pendingSupplierSelfImprovement([offered, residue, settled], { tick: 20, policy }), null);
});

test("a changed-policy preflight refusal is terminal even when the old lot has a border intent", async () => {
  const offered = publication();
  const rows = [
    offered,
    record({
      type: "SupplierSelfImprovementProcurementIntent",
      supplier: ACTOR,
      lot: offered.object.id,
      publication: offered.id,
      disposition: "prepared-recoverable",
    }),
  ];
  const ledger = memoryLedger(rows);
  const changedPolicy = {
    ...policy,
    acceptanceConsiderationPolicy: resolutionCreditPolicy(20),
    implementationConsiderationPolicy: resolutionCreditPolicy(20),
  };
  const result = await settleNextSupplierSelfImprovement({
    rows,
    ledger,
    activity: { object: { pulseId: `${predecessor}#11` } },
    contract: `ni:///sha-256;${"C".repeat(43)}`,
    policy: changedPolicy,
    root: "/supplier",
    tick: 11,
    at: "2026-07-21T00:11:00.000Z",
    withActuationLock: async (_path, action) => action(),
  });
  assert.equal(result.type, "SupplierSelfImprovementAttemptResidue");
  assert.equal(result.disposition, "terminal");
  assert.equal(result.reason, "supplier-self-improvement-stage-budget-invalid");
  assert.deepEqual(result.borderIntents, []);
});

test("a witnessed selected-provider refusal closes without buying the same attempt again", async () => {
  const offered = publication("capability", 58);
  const recovery = record({
    type: "SupplierSelfImprovementRecoveryResidue",
    supplier: ACTOR,
    lot: offered.object.id,
    publication: offered.id,
    intent: null,
    borderIntents: ["ni:///sha-256;old-procurement-intent"],
    attemptedAtTick: 12,
    attemptedAt: "2026-07-21T00:12:00.000Z",
    disposition: "recovery-required",
    reason: "acceptance supplier returned selected-provider-refused",
  });
  const ledger = memoryLedger([offered, recovery]);
  let procured = false;
  const fundedPolicy = {
    ...policy,
    acceptanceConsiderationPolicy: resolutionCreditPolicy(35),
  };
  const result = await settleNextSupplierSelfImprovement({
    rows: ledger.read(),
    ledger,
    activity: { object: { pulseId: `${predecessor}#13` } },
    contract: `ni:///sha-256;${"C".repeat(43)}`,
    policy: fundedPolicy,
    root: "/supplier",
    tick: 13,
    at: "2026-07-21T00:13:00.000Z",
    procure: async () => { procured = true; },
    withActuationLock: async (_path, action) => action(),
  });
  assert.equal(procured, false);
  assert.equal(result.type, "SupplierSelfImprovementAttemptResidue");
  assert.equal(result.reason, "purchased-attempt-refused");
  assert.equal(result.evidence, recovery.id);
});

test("the actuator retains provider provenance without identity-separation gates", async () => {
  const offered = publication(), calls = {};
  const capsule = { digest: `ni:///sha-256;${"B".repeat(43)}`, command: "node --test union-acceptance/code-review.test.mjs" };
  const settled = await executeSupplierSelfImprovement(offered, {
    activity: { object: { pulseId: `${predecessor}#3` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, policy, root: "/supplier", tick: 3, at: "2026-07-21T00:03:00.000Z",
    procure: async (input) => (calls.procurement = input, { type: "AcceptanceProcurementSettlement", supplier: { provider: "oracle-author" }, capsule }),
    onProcurementIntent: async (intent) => { calls.procurementIntent = intent; },
    execute: async (mission) => (calls.mission = mission, { outcome: { verified: true, proposal: { proposalOnly: true, customerMutation: false, authorProviders: ["implementation-author"], changes: [{ path: "src/route.mjs" }] }, semanticReview: { reviews: [{ accepted: true, provider: "oracle-author" }, { accepted: true, provider: "reviewer-one" }, { accepted: true, provider: "reviewer-two" }] } } }),
    onMissionIntent: async (intent) => { calls.missionIntent = intent; },
    apply: async (input) => (calls.apply = input, { changes: [{ path: "src/route.mjs" }], predecessorSchedule: predecessor, rebound: { registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: { scheduleId: predecessor }, retirementResidue: null } }),
  });
  assert.equal(calls.mission.supplierExclusions, undefined); assert.deepEqual(calls.mission.oracleProviders, ["oracle-author"]); assert.equal(calls.mission.apply, false); assert.equal(calls.mission.semanticReview, undefined);
  assert.equal(calls.mission.considerationPolicy.acceptableAlternatives[0].obligations[0].maximumAmount, 23);
  assert.equal(calls.procurement.considerationPolicy.acceptableAlternatives[0].obligations[0].maximumAmount, 8);
  assert.equal(Object.hasOwn(calls.mission, "maximumConsideration"), false); assert.equal(Object.hasOwn(calls.procurement, "maximumConsideration"), false);
  assert.equal(calls.procurementIntent.requestIdentity, semanticId(relationalRwilDocument(calls.procurement)));
  assert.equal(calls.missionIntent.requestIdentity, semanticId(relationalRwilDocument(calls.mission)));
  assert.deepEqual(settled.oracleSuppliers, ["oracle-author"]); assert.deepEqual(settled.implementationAuthors, ["implementation-author"]); assert.deepEqual(settled.reviewProviders, ["oracle-author", "reviewer-one", "reviewer-two"]);
});

test("a durable mission intent resumes without repurchasing its settled acceptance capsule", async () => {
  const offered = publication(), captured = {};
  const capsule = { id: `${offered.object.id}:protected-acceptance`, digest: `ni:///sha-256;${"B".repeat(43)}`, command: "node --test union-acceptance/code-review.test.mjs" };
  const outcome = { outcome: { verified: true, proposal: { proposalOnly: true, customerMutation: false, authorProviders: ["implementation-author"], changes: [{ path: "src/route.mjs" }] }, semanticReview: { reviews: [{ accepted: true, provider: "oracle-author" }, { accepted: true, provider: "reviewer-one" }, { accepted: true, provider: "reviewer-two" }] } } };
  await executeSupplierSelfImprovement(offered, {
    activity: { object: { pulseId: `${predecessor}#3` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, policy, root: "/supplier", tick: 3, at: "2026-07-21T00:03:00.000Z",
    procure: async () => ({ type: "AcceptanceProcurementSettlement", supplier: { provider: "oracle-author" }, capsule }),
    onProcurementIntent: async (intent) => { captured.procurement = intent; },
    execute: async () => outcome,
    onMissionIntent: async (intent) => { captured.mission = intent; },
    apply: async () => ({ changes: [{ path: "src/route.mjs" }], predecessorSchedule: predecessor, rebound: { registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: { scheduleId: predecessor }, retirementResidue: null } }),
  });
  let purchased = false;
  await executeSupplierSelfImprovement(offered, {
    activity: { object: { pulseId: `${predecessor}#3` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, policy, root: "/supplier", tick: 4, at: "2026-07-21T00:04:00.000Z",
    recoveryProcurementIntent: captured.procurement,
    recoveryMissionIntent: captured.mission,
    procure: async () => { purchased = true; },
    execute: async (request) => {
      assert.deepEqual(request, captured.mission.request);
      return outcome;
    },
    apply: async () => ({ changes: [{ path: "src/route.mjs" }], predecessorSchedule: predecessor, rebound: { registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: { scheduleId: predecessor }, retirementResidue: null } }),
  });
  assert.equal(purchased, false);
});

test("oracle, implementation, and review provider identity overlap does not block behavioral acceptance", async () => {
  const offered = publication(), capsule = { digest: `ni:///sha-256;${"B".repeat(43)}`, command: "node --test union-acceptance/code-review.test.mjs" };
  const settled = await executeSupplierSelfImprovement(offered, {
    activity: { object: { pulseId: `${predecessor}#4` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, policy, root: "/supplier", tick: 4, at: "2026-07-21T00:04:00.000Z",
    procure: async () => ({ type: "AcceptanceProcurementSettlement", supplier: { provider: "oracle-author", endpoint: "https://oracle.example" }, capsule }),
    onProcurementIntent: async () => {},
    execute: async () => ({ outcome: { verified: true, proposal: { proposalOnly: true, customerMutation: false, authorProviders: ["https://oracle.example"], changes: [{ path: "src/route.mjs" }] }, semanticReview: { reviews: [{ accepted: true, provider: "https://oracle.example" }] } } }),
    onMissionIntent: async () => {},
    apply: async () => ({ changes: [{ path: "src/route.mjs" }], predecessorSchedule: predecessor, rebound: { registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: { scheduleId: predecessor }, retirementResidue: null } }),
  });
  assert.deepEqual(settled.oracleSuppliers, ["oracle-author", "https://oracle.example"]);
  assert.deepEqual(settled.implementationAuthors, ["https://oracle.example"]);
  assert.deepEqual(settled.reviewProviders, ["https://oracle.example"]);
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "supplier-self-improvement-test-")); mkdirSync(join(root, "src")); mkdirSync(join(root, "test"));
  writeFileSync(join(root, "src", "route.mjs"), "export const route = 'old';\n"); writeFileSync(join(root, "test", "route.test.mjs"), "// evidence\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({ type: "module", scripts: { test: "node --test" }, dependencies: {} }));
  return root;
}
function change(root) {
  const before = readFileSync(join(root, "src", "route.mjs")), after = Buffer.from("export const route = 'new';\n");
  return { path: "src/route.mjs", beforeExisted: true, beforeDigest: digest(before), afterDigest: digest(after), afterBytesBase64: after.toString("base64") };
}

test("supplier-local apply stages exact bytes, verifies, and rebinds the changed runtime closure", async () => {
  const root = fixture(), seen = [];
  const result = await applySupplierSelfImprovement({ activity: { object: { pulseId: `${predecessor}#7` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, proposal: { changes: [change(root)] }, capsule: { command: "node --test union-acceptance/code-review.test.mjs" }, recipe, root, at: "2026-07-21T00:07:00.000Z" }, {
    validateCapsule: () => true, materializeCapsule: () => [], verify: (territory, command) => ({ passed: readFileSync(join(territory, "src", "route.mjs"), "utf8").includes("new"), output: command }),
    renew: async (request, options) => (seen.push({ request, options }), { registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: { scheduleId: predecessor }, retirementResidue: null }),
  });
  assert.match(readFileSync(join(root, "src", "route.mjs"), "utf8"), /new/u); assert.equal(seen[0].options.predecessorSchedule, predecessor);
  assert.equal(seen[0].request.target.packageRoot, root); assert.equal(result.rebound.registration.scheduleId, `ni:///sha-256;${"D".repeat(43)}`);
});

test("ambiguous renewal preserves bytes while ambiguous procurement remains recoverable", async () => {
  const root = fixture(), offered = publication();
  const applied = () => applySupplierSelfImprovement({ activity: { object: { pulseId: `${predecessor}#8` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, proposal: { changes: [change(root)] }, capsule: { command: "node --test union-acceptance/code-review.test.mjs" }, recipe, root, at: "2026-07-21T00:08:00.000Z" }, {
    validateCapsule: () => true, materializeCapsule: () => [], verify: (territory) => ({ passed: /(?:old|new)/u.test(readFileSync(join(territory, "src", "route.mjs"), "utf8") ) }), renew: async () => { throw new Error("registration unavailable"); },
  });
  await assert.rejects(applied(), /unresolved registered successor preserves applied bytes/u); assert.match(readFileSync(join(root, "src", "route.mjs"), "utf8"), /new/u);
  writeFileSync(join(root, "src", "route.mjs"), "export const route = 'old';\n");
  const ledger = memoryLedger([offered]);
  const requests = [];
  const base = { rows: [offered], ledger, activity: { object: { pulseId: `${predecessor}#8` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, policy, root, tick: 8, at: "2026-07-21T00:08:00.000Z", procure: async (request) => { requests.push(request); throw new Error("provider response unavailable"); } };
  const residue = await settleNextSupplierSelfImprovement(base);
  assert.equal(residue.type, "SupplierSelfImprovementRecoveryResidue"); assert.equal(residue.disposition, "recovery-required"); assert.equal(residue.strongerModelRequested, false);
  assert.equal(ledger.rows.some((row) => row.type === "SupplierSelfImprovementProcurementIntent"), true);
  const replay = await settleNextSupplierSelfImprovement(base); assert.equal(replay.type, "SupplierSelfImprovementRecoveryResidue");
  assert.equal(requests.length, 2); assert.deepEqual(requests[0], requests[1]);
});

test("a partial live write failure restores only bytes that actually crossed the mutation seam", async () => {
  const root = fixture(), secondPath = join(root, "src", "second.mjs"), secondBefore = Buffer.from("export const second = 'old';\n"), secondAfter = Buffer.from("export const second = 'new';\n"); writeFileSync(secondPath, secondBefore);
  const second = { path: "src/second.mjs", beforeExisted: true, beforeDigest: digest(secondBefore), afterDigest: digest(secondAfter), afterBytesBase64: secondAfter.toString("base64") };
  const multiFileRecipe = { ...recipe, writablePaths: ["src/route.mjs", "src/second.mjs"] };
  const applied = () => applySupplierSelfImprovement({ activity: { object: { pulseId: `${predecessor}#9` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, proposal: { changes: [change(root), second] }, capsule: { command: "node --test union-acceptance/code-review.test.mjs" }, recipe: multiFileRecipe, root, at: "2026-07-21T00:09:00.000Z" }, {
    validateCapsule: () => true, materializeCapsule: () => [], verify: (territory) => ({ passed: /(?:old|new)/u.test(readFileSync(join(territory, "src", "route.mjs"), "utf8")) }),
    writeLiveChanges: (changes, written) => { writeFileSync(changes[0].path, changes[0].after); written.push(changes[0]); throw new Error("second live rename failed"); },
  });
  await assert.rejects(applied(), /second live rename failed; supplier bytes restored=true/u);
  assert.equal(readFileSync(join(root, "src", "route.mjs"), "utf8"), "export const route = 'old';\n");
  assert.equal(readFileSync(secondPath, "utf8"), secondBefore.toString("utf8"));
});

test("live target drift after staging is refused without overwriting the concurrent edit", async () => {
  const root = fixture(); let staged = false;
  const applied = () => applySupplierSelfImprovement({ activity: { object: { pulseId: `${predecessor}#9` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, proposal: { changes: [change(root)] }, capsule: { command: "node --test union-acceptance/code-review.test.mjs" }, recipe, root, at: "2026-07-21T00:09:00.000Z" }, {
    validateCapsule: () => true, materializeCapsule: () => [], verify: (territory) => { if (territory !== root && !staged) { staged = true; writeFileSync(join(root, "src", "route.mjs"), "export const route = 'concurrent';\n"); } return { passed: true }; }, renew: assert.fail,
  });
  await assert.rejects(applied(), /supplier live target drifted outside the prepared transition/u);
  assert.equal(readFileSync(join(root, "src", "route.mjs"), "utf8"), "export const route = 'concurrent';\n");
});

test("rollback never overwrites a concurrent edit that followed this actuator's write", async () => {
  const root = fixture();
  const applied = () => applySupplierSelfImprovement({ activity: { object: { pulseId: `${predecessor}#9` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, proposal: { changes: [change(root)] }, capsule: { command: "node --test union-acceptance/code-review.test.mjs" }, recipe, root, at: "2026-07-21T00:09:00.000Z" }, {
    validateCapsule: () => true, materializeCapsule: () => [], verify: () => ({ passed: true }),
    writeLiveChanges: (changes, written) => { writeFileSync(changes[0].path, changes[0].after); written.push(changes[0]); writeFileSync(changes[0].path, "export const route = 'concurrent';\n"); throw new Error("later live write failed"); },
  });
  await assert.rejects(applied(), /supplier bytes restored=false; rollback preserved concurrent supplier edits/u);
  assert.equal(readFileSync(join(root, "src", "route.mjs"), "utf8"), "export const route = 'concurrent';\n");
});

test("live compare, write, verification, schedule transition, and rollback share one OS lock", async () => {
  const root = fixture(), lockPath = join(root, "content", "runtime", "self-improvement.lock"); let exclusionObserved = false;
  const result = await applySupplierSelfImprovement({ activity: { object: { pulseId: `${predecessor}#9` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, proposal: { changes: [change(root)] }, capsule: { command: "node --test union-acceptance/code-review.test.mjs" }, recipe, root, at: "2026-07-21T00:09:00.000Z" }, {
    lockPath, validateCapsule: () => true, materializeCapsule: () => [], verify: () => ({ passed: true }),
    writeLiveChanges: (changes) => { const contender = spawnSync("/usr/bin/flock", ["--exclusive", "--nonblock", "--conflict-exit-code", "75", lockPath, "true"]); exclusionObserved = contender.status === 75; for (const item of changes) writeFileSync(item.path, item.after); },
    renew: async () => ({ registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: { scheduleId: predecessor }, retirementResidue: null }),
  });
  assert.equal(exclusionObserved, true); assert.equal(result.rebound.retirement.scheduleId, predecessor);
});

test("an uncompensated successor preserves the runtime bytes it registered and requires recovery", async () => {
  const root = fixture();
  const applied = () => applySupplierSelfImprovement({ activity: { object: { pulseId: `${predecessor}#9` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, proposal: { changes: [change(root)] }, capsule: { command: "node --test union-acceptance/code-review.test.mjs" }, recipe, root, at: "2026-07-21T00:09:00.000Z" }, {
    validateCapsule: () => true, materializeCapsule: () => [], verify: (territory) => ({ passed: /(?:old|new)/u.test(readFileSync(join(territory, "src", "route.mjs"), "utf8")) }),
    renew: async () => ({ registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: null, retirementResidue: { reason: "predecessor remained active" } }),
  });
  await assert.rejects(applied(), /unresolved registered successor preserves applied bytes/u);
  assert.equal(readFileSync(join(root, "src", "route.mjs"), "utf8"), "export const route = 'new';\n");
});

test("a proven successor compensation permits exact rollback to the predecessor closure", async () => {
  const root = fixture(), successor = `ni:///sha-256;${"D".repeat(43)}`;
  const applied = () => applySupplierSelfImprovement({ activity: { object: { pulseId: `${predecessor}#9` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, proposal: { changes: [change(root)] }, capsule: { command: "node --test union-acceptance/code-review.test.mjs" }, recipe, root, at: "2026-07-21T00:09:00.000Z" }, {
    validateCapsule: () => true, materializeCapsule: () => [], verify: () => ({ passed: true }),
    renew: async () => { const error = new Error("predecessor retirement failed; registered successor was retired"); error.scheduleTransition = { registration: { scheduleId: successor }, retirement: null, successorCompensated: true }; throw error; },
  });
  await assert.rejects(applied(), /supplier bytes restored=true/u);
  assert.equal(readFileSync(join(root, "src", "route.mjs"), "utf8"), "export const route = 'old';\n");
});

test("absent spend authority and a stage budget broader than the public lot refuse before procurement", async () => {
  let procureCalls = 0;
  const options = { activity: { object: { pulseId: `${predecessor}#10` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, root: "/supplier", tick: 10, at: "2026-07-21T00:10:00.000Z", procure: async () => { procureCalls += 1; throw new Error("must not procure"); } };
  await assert.rejects(executeSupplierSelfImprovement(publication(), { ...options, policy: { ...policy, spendAuthorized: false } }), /exact-supplier-self-improvement-execution-policy-required/u);
  await assert.rejects(executeSupplierSelfImprovement(publication("capability", 30), { ...options, policy }), /supplier-self-improvement-stage-budget-invalid/u);
  assert.equal(procureCalls, 0);
});

test("a durable execution intent prevents duplicate mutation when settlement journaling fails", async () => {
  const offered = publication(), journal = [offered], root = fixture(); let mutationCalls = 0, transitionCalls = 0, failedSettlement = false;
  const transitionRequest = record({ "@context": "https://www.w3.org/ns/activitystreams", type: "Update", actor: ACTOR, target: "urn:ame:scheduled-activity-delivery-service", object: { type: "ScheduleTransitionRequest", predecessorSchedule: predecessor, marker: "one-exact-transition" } });
  const ledger = { read: () => [...journal], append: async (value) => { if (value.type === "SupplierSelfImprovementSettlement" && !failedSettlement) { failedSettlement = true; throw new Error("settlement journal unavailable"); } journal.push(value); return value; } };
  const options = {
    rows: [offered], ledger, activity: { object: { pulseId: `${predecessor}#11` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, policy, root, tick: 11, at: "2026-07-21T00:11:00.000Z",
    procure: async () => ({ supplier: { provider: "oracle-author" }, capsule: { digest: `ni:///sha-256;${"B".repeat(43)}` } }),
    execute: async () => ({ outcome: { verified: true, proposal: { proposalOnly: true, customerMutation: false, authorProviders: ["implementation-author"], changes: [{ path: "src/route.mjs" }] }, semanticReview: { reviews: [{ accepted: true, provider: "reviewer-one" }, { accepted: true, provider: "reviewer-two" }] } } }),
    apply: async (_input, applyOptions = {}) => {
      if (!applyOptions.preparedChanges) { await applyOptions.onPrepared([{ path: "src/route.mjs", beforeExisted: true, beforeDigest: "sha256:" + "0".repeat(64), beforeBytesBase64: "", afterDigest: "sha256:" + "1".repeat(64), afterBytesBase64: "" }]); mutationCalls += 1; }
      if (applyOptions.recoveryTransitionRequest) assert.equal(applyOptions.recoveryTransitionRequest.id, transitionRequest.id);
      else await applyOptions.onScheduleTransitionIntent(transitionRequest);
      transitionCalls += 1;
      return { changes: [{ path: "src/route.mjs" }], predecessorSchedule: predecessor, rebound: { registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: { scheduleId: predecessor }, retirementResidue: null, transitionRequest } };
    },
  };
  await assert.rejects(settleNextSupplierSelfImprovement(options), /settlement journal unavailable/u);
  assert.equal(mutationCalls, 1); assert.equal(journal.some((row) => row.type === "SupplierSelfImprovementExecutionIntent"), true); assert.equal(journal.some((row) => row.type === "SupplierSelfImprovementScheduleTransitionIntent"), true);
  const replay = await settleNextSupplierSelfImprovement({ ...options, rows: journal });
  assert.equal(replay.type, "SupplierSelfImprovementSettlement"); assert.equal(mutationCalls, 1); assert.equal(transitionCalls, 2); assert.equal(replay.scheduleTransitionRequest, transitionRequest.id);
});

test("a failed RWIL intent append recovers cached prepared work without repurchasing it", async () => {
  const offered = publication(), journal = [offered], root = fixture(); let intentAppendFails = true, procureCalls = 0, executeCalls = 0, mutationCalls = 0;
  const ledger = { read: () => [...journal], append: async (value) => { if (value.type === "SupplierSelfImprovementExecutionIntent" && intentAppendFails) { intentAppendFails = false; throw new Error("intent projection unavailable"); } journal.push(value); return value; } };
  const apply = async (_input, applyOptions = {}) => {
    if (!applyOptions.preparedChanges) { await applyOptions.onPrepared([{ path: "src/route.mjs", beforeExisted: true, beforeDigest: "sha256:" + "0".repeat(64), beforeBytesBase64: "", afterDigest: "sha256:" + "1".repeat(64), afterBytesBase64: "" }]); mutationCalls += 1; }
    return { changes: [{ path: "src/route.mjs" }], predecessorSchedule: predecessor, rebound: { registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: { scheduleId: predecessor }, retirementResidue: null } };
  };
  const options = { rows: [offered], ledger, activity: { object: { pulseId: `${predecessor}#12` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, policy, root, tick: 12, at: "2026-07-21T00:12:00.000Z",
    procure: async () => { procureCalls += 1; return { supplier: { provider: "oracle-author" }, capsule: { digest: `ni:///sha-256;${"B".repeat(43)}` } }; },
    execute: async () => { executeCalls += 1; return { outcome: { verified: true, proposal: { proposalOnly: true, customerMutation: false, authorProviders: ["implementation-author"], changes: [{ path: "src/./route.mjs" }] }, semanticReview: { reviews: [{ accepted: true, provider: "reviewer-one" }, { accepted: true, provider: "reviewer-two" }] } } }; }, apply };
  const first = await settleNextSupplierSelfImprovement(options);
  assert.equal(first.type, "SupplierSelfImprovementRecoveryResidue"); assert.equal(first.intent !== null, true); assert.equal(mutationCalls, 0);
  const recoveryDirectory = join(root, "data", "recovery", "self-improvement-intents"), recoveryName = `${offered.object.id.slice("ni:///sha-256;".length)}.rmn.cbor`;
  assert.equal(existsSync(join(recoveryDirectory, recoveryName)), true); assert.ok(readFileSync(join(recoveryDirectory, recoveryName)).length > 0); assert.equal(readdirSync(recoveryDirectory).some((name) => name.endsWith(".tmp")), false);
  const second = await settleNextSupplierSelfImprovement(options);
  assert.equal(second.type, "SupplierSelfImprovementSettlement"); assert.equal(procureCalls, 1); assert.equal(executeCalls, 1); assert.equal(mutationCalls, 0);
  const intent = journal.find((row) => row.type === "SupplierSelfImprovementExecutionIntent"); assert.equal(intent.proposal.changes[0].path, "src/route.mjs");
});

test("the settlement lock serializes admission before any external procurement", async () => {
  const offered = publication(), ledger = memoryLedger([offered]), root = fixture(); let procureCalls = 0, releaseProcurement, markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; }), held = new Promise((resolve) => { releaseProcurement = resolve; });
  const options = { rows: [offered], ledger, activity: { object: { pulseId: `${predecessor}#13` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, policy, root, tick: 13, at: "2026-07-21T00:13:00.000Z",
    procure: async () => { procureCalls += 1; markStarted(); await held; return { supplier: { provider: "oracle-author" }, capsule: { digest: `ni:///sha-256;${"B".repeat(43)}` } }; },
    execute: async () => ({ outcome: { verified: true, proposal: { proposalOnly: true, customerMutation: false, authorProviders: ["implementation-author"], changes: [{ path: "src/route.mjs" }] }, semanticReview: { reviews: [{ accepted: true, provider: "reviewer-one" }, { accepted: true, provider: "reviewer-two" }] } } }),
    apply: async (_input, applyOptions) => { await applyOptions.onPrepared([{ path: "src/route.mjs", beforeExisted: true, beforeDigest: "sha256:" + "0".repeat(64), beforeBytesBase64: "", afterDigest: "sha256:" + "1".repeat(64), afterBytesBase64: "" }]); return { changes: [{ path: "src/route.mjs" }], predecessorSchedule: predecessor, rebound: { registration: { scheduleId: `ni:///sha-256;${"D".repeat(43)}` }, retirement: { scheduleId: predecessor }, retirementResidue: null } }; } };
  const first = settleNextSupplierSelfImprovement(options); await started;
  await assert.rejects(settleNextSupplierSelfImprovement(options), /supplier actuation lock is already held/u);
  releaseProcurement(); assert.equal((await first).type, "SupplierSelfImprovementSettlement"); assert.equal(procureCalls, 1);
});

test("capacity investment remains typed residue until a distinct capacity oracle exists", async () => {
  const offered = publication("capacity"), ledger = memoryLedger([offered]), root = fixture();
  const residue = await settleNextSupplierSelfImprovement({ rows: [offered], ledger, activity: { object: { pulseId: `${predecessor}#9` } }, contract: `ni:///sha-256;${"C".repeat(43)}`, policy, root, tick: 9, at: "2026-07-21T00:09:00.000Z" });
  assert.equal(residue.type, "SupplierSelfImprovementAttemptResidue"); assert.equal(residue.reason, policy.capacityInvestmentDisposition);
});
