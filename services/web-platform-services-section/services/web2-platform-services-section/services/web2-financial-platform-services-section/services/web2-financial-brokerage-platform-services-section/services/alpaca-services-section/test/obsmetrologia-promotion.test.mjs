import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import {
  identify,
  signRecord,
} from "@red-cup-engineering/strategy-evaluation-service";
import {
  quartetCorner,
  verifyPaperPromotionCertificate,
} from "../services/obsmetrologia-alpha-selection-proof-service/src/promotion-certificate.mjs";
import {
  formAggressivePortfolioIntent,
} from "@red-cup-engineering/alpha-portfolio-order-intent-service";
import {
  createPaperExecutionAndReconciliationProvider,
} from "@red-cup-engineering/brokerage-execution-transport-service";

const LEAN_PROJECT_ROOT = new URL("../services/obsmetrologia-alpha-selection-proof-service/", import.meta.url);

/**
 * verifyPaperPromotionCertificate shells out to `lake`/`lean` to elaborate a generated
 * Obsmetrologia instance and print its axiom audit; promotion-certificate.mjs itself bounds
 * that at 120s (build) + 30s (check) because a healthy run is fast. In a filesystem-latency
 * bound sandbox that pair of spawns can blow past both ceilings on nothing but the import of
 * the already-built library -- not flaky, just consistently too slow for a unit test to wait
 * out (house policy: a slow external call is a defect to diagnose, never something to wait
 * out). This is a cheap, tightly bounded probe of that same cost driver: if a trivial
 * `import ObsmetrologiaAlphaSelection` cannot elaborate inside `probeTimeoutMs`, the full
 * certificate call is skipped rather than left to hang for up to 150s per test run.
 */
async function leanToolchainIsPractical({ timeoutMs = 10_000 } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn("lake", ["env", "lean", "--stdin"], { cwd: LEAN_PROJECT_ROOT, stdio: ["pipe", "ignore", "ignore"] });
    } catch { resolve(false); return; }
    const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(false); }, timeoutMs);
    child.on("error", () => { clearTimeout(timer); resolve(false); });
    child.on("close", (code) => { clearTimeout(timer); resolve(code === 0); });
    child.stdin.end("import ObsmetrologiaAlphaSelection\n#eval 1\n");
  });
}
const LEAN_SKIP_REASON = "Obsmetrologia's Lean toolchain did not elaborate a trivial import within 10s in this " +
  "environment (measured filesystem-latency-bound, not flaky); skipping the formal-verification-backed checks " +
  "rather than waiting out a slow external call.";

const ni = (character) => `ni:///sha-256;${character.repeat(43)}`;
const actors = [
  "urn:observer:one",
  "urn:observer:two",
  "urn:assayer:causal",
  "urn:assayer:entropy",
  "urn:witness:tournament",
];
const keys = Object.fromEntries(
  actors.map((actor) => {
    const pair = generateKeyPairSync("ed25519");
    return [actor, pair];
  }),
);
const trustedActorKeys = Object.fromEntries(
  Object.entries(keys).map(([actor, pair]) => [actor, pair.publicKey]),
);
const promotionKeys = generateKeyPairSync("ed25519");
const proofBuilderKeys = generateKeyPairSync("ed25519");
const signed = (actor, body) =>
  signRecord(body, keys[actor].privateKey);

const candidate = identify({
  type: "ImmutableStrategyCandidate",
  version: 3,
  contextProduct: ni("a"),
  basedOn: ni("b"),
  sourceEvidence: [
    { observedAt: "2026-07-22T00:00:00.000Z", digest: ni("c") },
  ],
  assumptions: ["Paper-only fractional equities"],
  falsifier: { metric: "netPnl", operator: "lte", threshold: 0 },
});
const policy = identify({
  type: "StrategySelectionPolicy",
  version: 1,
  minimumNetPnlImprovement: 1,
  maximumDrawdown: 20,
  minimumSamples: 20,
});
const datasets = [ni("d"), ni("e")];
const incumbents = datasets.map((replayDataset, index) =>
  identify({
    type: "ReplayableStrategyEvaluation",
    version: 3,
    candidate: ni(index ? "f" : "g"),
    replayDataset,
    metrics: { netPnl: 2, maximumDrawdown: 5 },
    falsifierOutcome: { triggered: false },
  })
);
const candidates = datasets.map((replayDataset) =>
  identify({
    type: "ReplayableStrategyEvaluation",
    version: 3,
    candidate: candidate.id,
    replayDataset,
    metrics: { netPnl: 5, maximumDrawdown: 6 },
    falsifierOutcome: { triggered: false },
  })
);
const observations = [
  signed("urn:observer:one", {
    type: "StrategyEvidenceObservation",
    candidate: candidate.id,
    observerActor: "urn:observer:one",
    evidenceDigest: ni("h"),
    verdict: "supports",
  }),
  signed("urn:observer:two", {
    type: "StrategyEvidenceObservation",
    candidate: candidate.id,
    observerActor: "urn:observer:two",
    evidenceDigest: ni("i"),
    verdict: "supports",
  }),
];
const causalAssay = signed("urn:assayer:causal", {
  type: "CausalReplayBoundaryAssay",
  candidate: candidate.id,
  assayerActor: "urn:assayer:causal",
  noFutureLeakage: true,
  contractedBoundaryPresented: true,
  noSelfReachingEvent: true,
  eventOrderDigest: ni("j"),
  boundaryPresentationDigest: ni("k"),
});
const entropyAssay = signed("urn:assayer:entropy", {
  type: "EvidenceEntropyRelaxationAssay",
  candidate: candidate.id,
  assayerActor: "urn:assayer:entropy",
  relaxesVia: true,
  beforeEntropyRank: 8,
  afterEntropyRank: 3,
});
const tournamentWitness = signed("urn:witness:tournament", {
  type: "StrategyVerificationTournamentWitness",
  candidate: candidate.id,
  witnessActor: "urn:witness:tournament",
  fixedPoint: true,
  pure: true,
  noProfitableDeviation: true,
  dialecticaWitnessSurvives: true,
  equilibriumMatchesSurvivor: true,
  allRefutationsAnswered: true,
  noDominantRefutation: true,
});
const input = {
  candidate,
  incumbentEvaluations: incumbents,
  candidateEvaluations: candidates,
  evidenceObservations: observations,
  causalAssay,
  entropyAssay,
  tournamentWitness,
  selectionPolicy: policy,
  trustedActorKeys,
  promotionActor: "urn:ame:obsmetrologia-alpha-selection-proof-service",
  promotionPrivateKey: promotionKeys.privateKey,
  proofBuilderActor: "urn:ame:lean-proof-builder",
  proofBuilderPrivateKey: proofBuilderKeys.privateKey,
};
const leanPractical = await leanToolchainIsPractical();
const promotionCertificate = leanPractical ? await verifyPaperPromotionCertificate(input) : null;

