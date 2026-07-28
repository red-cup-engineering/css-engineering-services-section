







export type {
  CommunicatingCarrier, CommunicationBoundaryDocument, CommunicationClaim, CommunicationToken,
} from "./carrier.mjs";
export type {
  Tier, Span, ContainmentEdge, SequenceEdge, ArticulateResult,
  Word, Arc, Entry, SpecializationEdge, Question, ConstrainedResult,
  DescentResult,
  ChargeValue, ChargeStatus,
  ParsedWord, ParsedArc, ParsedAnswer, FoldPath, FoldTower, ParseResult,
  ParseForestReading, ParseForest,
  CohomologyObstruction, CohomologyResult,
  BundleMeta, BundleLexicon, SuffixRule, BundleMorphology,
  PronounFeatures, BundleReference, BundleAttachment, BundleSegmentation,
  RawBundle, CompiledBundle,
} from "./types.mjs";
export type { Charge } from "./types.mjs";


export {
  admitCommunication,
  carrierOfUtterance,
  communicationMark,
  communicationDocument,
  isMark,
} from "./carrier.mjs";






export { articulateCommunication } from "./articulating.mjs";


export { parse, parseCommunication } from "./parsing.mjs";

export {
  parseCommunicationForest,
  parseForest,
  parseForestCarrier,
  parseForestFromArticulation,
  parseForestReadingCarrier,
  parseForestReadingSchema,
  parseForestSchema,
} from "./forest.mjs";

export {
  lambekForestProofCarrier,
  lambekForestProofSchema,
  lambekForestReadingProofCarrier,
  lambekForestReadingProofSchema,
  lambekProofOfForest,
} from "./lambek.mjs";
export type {
  LambekForestProof,
  LambekForestReadingProof,
  LambekHypothesis,
  LambekProofRule,
  LambekProofStep,
  LambekSequent,
} from "./lambek.mjs";





