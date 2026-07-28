import { createHash } from "node:crypto";
import { closeSync, cpSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { procureSoftwareAcceptanceCapsule } from "@red-cup-engineering/acceptance-capsule-procurement-service/client";
import { materializeAcceptanceCapsule, validateAcceptanceCapsule } from "@red-cup-engineering/protected-acceptance-service/client";
import { executeSoftwareMission } from "@red-cup-engineering/software-mission-execution-service/client";
import { runTestsCommand } from "@red-cup-engineering/sandbox-command-execution-service";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { ACTOR } from "./improvement-board-forager.mjs";
import { withSupplierSettlementLock } from "./supplier-settlement-lock.mjs";
import { validateConsiderationPolicy, RESOLUTION_CREDIT_UNIT } from "@harmonious-union/inference-work-lot-service/consideration";

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const CLOSED = new Set(["SupplierSelfImprovementSettlement", "SupplierSelfImprovementAttemptResidue"]);
function rmnId(value) { return semanticId(relationalRwilDocument(value)); }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
function exact(value) { return value?.id === rmnId(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id"))); }
function sha256(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function strings(value, minimum = 0) { return Array.isArray(value) && value.length >= minimum && new Set(value).size === value.length && value.every((item) => typeof item === "string" && item); }
function inside(root, requested) {
  const path = resolve(root, requested), rel = relative(resolve(root), path);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error(`self-improvement path escapes supplier territory: ${requested}`);
  return { path, relative: rel.split(sep).join("/") };
}

function executionPolicyProblem(policy) {
  if (policy?.type !== "SupplierSelfImprovementExecutionPolicy" || policy.enabled !== true || policy.customer !== ACTOR || policy.spendAuthorized !== true || policy.refusalDisposition !== "terminal") return "exact-supplier-self-improvement-execution-policy-required";
  if (policy.capacityInvestmentDisposition !== "typed-residue-until-distinct-capacity-oracle" || typeof policy.recipes !== "object" || Array.isArray(policy.recipes)) return "supplier-self-improvement-recipe-policy-invalid";
  try {
    validateConsiderationPolicy(policy.acceptanceConsiderationPolicy);
    validateConsiderationPolicy(policy.implementationConsiderationPolicy);
  } catch { return "supplier-self-improvement-consideration-policy-invalid"; }
  return null;
}

function publicationProblem(publication) {
  const lot = publication?.object;
  if (!exact(publication) || publication.type !== "Offer" || publication.actor !== ACTOR || !exact(lot) || lot.type !== "SupplierSelfImprovementWorkLot" || lot.customer !== ACTOR || lot.providerNeutral !== true || lot.deliveryMode !== "proposal-only") return "exact-supplier-self-improvement-publication-required";
  if (!strings(lot.requestedCapabilities, 1) || !["capability", "capacity"].includes(lot.investmentClass) || !exact(lot.acceptanceOracle) || lot.acceptanceOracle.governedBy !== ACTOR || !strings(lot.acceptanceOracle.assertions, 1) || !Number.isSafeInteger(lot.maximumProposalConsideration?.amount) || lot.maximumProposalConsideration.amount < 1 || lot.maximumProposalConsideration.unit !== RESOLUTION_CREDIT_UNIT || lot.terms?.spendAuthorized !== false || lot.terms?.customerMutationAuthorized !== false || lot.terms?.capacityChangeAuthorized !== false || lot.terms?.capabilityClaimAuthorized !== false || lot.terms?.providerPreselected !== false || lot.terms?.strongerModelAuthorized !== false || lot.terms?.refinement !== "model-to-smaller-model-to-script" || lot.terms?.behavioralAssayRequired !== true || Object.hasOwn(lot.terms ?? {}, "currentScheduleRebindingRequiredForRuntimeChange")) return "supplier-self-improvement-authority-invalid";
  return null;
}

export function pendingSupplierSelfImprovement(rows, { policy }) {
  const policyProblem = executionPolicyProblem(policy);
  if (policyProblem) throw new Error(policyProblem);
  const publications = rows.filter((row) => row?.type === "Offer" && row.object?.type === "SupplierSelfImprovementWorkLot" && !publicationProblem(row));
  for (const publication of publications.sort((left, right) => String(left.object.openedAt).localeCompare(String(right.object.openedAt)) || left.id.localeCompare(right.id))) {
    const lot = publication.object;
    if (rows.some((row) => CLOSED.has(row?.type) && row.lot === lot.id)) continue;
    return publication;
  }
  return null;
}

function recipeFor(publication, policy) {
  const lot = publication.object;
  if (lot.investmentClass === "capacity") throw new Error(policy.capacityInvestmentDisposition);
  if (lot.requestedCapabilities.length !== 1) throw new Error("one self-improvement mission requires exactly one capability recipe");
  const capability = lot.requestedCapabilities[0], recipe = policy.recipes[capability];
  if (!recipe || recipe.type !== "SupplierCapabilityImplementationRecipe" || recipe.capability !== capability || !strings(recipe.focusPaths, 1) || !strings(recipe.writablePaths, 1) || !strings(recipe.testVectors, 1) || !strings(recipe.given, 1) || typeof recipe.when !== "string" || !recipe.when || !strings(recipe.then, 1) || !strings(recipe.forbidden) || !strings(recipe.constraints, 1)) throw new Error(`no exact supplier-local implementation recipe for ${capability}`);
  if (recipe.writablePaths.some((path) => !recipe.focusPaths.includes(path)) || typeof recipe.objective !== "string" || !recipe.objective || typeof recipe.acceptanceArtifactPath !== "string" || !recipe.acceptanceArtifactPath.startsWith("union-acceptance/") || !recipe.acceptanceArtifactPath.endsWith(".test.mjs")) throw new Error(`invalid supplier-local implementation recipe for ${capability}`);
  return recipe;
}

function testVectors(recipe) {
  return recipe.testVectors.map((id) => ({
    id,
    given: recipe.given,
    when: recipe.when,
    then: recipe.then,
    forbidden: recipe.forbidden,
  }));
}

function providerIdentities(settlement) {
  const supplier = settlement?.supplier;
  const rows = supplier?.kind === "vector-sharded" ? supplier.jobs : [supplier];
  return [...new Set((rows ?? []).flatMap((row) => [row?.provider, row?.endpoint]).filter((value) => typeof value === "string" && value))];
}

export function selfImprovementProcurementInput(publication, recipe, policy, territory) {
  const lot = publication.object, vectors = testVectors(recipe);
  return Object.freeze({
    id: `${lot.id}:protected-acceptance`, objective: recipe.objective, territory,
    focusPaths: recipe.focusPaths, contextPaths: recipe.focusPaths,
    artifactPath: recipe.acceptanceArtifactPath,
    command: `node --test ${recipe.acceptanceArtifactPath}`,
    constraints: [...lot.acceptanceOracle.assertions, ...recipe.constraints], testVectors: vectors,
    considerationPolicy: policy.acceptanceConsiderationPolicy,
  });
}

export function selfImprovementMission(publication, recipe, policy, capsuleSettlement, territory) {
  const lot = publication.object, oracleProviders = providerIdentities(capsuleSettlement);
  if (oracleProviders.length === 0) throw new Error("protected acceptance procurement exposed no supplier provenance");
  return Object.freeze({
    id: `${lot.id}:implementation`, objective: recipe.objective, taskClass: `supplier-capability-${recipe.capability}`,
    territory, focusPaths: recipe.focusPaths, readablePaths: recipe.focusPaths, writablePaths: recipe.writablePaths,
    verifyCommand: "npm test", acceptanceCapsule: capsuleSettlement.capsule,
    constraints: [...lot.acceptanceOracle.assertions, ...recipe.constraints, "Return proposal bytes only. The FreeCompute supplier-local actuator is the sole mutation authority."],
    workType: "software-engineering", requiredCapabilities: ["software-engineering"], oracleProviders,
    considerationPolicy: policy.implementationConsiderationPolicy, apply: false, requireStrongContext: true,
  });
}

function validateBehaviorallyAssayedProposal(result) {
  const proposal = result?.outcome?.proposal;
  if (result?.outcome?.verified !== true || proposal?.proposalOnly !== true || proposal.customerMutation !== false || !Array.isArray(proposal.changes) || proposal.changes.length === 0) throw new Error("mission produced no behaviorally accepted proposal-only candidate");
  if (!strings(proposal.authorProviders, 1)) throw new Error("implementation provider provenance is absent");
  return proposal;
}

function copyTerritory(source) {
  const parent = mkdtempSync(join(tmpdir(), "free-compute-self-improvement-")), workspace = join(parent, "territory");
  cpSync(source, workspace, { recursive: true, filter: (path) => {
    const rel = relative(source, path).split(sep).join("/");
    return !rel.split("/").some((part) => [".git", "node_modules", ".lake", "dist", "coverage", "union-acceptance"].includes(part))
      && !rel.startsWith("data/") && !rel.startsWith("content/assets/legacy/");
  } });
  const manifest = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    const admitted = resolve(source, "node_modules", name);
    if (!existsSync(admitted)) throw new Error(`declared self-improvement dependency is not installed: ${name}`);
    const target = resolve(workspace, "node_modules", name); mkdirSync(dirname(target), { recursive: true }); symlinkSync(admitted, target, "dir");
  }
  return { parent, workspace };
}

function intentCachePath(root, lot) { return join(root, "data/recovery/self-improvement-intents", `${lot.slice("ni:///sha-256;".length)}.rmn.cbor`); }
function fsyncDirectory(path) { const fd = openSync(path, "r"); try { fsyncSync(fd); } finally { closeSync(fd); } }
function ensureDurableDirectory(directory) {
  if (existsSync(directory)) {
    if (!lstatSync(directory).isDirectory()) throw new Error(`recovery path is not a directory: ${directory}`);
    return;
  }
  const missing = []; let cursor = directory;
  while (!existsSync(cursor)) {
    missing.push(cursor);
    const parent = dirname(cursor);
    if (parent === cursor) throw new Error(`recovery directory has no durable ancestor: ${directory}`);
    cursor = parent;
  }
  for (const path of missing.reverse()) {
    try { mkdirSync(path); }
    catch (error) { if (error?.code !== "EEXIST") throw error; }
    if (!lstatSync(path).isDirectory()) throw new Error(`recovery path is not a directory: ${path}`);
    fsyncDirectory(dirname(path));
  }
}
function cachePreparedIntent(root, intent) {
  const path = intentCachePath(root, intent.lot), bytes = semanticBytes(relationalRwilDocument(intent)), directory = dirname(path); ensureDurableDirectory(directory);
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`; let published = false;
  try {
    const fd = openSync(temporary, "wx", 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    try { linkSync(temporary, path); published = true; }
    catch (error) { if (error?.code !== "EEXIST") throw error; }
    if (published) { fsyncDirectory(directory); return intent; }
  } finally { try { unlinkSync(temporary); } catch (error) { if (error?.code !== "ENOENT") throw error; } }
  if (!readFileSync(path).equals(bytes)) throw new Error("prepared self-improvement intent conflicts with the write-once recovery cell");
  return intent;
}
function cachedPreparedIntent(root, lot) {
  const path = intentCachePath(root, lot); if (!existsSync(path)) return null;
  const term = decodeSemantic(readFileSync(path));
  if (term?.[0] !== "ascribe" || term.length !== 3) throw new Error("cached self-improvement intent is not an ascribed RMN term");
  const intent = decodeRelationalValue(term[1], term[2]);
  if (!exact(intent) || intent.type !== "SupplierSelfImprovementExecutionIntent" || intent.lot !== lot) throw new Error("cached self-improvement intent identity is invalid");
  return intent;
}

function proposalChanges(root, proposal, writablePaths) {
  if (!Array.isArray(proposal.changes) || proposal.changes.length === 0) throw new Error("self-improvement proposal change set is invalid");
  const admitted = new Set(writablePaths), seen = new Set(); let total = 0;
  return proposal.changes.map((change) => {
    const resolved = inside(root, change.path);
    if (!admitted.has(resolved.relative) || seen.has(resolved.relative)) throw new Error(`proposal path is not exactly admitted: ${resolved.relative}`);
    seen.add(resolved.relative);
    const parent = realpathSync(dirname(resolved.path)); if (!parent.startsWith(`${realpathSync(root)}${sep}`)) throw new Error(`proposal parent escapes supplier territory: ${resolved.relative}`);
    const existed = existsSync(resolved.path);
    if (existed && (lstatSync(resolved.path).isSymbolicLink() || !lstatSync(resolved.path).isFile())) throw new Error(`proposal target is not a regular supplier file: ${resolved.relative}`);
    if (existed !== change.beforeExisted) throw new Error(`proposal incumbent existence changed: ${resolved.relative}`);
    const before = existed ? readFileSync(resolved.path) : Buffer.alloc(0);
    if (sha256(before) !== change.beforeDigest) throw new Error(`proposal incumbent digest changed: ${resolved.relative}`);
    const after = Buffer.from(change.afterBytesBase64, "base64"); total += after.length;
    if (sha256(after) !== change.afterDigest) throw new Error(`proposal after bytes are invalid: ${resolved.relative}`);
    return { ...resolved, existed, before, after };
  });
}

function canonicalProposal(root, proposal) {
  return record({ ...Object.fromEntries(Object.entries(proposal).filter(([key]) => key !== "id" && key !== "changes")), changes: proposal.changes.map((change) => ({ ...change, path: inside(root, change.path).relative })) });
}

function serializedChanges(changes) {
  return changes.map((change) => ({
    path: change.relative, beforeExisted: change.existed, beforeDigest: sha256(change.before),
    beforeBytesBase64: change.before.toString("base64"), afterDigest: sha256(change.after), afterBytesBase64: change.after.toString("base64"),
  }));
}

function changesFromPreparation(root, proposal, writablePaths, prepared) {
  if (!Array.isArray(prepared) || prepared.length !== proposal.changes.length) throw new Error("prepared self-improvement change set is invalid");
  const proposalByPath = new Map(proposal.changes.map((change) => [change.path, change])), admitted = new Set(writablePaths), seen = new Set(); let total = 0;
  return prepared.map((change) => {
    const resolved = inside(root, change.path), proposed = proposalByPath.get(change.path);
    if (!admitted.has(resolved.relative) || seen.has(resolved.relative) || !proposed || change.beforeExisted !== proposed.beforeExisted || change.beforeDigest !== proposed.beforeDigest || change.afterDigest !== proposed.afterDigest || change.afterBytesBase64 !== proposed.afterBytesBase64) throw new Error(`prepared self-improvement change binding is invalid: ${resolved.relative}`);
    seen.add(resolved.relative);
    const before = Buffer.from(change.beforeBytesBase64, "base64"), after = Buffer.from(change.afterBytesBase64, "base64"); total += before.length + after.length;
    if (sha256(before) !== change.beforeDigest || sha256(after) !== change.afterDigest || (change.beforeExisted === false && before.length !== 0)) throw new Error(`prepared self-improvement bytes are invalid: ${resolved.relative}`);
    const parent = realpathSync(dirname(resolved.path)); if (!parent.startsWith(`${realpathSync(root)}${sep}`)) throw new Error(`prepared proposal parent escapes supplier territory: ${resolved.relative}`);
    return { ...resolved, existed: change.beforeExisted, before, after };
  });
}

function liveChangeState(change) {
  const exists = existsSync(change.path);
  if (exists && (lstatSync(change.path).isSymbolicLink() || !lstatSync(change.path).isFile())) throw new Error(`supplier live target is not a regular file: ${change.relative}`);
  const digest = sha256(exists ? readFileSync(change.path) : Buffer.alloc(0));
  if (exists === change.existed && digest === sha256(change.before)) return "before";
  if (exists && digest === sha256(change.after)) return "after";
  throw new Error(`supplier live target drifted outside the prepared transition: ${change.relative}`);
}

function writeChanges(changes, applied = null) {
  for (const change of changes) {
    const temporary = `${change.path}.supplier-self-improvement-${process.pid}`;
    try {
      const exists = existsSync(change.path);
      if (exists !== change.existed || (exists && (lstatSync(change.path).isSymbolicLink() || !lstatSync(change.path).isFile())) || sha256(exists ? readFileSync(change.path) : Buffer.alloc(0)) !== sha256(change.before)) throw new Error(`supplier live target drifted before apply: ${change.relative}`);
      mkdirSync(dirname(change.path), { recursive: true }); writeFileSync(temporary, change.after); renameSync(temporary, change.path);
      applied?.push(change);
    } finally { rmSync(temporary, { force: true }); }
  }
}
function restoreChanges(changes) {
  const refused = [];
  for (const change of changes) {
    const exists = existsSync(change.path), regular = exists && !lstatSync(change.path).isSymbolicLink() && lstatSync(change.path).isFile(), current = regular ? readFileSync(change.path) : Buffer.alloc(0);
    if ((change.existed && regular && sha256(current) === sha256(change.before)) || (!change.existed && !exists)) continue;
    if (!regular || sha256(current) !== sha256(change.after)) { refused.push(change.relative); continue; }
    change.existed ? writeFileSync(change.path, change.before) : rmSync(change.path, { force: true });
  }
  if (refused.length > 0) throw new Error(`rollback preserved concurrent supplier edits: ${refused.join(", ")}`);
}
export async function applySupplierSelfImprovement({ activity, contract, proposal, capsule, recipe, root, at }, options = {}) {
  const validateCapsule = options.validateCapsule ?? validateAcceptanceCapsule, materializeCapsule = options.materializeCapsule ?? materializeAcceptanceCapsule;
  const verify = options.verify ?? ((territory, command) => runTestsCommand(territory, command));
  validateCapsule(capsule, { territory: root });
  let changes;
  if (options.preparedChanges) changes = changesFromPreparation(root, proposal, recipe.writablePaths, options.preparedChanges);
  else {
    changes = proposalChanges(root, proposal, recipe.writablePaths);
    const staged = copyTerritory(root);
    try {
      const stagedChanges = proposalChanges(staged.workspace, proposal, recipe.writablePaths); writeChanges(stagedChanges); materializeCapsule(staged.workspace, capsule);
      const stagedVerification = verify(staged.workspace, "npm test"), stagedAcceptance = verify(staged.workspace, capsule.command);
      if (!stagedVerification.passed || !stagedAcceptance.passed) throw new Error("staged proposal failed full verification or protected acceptance");
    } finally { rmSync(staged.parent, { recursive: true, force: true }); }
    if (options.onPrepared) {
      try { await options.onPrepared(serializedChanges(changes)); }
      catch (error) { error.recoverableIntentWrite = true; throw error; }
    }
  }
  const writeLiveChanges = options.writeLiveChanges ?? writeChanges;
  const lock = options.actuationLockHeld === true ? async (_lockPath, action) => action() : (options.withActuationLock ?? withSupplierSettlementLock);
  const lockPath = options.lockPath ?? join(root, "data/locks/self-improvement-actuation.lock");
  return lock(lockPath, async () => {
    try {
      const states = changes.map(liveChangeState), writable = changes.filter((_change, index) => states[index] === "before");
      writeLiveChanges(writable, []);
      const localVerification = verify(root, "npm test");
      if (!localVerification.passed) throw new Error("supplier-local verification failed after apply");
      return { changes: changes.map(({ relative: path, before, after }) => ({ path, beforeDigest: sha256(before), afterDigest: sha256(after) })), verification: localVerification };
    } catch (error) {
      const preserveAppliedBytes = error?.preserveAppliedBytes === true;
      let rollbackRefusal = null;
      if (!preserveAppliedBytes) {
        try { restoreChanges([...changes].reverse()); }
        catch (restoreError) { rollbackRefusal = restoreError.message; }
      }
      const rollbackVerification = verify(root, "npm test");
      const restored = !preserveAppliedBytes && rollbackVerification.passed && rollbackRefusal === null;
      const wrapped = new Error(`${error.message}; supplier bytes restored=${restored}${rollbackRefusal ? `; ${rollbackRefusal}` : ""}`);
      wrapped.cause = error; wrapped.exactRollback = restored; wrapped.recoveryRequired = preserveAppliedBytes || rollbackRefusal !== null; throw wrapped;
    }
  });
}

function selfImprovementSettlement(publication, intent, applied, sequence, at) {
  return record({
    type: "SupplierSelfImprovementSettlement", supplier: ACTOR, lot: publication.object.id, publication: publication.id, intent: intent?.id ?? null, sourceOpportunity: publication.object.sourceOpportunity,
    capability: intent.capability, attemptedAtSequence: sequence, settledAt: at, acceptanceCapsule: intent.capsule.digest,
    oracleSuppliers: intent.oracleSuppliers, implementationAuthors: intent.implementationAuthors,
    changes: applied.changes,
    refinement: "model-to-smaller-model-to-script", directInteractiveModelCalls: 0, customerMutation: false,
  });
}

function recoveryIntentProblem(intent, publication) {
  if (!exact(intent) || intent.type !== "SupplierSelfImprovementExecutionIntent" || intent.supplier !== ACTOR || intent.lot !== publication.object.id || intent.publication !== publication.id || intent.disposition !== "prepared-recoverable" || !NI.test(intent.contract) || !exact(intent.proposal) || !exact(intent.recipe) || !exact(intent.capsule) || !strings(intent.oracleSuppliers, 1) || !strings(intent.implementationAuthors, 1) || !Array.isArray(intent.changes) || intent.changes.length === 0) return "supplier-self-improvement-recovery-intent-invalid";
  return null;
}

export async function executeSupplierSelfImprovement(publication, { activity, contract, policy, root, sequence, at, procure = procureSoftwareAcceptanceCapsule, execute = executeSoftwareMission, apply = applySupplierSelfImprovement, applyOptions = {}, onProcurementIntent = null, onMissionIntent = null, onIntent = null, recoveryProcurementIntent = null, recoveryMissionIntent = null } = {}) {
  const problem = publicationProblem(publication) ?? executionPolicyProblem(policy);
  if (problem) throw new Error(problem);
  const recipe = recipeFor(publication, policy), input = selfImprovementProcurementInput(publication, recipe, policy, root);
  const procurementIntent = recoveryProcurementIntent ?? record({ type: "SupplierSelfImprovementProcurementIntent", supplier: ACTOR, lot: publication.object.id, publication: publication.id, contract, request: input, requestIdentity: rmnId(input), admittedAtSequence: sequence, admittedAt: at, disposition: "prepared-recoverable", customerMutation: false });
  if (!exact(procurementIntent) || procurementIntent.type !== "SupplierSelfImprovementProcurementIntent" || procurementIntent.lot !== publication.object.id || procurementIntent.requestIdentity !== rmnId(procurementIntent.request) || procurementIntent.requestIdentity !== rmnId(input)) throw new Error("supplier-self-improvement-procurement-intent-invalid");
  if (!recoveryProcurementIntent) { if (typeof onProcurementIntent !== "function") throw new Error("acceptance procurement requires a durable request-intent writer"); await onProcurementIntent(procurementIntent); }
  let capsuleSettlement, oracleProviders, proposedMission;
  if (recoveryMissionIntent) {
    proposedMission = recoveryMissionIntent.request;
    oracleProviders = proposedMission?.oracleProviders;
    capsuleSettlement = { capsule: proposedMission?.acceptanceCapsule };
    if (!Array.isArray(oracleProviders) || typeof capsuleSettlement.capsule !== "object" || capsuleSettlement.capsule === null || !NI.test(capsuleSettlement.capsule.digest) || typeof capsuleSettlement.capsule.command !== "string" || !capsuleSettlement.capsule.command) throw new Error("supplier-self-improvement-mission-intent-invalid");
  } else {
    capsuleSettlement = await procure(procurementIntent.request);
    oracleProviders = providerIdentities(capsuleSettlement);
    proposedMission = selfImprovementMission(publication, recipe, policy, capsuleSettlement, root);
  }
  const missionIntent = recoveryMissionIntent ?? record({ type: "SupplierSelfImprovementMissionIntent", supplier: ACTOR, lot: publication.object.id, publication: publication.id, procurementIntent: procurementIntent.id, request: proposedMission, requestIdentity: rmnId(proposedMission), admittedAtSequence: procurementIntent.admittedAtSequence, admittedAt: procurementIntent.admittedAt, disposition: "prepared-recoverable", customerMutation: false });
  if (!exact(missionIntent) || missionIntent.type !== "SupplierSelfImprovementMissionIntent" || missionIntent.lot !== publication.object.id || missionIntent.procurementIntent !== procurementIntent.id || missionIntent.requestIdentity !== rmnId(missionIntent.request) || missionIntent.requestIdentity !== rmnId(proposedMission)) throw new Error("supplier-self-improvement-mission-intent-invalid");
  if (!recoveryMissionIntent) { if (typeof onMissionIntent !== "function") throw new Error("implementation mission requires a durable request-intent writer"); await onMissionIntent(missionIntent); }
  const result = await execute(missionIntent.request);
  const proposal = validateBehaviorallyAssayedProposal(result);
  const preparedRecipe = exact(recipe) ? recipe : record(recipe), preparedCapsule = exact(capsuleSettlement.capsule) ? capsuleSettlement.capsule : record(capsuleSettlement.capsule), preparedProposal = canonicalProposal(root, proposal);
  let intent = null;
  const applied = await apply({ activity, contract, proposal: preparedProposal, capsule: preparedCapsule, recipe: preparedRecipe, root, at }, { ...applyOptions, onPrepared: async (changes) => {
    if (typeof onIntent !== "function") throw new Error("supplier-local mutation requires a durable prepared-intent writer");
    intent = record({ type: "SupplierSelfImprovementExecutionIntent", supplier: ACTOR, lot: publication.object.id, publication: publication.id, sourceOpportunity: publication.object.sourceOpportunity, contract, capability: recipe.capability, recipe: preparedRecipe, capsule: preparedCapsule, proposal: preparedProposal, changes, oracleSuppliers: oracleProviders, implementationAuthors: proposal.authorProviders, admittedAtSequence: sequence, admittedAt: at, disposition: "prepared-recoverable", customerMutation: false });
    await onIntent(intent);
  } });
  if (!intent) intent = { id: null, capability: recipe.capability, capsule: preparedCapsule, oracleSuppliers: oracleProviders, implementationAuthors: proposal.authorProviders };
  return selfImprovementSettlement(publication, intent, applied, sequence, at);
}

export async function settleNextSupplierSelfImprovement({ rows, ledger, activity, contract, policy, root, sequence, at, ...options }) {
  if (!ledger || typeof ledger.read !== "function" || typeof ledger.append !== "function") throw new Error("self-improvement execution requires the owning settlement ledger");
  const lock = options.withActuationLock ?? withSupplierSettlementLock, lockPath = options.lockPath ?? join(root, "data/locks/self-improvement-actuation.lock");
  return lock(lockPath, async () => {
    const currentRows = ledger.read(), publication = pendingSupplierSelfImprovement(currentRows, { policy });
    if (!publication) return null;
    const witnessedMarketRefusal = currentRows.find((row) =>
      row?.type === "SupplierSelfImprovementRecoveryResidue"
      && row.lot === publication.object.id
      && String(row.reason ?? "").includes("selected-provider-refused"));
    if (witnessedMarketRefusal) {
      const refusal = record({
        type: "SupplierSelfImprovementAttemptResidue",
        supplier: ACTOR,
        lot: publication.object.id,
        publication: publication.id,
        intent: witnessedMarketRefusal.intent ?? null,
        borderIntents: witnessedMarketRefusal.borderIntents ?? [],
        attemptedAtSequence: sequence,
        attemptedAt: at,
        disposition: "terminal",
        reason: "purchased-attempt-refused",
        evidence: witnessedMarketRefusal.id,
        strongerModelRequested: false,
        customerMutation: false,
      });
      await ledger.append(refusal, at);
      return refusal;
    }
    const admissionProblem = publicationProblem(publication) ?? executionPolicyProblem(policy);
    if (admissionProblem) {
      const refusal = record({
        type: "SupplierSelfImprovementAttemptResidue",
        supplier: ACTOR,
        lot: publication.object.id,
        publication: publication.id,
        intent: null,
        borderIntents: [],
        attemptedAtSequence: sequence,
        attemptedAt: at,
        disposition: "terminal",
        reason: admissionProblem,
        strongerModelRequested: false,
        customerMutation: false,
      });
      await ledger.append(refusal, at);
      return refusal;
    }
    let result, intent = currentRows.filter((row) => row?.type === "SupplierSelfImprovementExecutionIntent" && row.lot === publication.object.id).sort((left, right) => left.id.localeCompare(right.id))[0] ?? cachedPreparedIntent(root, publication.object.id);
    try {
      if (intent) {
        const problem = recoveryIntentProblem(intent, publication); if (problem) throw new Error(problem);
        if (!currentRows.some((row) => row?.id === intent.id)) await ledger.append(intent, intent.admittedAt);
        const apply = options.apply ?? applySupplierSelfImprovement;
        const applied = await apply({ activity, contract: intent.contract, proposal: intent.proposal, capsule: intent.capsule, recipe: intent.recipe, root, at: intent.admittedAt }, { preparedChanges: intent.changes, actuationLockHeld: true });
        result = selfImprovementSettlement(publication, intent, applied, intent.admittedAtSequence, at);
      } else {
        const procurementIntent = currentRows.filter((row) => row?.type === "SupplierSelfImprovementProcurementIntent" && row.lot === publication.object.id).sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
        const missionIntent = currentRows.filter((row) => row?.type === "SupplierSelfImprovementMissionIntent" && row.lot === publication.object.id).sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
        result = await executeSupplierSelfImprovement(publication, { activity, contract, policy, root, sequence, at, ...options, recoveryProcurementIntent: procurementIntent, recoveryMissionIntent: missionIntent, applyOptions: { actuationLockHeld: true }, onProcurementIntent: async (value) => { await ledger.append(value, value.admittedAt); }, onMissionIntent: async (value) => { await ledger.append(value, value.admittedAt); }, onIntent: async (value) => { intent = cachePreparedIntent(root, value); await ledger.append(value, at); } });
      }
    } catch (error) {
      intent ??= cachedPreparedIntent(root, publication.object.id);
      const borderIntents = ledger.read().filter((row) => ["SupplierSelfImprovementProcurementIntent", "SupplierSelfImprovementMissionIntent"].includes(row?.type) && row.lot === publication.object.id).map((row) => row.id).sort();
      const recoverable = error?.purchasedAttemptSettled !== true
        && (borderIntents.length > 0 || error?.recoverableIntentWrite === true || error?.recoveryRequired === true || (intent !== null && error?.exactRollback !== true));
      result = record({ type: recoverable ? "SupplierSelfImprovementRecoveryResidue" : "SupplierSelfImprovementAttemptResidue", supplier: ACTOR, lot: publication.object.id, publication: publication.id, intent: intent?.id ?? null, borderIntents, attemptedAtSequence: sequence, attemptedAt: at, disposition: recoverable ? "recovery-required" : "terminal", reason: error.message, strongerModelRequested: false, customerMutation: false });
    }
    await ledger.append(result, at);
    return result;
  });
}