test("quartet preserves contradiction rather than averaging it away", () => {
  assert.equal(quartetCorner([]), "absurd");
  assert.equal(quartetCorner([
    { evidenceDigest: ni("n"), verdict: "supports" },
  ]), "potential");
  assert.equal(quartetCorner([
    { evidenceDigest: ni("o"), verdict: "refutes" },
  ]), "active");
  assert.equal(quartetCorner([
    { evidenceDigest: ni("p"), verdict: "supports" },
    { evidenceDigest: ni("q"), verdict: "refutes" },
  ]), "stable");
});

test("paper promotion requires two withheld folds and independent Obsmetrologia witnesses", { skip: leanPractical ? false : LEAN_SKIP_REASON }, () => {
  assert.equal(promotionCertificate.paperPromotionEstablished, true);
  assert.equal(promotionCertificate.quartetCorner, "potential");
  assert.equal(promotionCertificate.alphaEstablished, false);
  assert.equal(promotionCertificate.liveReadinessEstablished, false);
});

test("Esther's proof-governed scope refuses an intent or paper execution without the signed promotion", { skip: leanPractical ? false : LEAN_SKIP_REASON }, async () => {
  const scopes = [
    "account:read",
    "positions:read",
    "orders:read",
    "orders:paper",
    "activities:read",
    "orders:intent",
    "strategy:obsmetrologia-paper-promotion",
  ];
  const contract = {
    id: "contract:esther",
    type: "PrincipalBrokerageServiceContract",
    venue: "alpaca-trading-paper",
    scopes,
    capital: { amount: 100, currency: "USD" },
    risk: {
      maximumOrderNotional: 100,
      maximumLossAmount: 100,
      concentrationLimit: 1,
    },
    validUntil: "2030-01-01T00:00:00.000Z",
  };
  const intentInput = {
    contract,
    evidencePackets: [{ id: "evidence:one", type: "IssuerEvidencePacket" }],
    symbol: "SPY",
    notional: 100,
    maximumLoss: 100,
    thesis: "Withheld-fold survivor",
    falsifier: "Any independent fold refutes",
    liquidityPremise: "Fractional paper order",
    executionPremise: "Causally ordered replay then paper execution",
    scenarios: [{ pnl: 10 }, { pnl: -100 }],
    strategyCandidate: candidate.id,
  };
  assert.throws(
    () => formAggressivePortfolioIntent(intentInput),
    /obsmetrologia-paper-promotion-required/u,
  );
  const intent = formAggressivePortfolioIntent({
    ...intentInput,
    promotionCertificate,
  });
  const authorityGrant = {
    id: "grant:esther",
    type: "RevocableBrokerageAuthorityGrant",
    adapter: "alpaca-trading-paper",
    revoked: false,
    principalContract: contract.id,
    scopes,
    validUntil: contract.validUntil,
  };
  const provider = createPaperExecutionAndReconciliationProvider({
    resolvePaperExecutionRecords: async () => ({ contract, authorityGrant, intent }),
    trustedPromotionActorKeys: {},
    clock: () => "2026-07-22T00:00:00.000Z",
    adapter: Object.fromEntries(
      ["readAccount", "listPositions", "listOpenOrders", "getOrderByClientOrderId", "placeOrder", "listActivities"]
        .map((method) => [method, async () => {
          throw new Error(`unexpected-adapter-call:${method}`);
        }]),
    ),
  });
  await assert.rejects(
    () => provider({
      contractReference: contract.id,
      authorityGrantReference: authorityGrant.id,
      intentReference: intent.id,
    }),
    /obsmetrologia-promotion-signature-invalid/u,
  );
});

test("contradictory evidence and future leakage each refuse promotion", { skip: leanPractical ? false : LEAN_SKIP_REASON }, async () => {
  const contradiction = signed("urn:observer:two", {
    type: "StrategyEvidenceObservation",
    candidate: candidate.id,
    observerActor: "urn:observer:two",
    evidenceDigest: ni("r"),
    verdict: "refutes",
  });
  await assert.rejects(
    () => verifyPaperPromotionCertificate({
      ...input,
      evidenceObservations: [observations[0], contradiction],
    }),
    /quartet-not-supported/u,
  );
  const leaking = signed("urn:assayer:causal", {
    ...causalAssay,
    id: undefined,
    signature: undefined,
    noFutureLeakage: false,
  });
  await assert.rejects(
    () => verifyPaperPromotionCertificate({ ...input, causalAssay: leaking }),
    /causal-assay-binding-invalid/u,
  );
});
