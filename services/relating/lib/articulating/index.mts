/**
 * articulating — the base object surface of the category of relating.
 *
 * A Mark is opaque; a Token and Claim carry Marks; an Utterance pairs them; and
 * `articulate` opens the aperiodic articulation category at its potential cell.
 * Every public morphism downstream normalizes back through this surface.
 */
export {
  Mark,
  Token,
  Claim,
  mark,
  token,
  claim,
  markKinds,
  isMarkKind,
  markKindTwoKinds,
  tokenNeClaim,
  utterance,
  articulatingUtter,
  articulatingPair,
  articulatingHead,
  articulatingDepth,
  articulatingFloor,
  articulatingUtterNePair,
  utteranceSchema,
  articulate,
  articulationCellSchema,
  tokenIdentity,
  claimIdentity,
  isArticulationCell,
  isMark,
} from "./utterance.mjs";
export type {
  UtteranceCarrier,
  TokenArticulationSlot,
  ClaimArticulationSlot,
  AperiodicArticulationPairing,
  MarkKind,
  AperiodicArticulationCell,
  PotentialAperiodicArticulationCell,
  ArticulationCell,
  ArticulatingUtter,
  ArticulatingPair,
  Articulating,
  MarkCoincidenceWitness,
  MarkCoincidenceObstruction,
  TokenIdentityJudgment,
  ClaimIdentityJudgment,
} from "./utterance.mjs";
export { coincides } from "./utterance.mjs";
export {
  fourCornerNames,
  cornerOfStatus,
  statusOfCorner,
  chargeNameOfCorner,
  readFourCorner,
  fourCornerOfArticulationCell,
  fourCornerCellReceipt,
} from "./four-corner-cell.mjs";
export type {
  FourCornerName,
  FourCornerChargeAlias,
  FourCornerStatus,
  FourCornerReading,
  FourCornerCellReceipt,
} from "./four-corner-cell.mjs";

export * as predicating from "./predicating/index.mjs";
