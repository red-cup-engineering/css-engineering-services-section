import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { identify, signRecord } from "@red-cup-engineering/strategy-evaluation-service";
import { identifyProofSourceCarrier, verifyPaperPromotionCertificate, verifyProofSourceCarrier } from "@red-cup-engineering/obsmetrologia-alpha-selection-proof-service";

const ni = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const key = () => generateKeyPairSync("ed25519");
const signed = (body, privateKey) => signRecord({ version: 1, ...body }, privateKey);

function validPromotionInput() {
  const candidate = identify({ type: "ImmutableStrategyCandidate", version: 1 });
  const policy = identify({ type: "StrategySelectionPolicy", version: 1, minimumNetPnlImprovement: 1, maximumDrawdown: 10 });
  const incumbent = (dataset) => identify({ type: "ReplayableStrategyEvaluation", version: 3, candidate: "incumbent", replayDataset: dataset, metrics: { netPnl: 0, maximumDrawdown: 2 }, falsifierOutcome: { triggered: false } });
  const evaluation = (dataset) => identify({ type: "ReplayableStrategyEvaluation", version: 3, candidate: candidate.id, replayDataset: dataset, metrics: { netPnl: 2, maximumDrawdown: 2 }, falsifierOutcome: { triggered: false } });
  const observerOne = key(), observerTwo = key(), causalKey = key(), entropyKey = key(), tournamentKey = key(), promotionKey = key(), builderKey = key();
  const trustedActorKeys = {
    "urn:observer:one": observerOne.publicKey,
    "urn:observer:two": observerTwo.publicKey,
    "urn:assayer:causal": causalKey.publicKey,
    "urn:assayer:entropy": entropyKey.publicKey,
    "urn:witness:tournament": tournamentKey.publicKey,
  };
  return {
    candidate,
    incumbentEvaluations: [incumbent("dataset-a"), incumbent("dataset-b")],
    candidateEvaluations: [evaluation("dataset-a"), evaluation("dataset-b")],
    selectionPolicy: policy,
    evidenceObservations: [
      signed({ type: "StrategyEvidenceObservation", observerActor: "urn:observer:one", candidate: candidate.id, evidenceDigest: ni, verdict: "supports" }, observerOne.privateKey),
      signed({ type: "StrategyEvidenceObservation", observerActor: "urn:observer:two", candidate: candidate.id, evidenceDigest: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", verdict: "supports" }, observerTwo.privateKey),
    ],
    causalAssay: signed({ type: "CausalReplayBoundaryAssay", assayerActor: "urn:assayer:causal", candidate: candidate.id, noFutureLeakage: true, contractedBoundaryPresented: true, noSelfReachingEvent: true, eventOrderDigest: ni, boundaryPresentationDigest: ni }, causalKey.privateKey),
    entropyAssay: signed({ type: "EvidenceEntropyRelaxationAssay", assayerActor: "urn:assayer:entropy", candidate: candidate.id, relaxesVia: true, beforeEntropyRank: 2, afterEntropyRank: 1 }, entropyKey.privateKey),
    tournamentWitness: signed({ type: "StrategyVerificationTournamentWitness", witnessActor: "urn:witness:tournament", candidate: candidate.id, fixedPoint: true, pure: true, noProfitableDeviation: true, dialecticaWitnessSurvives: true, equilibriumMatchesSurvivor: true, allRefutationsAnswered: true, noDominantRefutation: true }, tournamentKey.privateKey),
    trustedActorKeys,
    promotionActor: "urn:promotion:actor",
    promotionPrivateKey: promotionKey.privateKey,
    proofBuilderActor: "urn:proof-builder:actor",
    proofBuilderPrivateKey: builderKey.privateKey,
  };
}

test("the established base64 strict-JSON proof carrier keeps its 0.2.3 token under SCIS 0.2.6", () => {
  const carrier = { encoding: "base64", bytes: "YWxwaGEtcHJvb2Ytc291cmNlCg==" };
  const legacyToken = "ni:///sha-256;kzqvFJGjyjpm0uRQnaOnnHkHzpgmnLjQYia6jCHgypw";
  assert.equal(identifyProofSourceCarrier(carrier), legacyToken);
  assert.deepEqual(verifyProofSourceCarrier({ carrier, token: legacyToken }), carrier);
});

test("proof-source carrier rejects malformed, tampered, and forged source claims", () => {
  const carrier = { encoding: "base64", bytes: "YWxwaGEtcHJvb2Ytc291cmNlCg==" };
  const token = identifyProofSourceCarrier(carrier);
  assert.throws(() => identifyProofSourceCarrier({ encoding: "base64", bytes: "not canonical base64!" }), /proof-source-carrier-invalid/);
  assert.throws(() => identifyProofSourceCarrier({ encoding: "base64", bytes: carrier.bytes, extra: true }), /proof-source-carrier-invalid/);
  assert.throws(() => verifyProofSourceCarrier({ carrier: { encoding: "base64", bytes: "dGFtcGVyZWQK" }, token }), /proof-source-token-mismatch/);
});

test("a forged signed proof input is rejected before proof execution", async () => {
  const input = validPromotionInput();
  input.evidenceObservations[0] = { ...input.evidenceObservations[0], candidate: "forged-candidate" };
  await assert.rejects(verifyPaperPromotionCertificate(input), /strategy-evidence-signed-content-invalid/);
});

test("independently signed evidence produces a paper-only promotion certificate", async () => {
  const certificate = await verifyPaperPromotionCertificate(validPromotionInput());
  assert.equal(certificate.type, "ObsmetrologiaPaperPromotionCertificate");
  assert.equal(certificate.paperPromotionEstablished, true);
  assert.equal(certificate.liveReadinessEstablished, false);
});
