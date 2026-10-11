import { spawn } from "node:child_process";
import { createPublicKey } from "node:crypto";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";
import { isTruthTop, readingOfSides, truthTop } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deepFreeze,
  identify,
  signRecord,
  verifyRecord,
  verifySignedRecord,
} from "@red-cup-engineering/strategy-evaluation-service";

const digestPattern = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const digest = (value, label) => {
  if (typeof value !== "string" || !digestPattern.test(value)) {
    throw new TypeError(`${label}-digest-invalid`);
  }
  return value;
};

function exactKeys(record, allowed, label) {
  if (Object.keys(record).some((key) => !allowed.includes(key))) {
    throw new TypeError(`${label}-schema-invalid`);
  }
  return record;
}

function distinctActors(records, label) {
  const actors = records.map(([record, field]) => record[field]);
  if (new Set(actors).size !== actors.length) {
    throw new TypeError(`${label}-independence-invalid`);
  }
}

/** The quartet's corner: the FOUR point its observations tell, supporting observations its for
 *  side and refuting ones its against side. Nothing told is the knowledge bottom; support alone is
 *  the truth top, the only corner that promotes; support and refutation together keep the
 *  contradiction rather than averaging it away. */
export function quartetCorner(observations) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return readingOfSides("knowledge", false, false);
  }
  let supports = false;
  let refutes = false;
  const seen = new Set();
  for (const observation of observations) {
    digest(observation.evidenceDigest, "quartet-evidence");
    if (seen.has(observation.evidenceDigest)) {
      throw new TypeError("quartet-evidence-duplicate");
    }
    seen.add(observation.evidenceDigest);
    if (observation.verdict === "supports") supports = true;
    else if (observation.verdict === "refutes") refutes = true;
    else throw new TypeError("quartet-verdict-invalid");
  }
  return readingOfSides("knowledge", supports, refutes);
}

function proofBuild(record, sourceDigest, trustedActorKeys, promotionActor) {
  const build = verifySignedRecord(record, "ObsmetrologiaProofBuildReceipt", "builderActor", trustedActorKeys, "proof-build");
  exactKeys(build, [
    "id",
    "type",
    "version",
    "builderActor",
    "applicationTheorem",
    "runtimeProposition",
    "applicationSourceDigest",
    "instanceSourceDigest",
    "obsmetrologiaRevision",
    "leanVersion",
    "applicationAxioms",
    "instanceAxioms",
    "verified",
    "signature",
  ], "proof-build");
  if (
    build.builderActor === promotionActor ||
    build.applicationTheorem !==
      "BrokerageControl.AlphaSelection.paper_promotion_certificate_of_witnesses" ||
    build.runtimeProposition !==
      "BrokerageControl.AlphaSelection.RuntimePromotionAdmissible" ||
    build.instanceSourceDigest !== sourceDigest ||
    build.verified !== true ||
    !Array.isArray(build.applicationAxioms) ||
    build.applicationAxioms.join(",") !== "propext,Quot.sound" ||
    !Array.isArray(build.instanceAxioms) ||
    build.instanceAxioms.join(",") !== "propext"
  ) {
    throw new TypeError("proof-build-invalid");
  }
  digest(build.applicationSourceDigest, "proof-source");
  digest(build.instanceSourceDigest, "proof-instance-source");
  digest(build.obsmetrologiaRevision, "obsmetrologia-revision");
  return build;
}

