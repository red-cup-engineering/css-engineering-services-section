/**
 * analysis/verification-tournament - finite certificate surface for
 * `RelMath.Gaming.VerificationTournament`.
 *
 * Lean keeps the runtime boundary honest: libp2p transport, global matchmaking,
 * and Dialectica game execution are supplied as finite transcript readings. This
 * module carries the part `relating` can compute: structural count equalities,
 * once-only uniqueness flags, survivor/equilibrium correspondence, and the
 * FOUR-closure fixed-point read used by the no-periodic-orbits theorem.
 */
import type { ChargeValueName } from "../../bilattice-charge.mjs";
import {
  applyChargeClosure,
  iterateChargeOperation,
  knowledgeJoinClosure,
  type ChargeClosureCarrier,
} from "../../closure-operator-fiber.mjs";

export type StrategyRole = "claim" | "refutation";

export interface Certificate {
  readonly kind: "verificationTournament.certificate";
  readonly noProfitableDeviation: boolean;
  readonly dialecticaWitnessSurvives: boolean;
  readonly equilibriumMatchesSurvivor: boolean;
}

export interface RuntimeObligations {
  readonly kind: "verificationTournament.runtimeObligations";
  readonly dialecticaObjectMap: boolean;
  readonly transportRosterWitnessed: boolean;
  readonly matchmakingOnceOnly: boolean;
  readonly strategyPlayWitnessed: boolean;
  readonly nashStable: boolean;
  readonly dialecticaWitnessSurvives: boolean;
  readonly equilibriumMatchesSurvivor: boolean;
}

export interface OperationalWitnesses {
  readonly kind: "verificationTournament.operationalWitnesses";
  readonly dialecticaObjectMap: boolean;
  readonly transportRosterWitnessed: boolean;
  readonly matchmakingOnceOnly: boolean;
  readonly strategyPlayWitnessed: boolean;
}

export interface StructuralOperationalReading {
  readonly kind: "verificationTournament.structuralOperationalReading";
  readonly claims: number;
  readonly refutations: number;
  readonly peers: number;
  readonly plays: number;
  readonly dialecticaWitnesses: number;
  readonly dialecticaChallenges: number;
  readonly transcriptMessages: number;
  readonly ticketedPeers: number;
  readonly matchedPlayers: number;
  readonly pairwiseMatches: number;
  readonly pairwiseStreams: number;
  readonly ticketsUnique: boolean;
  readonly matchedPlayersUnique: boolean;
  readonly matchedPlayersKnown: boolean;
}

export interface SurvivorReading {
  readonly kind: "verificationTournament.survivorReading";
  readonly settledStrategy: number;
  readonly survivingClaim: number;
  readonly settledRole: StrategyRole;
  readonly fixedPoint: boolean;
  readonly pure: boolean;
  readonly allRefutationsAnswered: boolean;
  readonly noDominantRefutation: boolean;
}

export interface SurvivorCorrespondenceWitness {
  readonly kind: "verificationTournament.survivorCorrespondence:witness";
  readonly reading: SurvivorReading;
  readonly nashNoDeviation: true;
  readonly dialecticaWitnessSurvives: true;
  readonly equilibriumMatchesSurvivor: true;
}

export interface SettledVerdictWitness {
  readonly kind: "verificationTournament.settledVerdict:witness";
  readonly closure: ChargeClosureCarrier;
  readonly seed: ChargeValueName;
  readonly period: number;
  readonly cycleReturns: true;
  readonly fixedPoint: true;
  readonly certificate: Certificate;
  readonly stableForSeed: true;
  readonly correspondsToSurvivor: true;
}

export interface RuntimeTournamentReceipt {
  readonly kind: "verificationTournament.receipt:witness";
  readonly structural: StructuralOperationalReading;
  readonly operational: OperationalWitnesses;
  readonly survivor: SurvivorReading;
  readonly survivorCorrespondence: SurvivorCorrespondenceWitness;
  readonly runtimeObligations: RuntimeObligations;
  readonly verdict: SettledVerdictWitness;
  readonly runtimeBoundary: "transport, matchmaking, and Dialectica execution are supplied transcript obligations";
}

