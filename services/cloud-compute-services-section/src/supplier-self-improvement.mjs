// The supplier is an amnesiac actuator.  It selects and purchases proposals,
// but it never reads, stages, tests, locks, or writes a supplier territory.
// Those are the one JS Mark's host effects, after an independently purchased
// admission judgment accepts this manifest.
import { cloudComputeTermId } from "./semantic-content.mjs";
import { validateConsiderationPolicy, RESOLUTION_CREDIT_UNIT } from "@red-cup-engineering/inference-work-lot-service/consideration";
import { ACTOR } from "./improvement-board-forager.mjs";

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;
const CLOSED = new Set(["SupplierSelfImprovementSettlement", "SupplierSelfImprovementAttemptResidue", "SupplierSelfImprovementPatchManifest"]);
const rmnId = (value) => cloudComputeTermId(value, "cloud-compute.supplier-self-improvement-record");
const record = (body) => Object.freeze({ id: rmnId(body), ...body });
const exact = (value) => value?.id === rmnId(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id")));
const strings = (value, minimum = 0) => Array.isArray(value) && value.length >= minimum && new Set(value).size === value.length && value.every((item) => typeof item === "string" && item);

function executionPolicyProblem(policy) {
  if (policy?.type !== "SupplierSelfImprovementExecutionPolicy" || policy.enabled !== true || policy.customer !== ACTOR || policy.spendAuthorized !== true || policy.refusalDisposition !== "terminal") return "exact-supplier-self-improvement-execution-policy-required";
  if (policy.capacityInvestmentDisposition !== "typed-residue-until-distinct-capacity-oracle" || !policy.recipes || Array.isArray(policy.recipes)) return "supplier-self-improvement-recipe-policy-invalid";
  try { validateConsiderationPolicy(policy.acceptanceConsiderationPolicy); validateConsiderationPolicy(policy.implementationConsiderationPolicy); }
  catch { return "supplier-self-improvement-consideration-policy-invalid"; }
  return null;
}

function publicationProblem(publication) {
  const lot = publication?.object;
  if (!exact(publication) || publication.type !== "Offer" || publication.actor !== ACTOR || !exact(lot) || lot.type !== "SupplierSelfImprovementWorkLot" || lot.customer !== ACTOR || lot.providerNeutral !== true || lot.deliveryMode !== "proposal-only") return "exact-supplier-self-improvement-publication-required";
  if (!strings(lot.requestedCapabilities, 1) || !["capability", "capacity"].includes(lot.investmentClass) || !exact(lot.acceptanceOracle) || lot.acceptanceOracle.governedBy !== ACTOR || !strings(lot.acceptanceOracle.assertions, 1) || !Number.isSafeInteger(lot.maximumProposalConsideration?.amount) || lot.maximumProposalConsideration.amount < 1 || lot.maximumProposalConsideration.unit !== RESOLUTION_CREDIT_UNIT) return "supplier-self-improvement-authority-invalid";
  const terms = lot.terms;
  if (terms?.spendAuthorized !== false || terms?.customerMutationAuthorized !== false || terms?.capacityChangeAuthorized !== false || terms?.capabilityClaimAuthorized !== false || terms?.providerPreselected !== false || terms?.strongerModelAuthorized !== false || terms?.refinement !== "model-to-smaller-model-to-script" || terms?.behavioralAssayRequired !== true) return "supplier-self-improvement-authority-invalid";
  return null;
}

function recipeFor(publication, policy) {
  const lot = publication.object;
  if (lot.investmentClass === "capacity") throw new Error(policy.capacityInvestmentDisposition);
  if (lot.requestedCapabilities.length !== 1) throw new Error("one self-improvement mission requires exactly one capability recipe");
  const capability = lot.requestedCapabilities[0], recipe = policy.recipes[capability];
  if (!recipe || recipe.type !== "SupplierCapabilityImplementationRecipe" || recipe.capability !== capability || !strings(recipe.focusPaths, 1) || !strings(recipe.writablePaths, 1) || !strings(recipe.testVectors, 1) || !strings(recipe.given, 1) || typeof recipe.when !== "string" || !strings(recipe.then, 1) || !strings(recipe.constraints, 1)) throw new Error(`no exact supplier-local implementation recipe for ${capability}`);
  if (recipe.writablePaths.some((path) => !recipe.focusPaths.includes(path)) || typeof recipe.objective !== "string" || !recipe.objective || typeof recipe.acceptanceArtifactPath !== "string") throw new Error(`invalid supplier-local implementation recipe for ${capability}`);
  return recipe;
}

function providers(settlement) {
  const rows = settlement?.supplier?.kind === "vector-sharded" ? settlement.supplier.jobs : [settlement?.supplier];
  return [...new Set(rows.flatMap((row) => [row?.provider, row?.endpoint]).filter((value) => typeof value === "string" && value))];
}

function proposed(result) {
  const proposal = result?.outcome?.proposal;
  if (result?.outcome?.verified !== true || proposal?.proposalOnly !== true || proposal.customerMutation !== false || !strings(proposal.authorProviders, 1) || !Array.isArray(proposal.changes) || proposal.changes.length === 0) throw new Error("mission produced no behaviorally accepted proposal-only candidate");
  return proposal;
}

export function pendingSupplierSelfImprovement(rows, { policy }) {
  const problem = executionPolicyProblem(policy); if (problem) throw new Error(problem);
  const candidates = rows.filter((row) => row?.type === "Offer" && row.object?.type === "SupplierSelfImprovementWorkLot" && !publicationProblem(row));
  return candidates.sort((a, b) => String(a.object.openedAt).localeCompare(String(b.object.openedAt)) || a.id.localeCompare(b.id)).find((publication) => !rows.some((row) => CLOSED.has(row?.type) && row.lot === publication.object.id)) ?? null;
}

export function selfImprovementProcurementInput(publication, recipe, policy, territory) {
  const lot = publication.object;
  return Object.freeze({ id: `${lot.id}:protected-acceptance`, objective: recipe.objective, territory, focusPaths: recipe.focusPaths, contextPaths: recipe.focusPaths, artifactPath: recipe.acceptanceArtifactPath, command: `node --test ${recipe.acceptanceArtifactPath}`, constraints: [...lot.acceptanceOracle.assertions, ...recipe.constraints], testVectors: recipe.testVectors.map((id) => ({ id, given: recipe.given, when: recipe.when, then: recipe.then, forbidden: recipe.forbidden })), considerationPolicy: policy.acceptanceConsiderationPolicy });
}

export function selfImprovementMission(publication, recipe, policy, capsuleSettlement, territory) {
  const oracleProviders = providers(capsuleSettlement); if (oracleProviders.length === 0) throw new Error("protected acceptance procurement exposed no supplier provenance");
  return Object.freeze({ id: `${publication.object.id}:implementation`, objective: recipe.objective, taskClass: `supplier-capability-${recipe.capability}`, territory, focusPaths: recipe.focusPaths, readablePaths: recipe.focusPaths, writablePaths: recipe.writablePaths, verifyCommand: "npm test", acceptanceCapsule: capsuleSettlement.capsule, constraints: [...publication.object.acceptanceOracle.assertions, ...recipe.constraints, "Return proposal bytes only. The JS Mark admission boundary is the sole mutation authority."], workType: "software-engineering", requiredCapabilities: ["software-engineering"], oracleProviders, considerationPolicy: policy.implementationConsiderationPolicy, apply: false, requireStrongContext: true });
}

export function supplierSelfImprovementPatchManifest({ publication, contract, recipe, capsule, proposal, oracleSuppliers, territory, sequence, at }) {
  if (!NI.test(contract) || !exact(publication) || !exact(capsule) || !Array.isArray(proposal?.changes) || proposal.changes.length === 0) throw new Error("exact patch-manifest inputs required");
  return record({ type: "SupplierSelfImprovementPatchManifest", supplier: ACTOR, lot: publication.object.id, publication: publication.id, contract, capability: recipe.capability, territory, proposal: exact(proposal) ? proposal : record(proposal), capsule, oracleSuppliers, implementationAuthors: proposal.authorProviders, changes: proposal.changes, admittedAtSequence: sequence, admittedAt: at, disposition: "proposal-awaiting-js-mark-admission", customerMutation: false });
}

export async function executeSupplierSelfImprovement(publication, { contract, policy, territory, root = territory, sequence, at, procure, execute, onProcurementIntent, onMissionIntent, onManifest } = {}) {
  const problem = publicationProblem(publication) ?? executionPolicyProblem(policy); if (problem) throw new Error(problem);
  if (typeof procure !== "function" || typeof execute !== "function") throw new Error("self-improvement requires purchased procurement and mission morphisms");
  const recipe = recipeFor(publication, policy), resolvedTerritory = territory ?? root;
  const procurement = selfImprovementProcurementInput(publication, recipe, policy, resolvedTerritory);
  const procurementIntent = record({ type: "SupplierSelfImprovementProcurementIntent", supplier: ACTOR, lot: publication.object.id, publication: publication.id, contract, request: procurement, requestIdentity: rmnId(procurement), admittedAtSequence: sequence, admittedAt: at, disposition: "proposal-only", customerMutation: false });
  if (typeof onProcurementIntent === "function") await onProcurementIntent(procurementIntent);
  const settlement = await procure(procurement);
  const mission = selfImprovementMission(publication, recipe, policy, settlement, resolvedTerritory);
  const missionIntent = record({ type: "SupplierSelfImprovementMissionIntent", supplier: ACTOR, lot: publication.object.id, publication: publication.id, procurementIntent: procurementIntent.id, request: mission, requestIdentity: rmnId(mission), admittedAtSequence: sequence, admittedAt: at, disposition: "proposal-only", customerMutation: false });
  if (typeof onMissionIntent === "function") await onMissionIntent(missionIntent);
  const proposal = proposed(await execute(mission));
  const capsule = exact(settlement.capsule) ? settlement.capsule : record(settlement.capsule);
  const manifest = supplierSelfImprovementPatchManifest({ publication, contract, recipe, capsule, proposal, oracleSuppliers: providers(settlement), territory: resolvedTerritory, sequence, at });
  if (typeof onManifest === "function") await onManifest(manifest);
  return manifest;
}

export async function settleNextSupplierSelfImprovement({ rows, ledger, contract, policy, territory, root = territory, sequence, at, ...options }) {
  if (!ledger || typeof ledger.read !== "function" || typeof ledger.append !== "function") throw new Error("self-improvement execution requires the owning settlement ledger");
  const publication = pendingSupplierSelfImprovement(ledger.read(), { policy }); if (!publication) return null;
  try {
    return await executeSupplierSelfImprovement(publication, { contract, policy, territory: territory ?? root, sequence, at, ...options, onProcurementIntent: async (value) => ledger.append(value, at), onMissionIntent: async (value) => ledger.append(value, at), onManifest: async (value) => ledger.append(value, at) });
  } catch (error) {
    const residue = record({ type: "SupplierSelfImprovementAttemptResidue", supplier: ACTOR, lot: publication.object.id, publication: publication.id, attemptedAtSequence: sequence, attemptedAt: at, disposition: "terminal", reason: error.message, customerMutation: false });
    await ledger.append(residue, at); return residue;
  }
}
