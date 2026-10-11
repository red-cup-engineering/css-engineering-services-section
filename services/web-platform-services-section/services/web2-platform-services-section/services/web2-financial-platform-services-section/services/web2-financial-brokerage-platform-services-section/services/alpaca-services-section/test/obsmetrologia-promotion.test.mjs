import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import {
  identify,
  signRecord,
} from "../services/strategy-evaluation-service/src/strategy-evaluation.mjs";
import {
  quartetCorner,
  verifyPaperPromotionCertificate,
} from "../services/obsmetrologia-alpha-selection-proof-service/src/promotion-certificate.mjs";
import {
  formAggressivePortfolioIntent,
} from "../services/alpha-portfolio-order-intent-service/src/aggressive-intent.mjs";
import {
  createPaperExecutionAndReconciliationProvider,
} from "../services/brokerage-execution-transport-service/src/execute-intent.mjs";

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
const promotionCertificate = await verifyPaperPromotionCertificate(input);

test("quartet preserves contradiction rather than averaging it away", () => {
  assert.equal(quartetCorner([]), "potential");
  assert.equal(quartetCorner([
    { evidenceDigest: ni("n"), verdict: "supports" },
  ]), "active");
  assert.equal(quartetCorner([
    { evidenceDigest: ni("o"), verdict: "refutes" },
  ]), "stable");
  assert.equal(quartetCorner([
    { evidenceDigest: ni("p"), verdict: "supports" },
    { evidenceDigest: ni("q"), verdict: "refutes" },
  ]), "absurd");
});

test("paper promotion requires two withheld folds and independent Obsmetrologia witnesses", () => {
  assert.equal(promotionCertificate.paperPromotionEstablished, true);
  assert.equal(promotionCertificate.quartetCorner, "active");
  assert.equal(promotionCertificate.alphaEstablished, false);
  assert.equal(promotionCertificate.liveReadinessEstablished, false);
});

test("Esther's proof-governed scope refuses an intent or paper execution without the signed promotion", async () => {
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
      ["readAccount", "listPositions", "getOrderByClientOrderId", "placeOrder", "listActivities"]
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

test("contradictory evidence and future leakage each refuse promotion", async () => {
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
    /quartet-not-active/u,
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