const assertNatural = (value: number, caller: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a natural number`);
};

export function structuralOperationalReading(input: Omit<StructuralOperationalReading, "kind">): StructuralOperationalReading {
  for (const value of [
    input.claims,
    input.refutations,
    input.peers,
    input.plays,
    input.dialecticaWitnesses,
    input.dialecticaChallenges,
    input.transcriptMessages,
    input.ticketedPeers,
    input.matchedPlayers,
    input.pairwiseMatches,
    input.pairwiseStreams,
  ]) assertNatural(value, "structuralOperationalReading");
  return Object.freeze({ kind: "verificationTournament.structuralOperationalReading" as const, ...input });
}

export function survivorReading(input: Omit<SurvivorReading, "kind">): SurvivorReading {
  assertNatural(input.settledStrategy, "survivorReading");
  assertNatural(input.survivingClaim, "survivorReading");
  return Object.freeze({ kind: "verificationTournament.survivorReading" as const, ...input });
}

export const dialecticaObjectMapped = (reading: StructuralOperationalReading): boolean =>
  reading.dialecticaWitnesses === reading.claims && reading.dialecticaChallenges === reading.refutations;

export const transportRosterWitnessed = (reading: StructuralOperationalReading): boolean =>
  reading.transcriptMessages === reading.claims + reading.refutations + reading.plays;

export const matchmakingOnceOnly = (reading: StructuralOperationalReading): boolean =>
  reading.ticketedPeers === reading.peers
  && reading.matchedPlayers <= reading.peers
  && reading.ticketsUnique
  && reading.matchedPlayersUnique
  && reading.matchedPlayersKnown;

export const strategyPlayWitnessed = (reading: StructuralOperationalReading): boolean =>
  reading.pairwiseMatches === reading.plays && reading.pairwiseStreams === reading.plays;

export function operationalWitnessesOfStructuralReading(reading: StructuralOperationalReading): OperationalWitnesses {
  return Object.freeze({
    kind: "verificationTournament.operationalWitnesses" as const,
    dialecticaObjectMap: dialecticaObjectMapped(reading),
    transportRosterWitnessed: transportRosterWitnessed(reading),
    matchmakingOnceOnly: matchmakingOnceOnly(reading),
    strategyPlayWitnessed: strategyPlayWitnessed(reading),
  });
}

export const nashNoDeviation = (reading: SurvivorReading): boolean =>
  reading.fixedPoint && reading.pure && reading.noDominantRefutation;

export const dialecticaWitnessSurvives = (reading: SurvivorReading): boolean =>
  reading.settledRole === "claim"
  && reading.settledStrategy === reading.survivingClaim
  && reading.allRefutationsAnswered;

export const equilibriumMatchesSurvivor = (reading: SurvivorReading): boolean =>
  reading.fixedPoint && reading.pure && reading.settledStrategy === reading.survivingClaim;

export function survivorCorrespondenceOfUniqueDominantClaim(reading: SurvivorReading): SurvivorCorrespondenceWitness {
  const nashStable = nashNoDeviation(reading);
  const witnessSurvives = dialecticaWitnessSurvives(reading);
  const equilibriumMatches = equilibriumMatchesSurvivor(reading);
  if (!nashStable || !witnessSurvives || !equilibriumMatches) {
    throw new TypeError("survivorCorrespondenceOfUniqueDominantClaim: survivor reading does not settle a unique dominant claim");
  }
  return Object.freeze({
    kind: "verificationTournament.survivorCorrespondence:witness" as const,
    reading,
    nashNoDeviation: true as const,
    dialecticaWitnessSurvives: true as const,
    equilibriumMatchesSurvivor: true as const,
  });
}

export function runtimeObligationsOfReading(ops: OperationalWitnesses, reading: SurvivorReading): RuntimeObligations {
  return Object.freeze({
    kind: "verificationTournament.runtimeObligations" as const,
    dialecticaObjectMap: ops.dialecticaObjectMap,
    transportRosterWitnessed: ops.transportRosterWitnessed,
    matchmakingOnceOnly: ops.matchmakingOnceOnly,
    strategyPlayWitnessed: ops.strategyPlayWitnessed,
    nashStable: nashNoDeviation(reading),
    dialecticaWitnessSurvives: dialecticaWitnessSurvives(reading),
    equilibriumMatchesSurvivor: equilibriumMatchesSurvivor(reading),
  });
}

export function noPeriodicOrbitFixedPoint(
  closure: ChargeClosureCarrier,
  seed: ChargeValueName,
  period: number,
): boolean {
  assertNatural(period, "noPeriodicOrbitFixedPoint");
  if (period < 1) throw new RangeError("noPeriodicOrbitFixedPoint: period must be positive");
  return iterateChargeOperation((value) => applyChargeClosure(closure, value), seed, period) !== seed
    || applyChargeClosure(closure, seed) === seed;
}

export function settledVerdictOfClosureCertificate(
  closure: ChargeClosureCarrier,
  seed: ChargeValueName,
  period: number,
  certificate: Certificate,
): SettledVerdictWitness {
  const cycleReturns = iterateChargeOperation((value) => applyChargeClosure(closure, value), seed, period) === seed;
  const fixedPoint = noPeriodicOrbitFixedPoint(closure, seed, period);
  if (
    !cycleReturns
    || !fixedPoint
    || !certificate.noProfitableDeviation
    || !certificate.dialecticaWitnessSurvives
    || !certificate.equilibriumMatchesSurvivor
  ) {
    throw new TypeError("settledVerdictOfClosureCertificate: certificate obligations did not settle");
  }
  return Object.freeze({
    kind: "verificationTournament.settledVerdict:witness" as const,
    closure,
    seed,
    period,
    cycleReturns: true as const,
    fixedPoint: true as const,
    certificate,
    stableForSeed: true as const,
    correspondsToSurvivor: true as const,
  });
}

export function receipt(): RuntimeTournamentReceipt {
  const structural = structuralOperationalReading({
    claims: 2,
    refutations: 1,
    peers: 3,
    plays: 2,
    dialecticaWitnesses: 2,
    dialecticaChallenges: 1,
    transcriptMessages: 5,
    ticketedPeers: 3,
    matchedPlayers: 2,
    pairwiseMatches: 2,
    pairwiseStreams: 2,
    ticketsUnique: true,
    matchedPlayersUnique: true,
    matchedPlayersKnown: true,
  });
  const operational = operationalWitnessesOfStructuralReading(structural);
  const survivor = survivorReading({
    settledStrategy: 1,
    survivingClaim: 1,
    settledRole: "claim",
    fixedPoint: true,
    pure: true,
    allRefutationsAnswered: true,
    noDominantRefutation: true,
  });
  const survivorCorrespondence = survivorCorrespondenceOfUniqueDominantClaim(survivor);
  const runtimeObligations = runtimeObligationsOfReading(operational, survivor);
  if (
    !runtimeObligations.dialecticaObjectMap
    || !runtimeObligations.transportRosterWitnessed
    || !runtimeObligations.matchmakingOnceOnly
    || !runtimeObligations.strategyPlayWitnessed
  ) {
    throw new TypeError("verificationTournament.receipt: structural operational witnesses failed");
  }
  const verdict = settledVerdictOfClosureCertificate(
    knowledgeJoinClosure("potential"),
    "stable",
    1,
    Object.freeze({
      kind: "verificationTournament.certificate" as const,
      noProfitableDeviation: runtimeObligations.nashStable,
      dialecticaWitnessSurvives: runtimeObligations.dialecticaWitnessSurvives,
      equilibriumMatchesSurvivor: runtimeObligations.equilibriumMatchesSurvivor,
    }),
  );
  return Object.freeze({
    kind: "verificationTournament.receipt:witness" as const,
    structural,
    operational,
    survivor,
    survivorCorrespondence,
    runtimeObligations,
    verdict,
    runtimeBoundary: "transport, matchmaking, and Dialectica execution are supplied transcript obligations" as const,
  });
}