const SERVICE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const APPLICATION_SOURCE = fileURLToPath(new URL("../lean/ObsmetrologiaAlphaSelection.lean", import.meta.url));
const MANIFEST_SOURCE = fileURLToPath(new URL("../lake-manifest.json", import.meta.url));
const proofSourceObjectKind = "rsc-quiescent.obsmetrologia-proof-source";
const exactCarrier = (carrier) => {
  if (!carrier || Object.getPrototypeOf(carrier) !== Object.prototype || Object.keys(carrier).sort().join(",") !== "bytes,encoding" || carrier.encoding !== "base64" || typeof carrier.bytes !== "string") throw new TypeError("proof-source-carrier-invalid");
  const decoded = Buffer.from(carrier.bytes, "base64");
  if (decoded.toString("base64") !== carrier.bytes) throw new TypeError("proof-source-carrier-invalid");
  return Object.freeze({ encoding: "base64", bytes: carrier.bytes });
};
export function identifyProofSourceCarrier(carrier) {
  return identifyJsonSemanticContent({ objectKind: proofSourceObjectKind, value: exactCarrier(carrier), witnessRoot: EMPTY_WITNESS_ROOT }).token;
}
export function verifyProofSourceCarrier({ carrier, token }) {
  if (typeof token !== "string" || identifyProofSourceCarrier(carrier) !== token) throw new TypeError("proof-source-token-mismatch");
  return exactCarrier(carrier);
}
const contentDigest = (bytes) => identifyProofSourceCarrier({ encoding: "base64", bytes: Buffer.from(bytes).toString("base64") });
const SCALE = 1_000_000;
const scaled = (value, direction, label) => {
  const number = Number(value);
  const result = direction === "lower"
    ? Math.floor(number * SCALE)
    : Math.ceil(number * SCALE);
  if (!Number.isSafeInteger(result)) throw new RangeError(`${label}-proof-scale-invalid`);
  return result;
};
const leanList = (values) => `[${values.join(", ")}]`;
function runtimeInstanceSource({ evaluations, incumbentsByDataset, selectionPolicy, entropyAssay }) {
  const incumbent = evaluations.map(({ replayDataset }) =>
    incumbentsByDataset.get(replayDataset)
  );
  const candidateNetPnl = evaluations.map(({ metrics }) =>
    scaled(metrics.netPnl, "lower", "candidate-net-pnl")
  );
  const incumbentNetPnl = incumbent.map(({ metrics }) =>
    scaled(metrics.netPnl, "upper", "incumbent-net-pnl")
  );
  const candidateDrawdown = evaluations.map(({ metrics }) =>
    scaled(metrics.maximumDrawdown, "upper", "candidate-drawdown")
  );
  const minimumImprovement = scaled(
    selectionPolicy.minimumNetPnlImprovement,
    "upper",
    "minimum-improvement",
  );
  const maximumDrawdown = scaled(
    selectionPolicy.maximumDrawdown,
    "lower",
    "maximum-drawdown",
  );
  return `import ObsmetrologiaAlphaSelection

namespace BrokerageControl.AlphaSelection.Instance

def reading : BrokerageControl.AlphaSelection.RuntimePromotionReading where
  folds := ${evaluations.length}
  candidateNetPnl := ${leanList(candidateNetPnl)}
  incumbentNetPnl := ${leanList(incumbentNetPnl)}
  minimumImprovement := ${minimumImprovement}
  candidateDrawdown := ${leanList(candidateDrawdown)}
  maximumDrawdown := ${maximumDrawdown}
  beforeEntropyRank := ${entropyAssay.beforeEntropyRank}
  afterEntropyRank := ${entropyAssay.afterEntropyRank}
  quartetActive := true
  causalBoundaryPresented := true
  noFutureLeakage := true
  noSelfReachingEvent := true
  tournamentFixedPoint := true
  noProfitableDeviation := true
  dialecticaWitnessSurvives := true
  equilibriumMatchesSurvivor := true

theorem checked :
    BrokerageControl.AlphaSelection.RuntimePromotionAdmissible reading := by
  rfl

#print axioms checked

end BrokerageControl.AlphaSelection.Instance
`;
}
async function runLean(source) {
  // Packed consumers receive source, not build products. Build this small project
  // against its declared Obsmetrologia provider before checking the generated instance.
  await new Promise((resolve, reject) => {
    const child = spawn("lake", ["build", "ObsmetrologiaAlphaSelection"], { cwd: SERVICE_ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("lean-project-build-timeout")); }, 120_000);
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { output += chunk; }); child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => { clearTimeout(timer); if (code !== 0) reject(new Error(`lean-project-build-refused:${output}`)); else resolve(); });
  });
  const temporaryRoot = await mkdtemp(join(tmpdir(), "obsmetrologia-promotion-"));
  const sourcePath = join(temporaryRoot, "RuntimeInstance.lean");
  await writeFile(sourcePath, source, { encoding: "utf8", mode: 0o600 });
  try {
    await new Promise((resolve, reject) => {
      const child = spawn("lake", ["env", "lean", sourcePath], {
      cwd: SERVICE_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("lean-instance-check-timeout"));
      }, 30_000);
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) reject(new Error(`lean-instance-check-refused:${stderr || stdout}`));
        else if (!`${stdout}\n${stderr}`.includes("depends on axioms: [propext]")) reject(new Error(`lean-instance-axiom-audit-missing:${stdout}${stderr}`));
        else resolve();
      });
    });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function verifyPaperPromotionCertificate({
  candidate,
  incumbentEvaluations,
  candidateEvaluations,
  evidenceObservations,
  causalAssay,
  entropyAssay,
  tournamentWitness,
  selectionPolicy,
  trustedActorKeys,
  promotionActor,
  promotionPrivateKey,
  proofBuilderActor,
  proofBuilderPrivateKey,
}) {
  if (typeof promotionActor !== "string" || !promotionActor || !promotionPrivateKey ||
      typeof proofBuilderActor !== "string" || !proofBuilderActor ||
      proofBuilderActor === promotionActor || !proofBuilderPrivateKey) {
    throw new TypeError("promotion-signer-required");
  }
  candidate = verifyRecord(candidate, "ImmutableStrategyCandidate", "candidate");
  const incumbents = incumbentEvaluations.map((evaluation) =>
    verifyRecord(evaluation, "ReplayableStrategyEvaluation", "incumbent-evaluation")
  );
  selectionPolicy = verifyRecord(
    selectionPolicy,
    "StrategySelectionPolicy",
    "selection-policy",
  );
  const evaluations = candidateEvaluations.map((evaluation) =>
    verifyRecord(evaluation, "ReplayableStrategyEvaluation", "candidate-evaluation")
  );
  if (evaluations.length < 2 || incumbents.length !== evaluations.length) {
    throw new RangeError("independent-replay-folds-insufficient");
  }
  const incumbentsByDataset = new Map(
    incumbents.map((evaluation) => [evaluation.replayDataset, evaluation]),
  );
  if (incumbentsByDataset.size !== incumbents.length) {
    throw new TypeError("incumbent-replay-fold-binding-invalid");
  }
  const datasets = new Set();
  for (const evaluation of evaluations) {
    const incumbent = incumbentsByDataset.get(evaluation.replayDataset);
    if (evaluation.candidate !== candidate.id || datasets.has(evaluation.replayDataset)) {
      throw new TypeError("candidate-replay-fold-binding-invalid");
    }
    if (!incumbent) {
      throw new TypeError("incumbent-replay-fold-binding-invalid");
    }
    datasets.add(evaluation.replayDataset);
    if (
      evaluation.falsifierOutcome?.triggered ||
      evaluation.metrics?.netPnl <
        incumbent.metrics.netPnl + selectionPolicy.minimumNetPnlImprovement ||
      evaluation.metrics?.maximumDrawdown > selectionPolicy.maximumDrawdown
    ) {
      throw new RangeError("candidate-replay-fold-refuted");
    }
  }

  const observations = evidenceObservations.map((observation) =>
    verifySignedRecord(
      observation,
      "StrategyEvidenceObservation",
      "observerActor",
      trustedActorKeys,
      "strategy-evidence",
    )
  );
  if (
    observations.some((observation) => observation.candidate !== candidate.id) ||
    observations.length < 2 ||
    new Set(observations.map(({ observerActor }) => observerActor)).size !== observations.length ||
    !isTruthTop(quartetCorner(observations))
  ) {
    throw new RangeError("quartet-not-supported");
  }

  causalAssay = verifySignedRecord(
    causalAssay,
    "CausalReplayBoundaryAssay",
    "assayerActor",
    trustedActorKeys,
    "causal-assay",
  );
  entropyAssay = verifySignedRecord(
    entropyAssay,
    "EvidenceEntropyRelaxationAssay",
    "assayerActor",
    trustedActorKeys,
    "entropy-assay",
  );
  tournamentWitness = verifySignedRecord(
    tournamentWitness,
    "StrategyVerificationTournamentWitness",
    "witnessActor",
    trustedActorKeys,
    "tournament-witness",
  );
  distinctActors([
    [causalAssay, "assayerActor"],
    [entropyAssay, "assayerActor"],
    [tournamentWitness, "witnessActor"],
  ], "promotion-witnesses");
  const assayActors = new Set([
    causalAssay.assayerActor,
    entropyAssay.assayerActor,
    tournamentWitness.witnessActor,
  ]);
  if (observations.some(({ observerActor }) => assayActors.has(observerActor))) {
    throw new TypeError("promotion-witnesses-independence-invalid");
  }

  if (
    causalAssay.candidate !== candidate.id ||
    causalAssay.noFutureLeakage !== true ||
    causalAssay.contractedBoundaryPresented !== true ||
    causalAssay.noSelfReachingEvent !== true
  ) {
    throw new TypeError("causal-assay-binding-invalid");
  }
  digest(causalAssay.eventOrderDigest, "causal-event-order");
  digest(causalAssay.boundaryPresentationDigest, "causal-boundary");

  if (
    entropyAssay.candidate !== candidate.id ||
    entropyAssay.relaxesVia !== true ||
    !Number.isSafeInteger(entropyAssay.beforeEntropyRank) ||
    !Number.isSafeInteger(entropyAssay.afterEntropyRank) ||
    entropyAssay.beforeEntropyRank < 0 ||
    entropyAssay.afterEntropyRank < 0 ||
    entropyAssay.afterEntropyRank > entropyAssay.beforeEntropyRank
  ) {
    throw new TypeError("entropy-assay-binding-invalid");
  }

  if (
    tournamentWitness.candidate !== candidate.id ||
    tournamentWitness.fixedPoint !== true ||
    tournamentWitness.pure !== true ||
    tournamentWitness.noProfitableDeviation !== true ||
    tournamentWitness.dialecticaWitnessSurvives !== true ||
    tournamentWitness.equilibriumMatchesSurvivor !== true ||
    tournamentWitness.allRefutationsAnswered !== true ||
    tournamentWitness.noDominantRefutation !== true
  ) {
    throw new TypeError("tournament-witness-binding-invalid");
  }
  const instanceSource = runtimeInstanceSource({
    evaluations,
    incumbentsByDataset,
    selectionPolicy,
    entropyAssay,
  });
  await runLean(instanceSource);
  const instanceSourceDigest = contentDigest(instanceSource);
  const [applicationBytes, manifestBytes] = await Promise.all([
    readFile(APPLICATION_SOURCE),
    readFile(MANIFEST_SOURCE),
  ]);
  const generatedBuildReceipt = signRecord({
    type: "ObsmetrologiaProofBuildReceipt",
    version: 2,
    builderActor: proofBuilderActor,
    applicationTheorem:
      "BrokerageControl.AlphaSelection.paper_promotion_certificate_of_witnesses",
    runtimeProposition:
      "BrokerageControl.AlphaSelection.RuntimePromotionAdmissible",
    applicationSourceDigest: contentDigest(applicationBytes),
    instanceSourceDigest,
    obsmetrologiaRevision: contentDigest(manifestBytes),
    leanVersion: "4.31.0",
    applicationAxioms: ["propext", "Quot.sound"],
    instanceAxioms: ["propext"],
    verified: true,
  }, proofBuilderPrivateKey);
  const build = proofBuild(
    generatedBuildReceipt,
    instanceSourceDigest,
    { ...trustedActorKeys, [proofBuilderActor]: createPublicKey(proofBuilderPrivateKey) },
    promotionActor,
  );
  return deepFreeze(signRecord({
    type: "ObsmetrologiaPaperPromotionCertificate",
    version: 2,
    promotionActor,
    candidate: candidate.id,
    incumbentEvaluations: incumbents.map(({ id }) => id).sort(),
    candidateEvaluations: evaluations.map(({ id }) => id).sort(),
    evidenceObservations: observations.map(({ id }) => id).sort(),
    quartetCorner: truthTop(),
    causalAssay: causalAssay.id,
    entropyAssay: entropyAssay.id,
    tournamentWitness: tournamentWitness.id,
    proofBuildReceipt: build.id,
    applicationTheorem: build.applicationTheorem,
    runtimeProposition: build.runtimeProposition,
    paperPromotionEstablished: true,
    alphaEstablished: false,
    profitabilityEstablished: false,
    liveReadinessEstablished: false,
  }, promotionPrivateKey));
}
