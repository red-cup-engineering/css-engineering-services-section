/**
 * @red-cup-engineering/communicating — communicating admitted through @red-cup-engineering/relating.
 *
 * The package root is the universal admission surface and the language-neutral
 * machinery: parsing, understanding, grammatical judgment, codecs, geometry, the
 * language algebra, signifying, grounding, illocuting, messaging, and the
 * `actions(bundle)` cocone factory. Every morphism that reads a language is
 * parameterized over a `CompiledBundle`; this package injects no bundle of its
 * own. Concrete languages — their bundles, realization, and prose conformance —
 * live in `@red-cup-engineering/communicating-in-<language>` packages downstream. The root
 * deliberately does not re-export subpaths as a namespace bag.
 */

import {
  admitCommunication,
  type CommunicatingCarrier,
  type CommunicationClaim,
  type CommunicationToken,
} from "./speaking/listening/parsing/index.mjs";

export type {
  CommunicatingCarrier,
  CommunicationBoundaryDocument,
  CommunicationClaim,
  CommunicationToken,
  ArticulateResult,
  LambekForestProof,
  LambekForestReadingProof,
  LambekHypothesis,
  LambekProofRule,
  LambekProofStep,
  LambekSequent,
  ParseForest,
  ParseForestReading,
  ParseResult,
} from "./speaking/listening/parsing/index.mjs";

export { actions } from "./communicate/actions.mjs";
export {
  codecActions,
  decodeCommunicationAction,
  articulateCommunicationAction,
  settleCommunicationAction,
} from "./communicate/codec-actions.mjs";
export {
  manifestActions,
  readLanguageChuReceiptAction,
  readLanguageDiscourseCoverReceiptAction,
  readLanguageLambekReceiptAction,
  readLanguageManifestAction,
  readLanguageManifestReceiptsAction,
  readLanguageWitnessJournalAction,
  readLanguageSoficReceiptAction,
} from "./communicate/manifest-actions.mjs";
export { communicateAction, semioseAction, memeActions, MEME_CARRIER_ID } from "./communicate/meme.mjs";
export {
  composeInputCarrier,
  groundInputCarrier,
  illocuteInputCarrier,
  listenInputCarrier,
  modalizeInputCarrier,
  presupposeInputCarrier,
  quoteInputCarrier,
  referInputCarrier,
  speakInputCarrier,
  translateInputCarrier,
} from "./communicate/carriers.mjs";
export type {
  ComposeInput,
  GroundInput,
  IllocuteInput,
  ListenInput,
  ModalizeInput,
  PresupposeInput,
  QuoteInput,
  ReferInput,
  SpeakInput,
  TranslateInput,
} from "./communicate/carriers.mjs";
export { communicatingFace, membraneMeme, COMMUNICATING_FACE_AXIS } from "./communicate/face.mjs";
export type { CommunicatingFace, TruthBelnap } from "./communicate/face.mjs";
export { cohereAction, discourseCohesionOf, type DiscourseCohesion, spacetimeAction, discourseSpacetimeOf, type DiscourseSpacetime, channelAction, channelInformationOf, type ChannelInformation } from "./communicate/cohesion.mjs";
export {
  morphismActions,
  speakAction,
  listenAction,
  illocuteAction,
  groundAction,
  translateAction,
  negateAction,
  conflateAction,
  referAction,
  modalizeAction,
  presupposeAction,
  quoteAction,
  composeAction,
} from "./communicate/morphisms/index.mjs";

export {
  projectReading,
  read,
  settle,
} from "./holography/index.mjs";
export type { Reading } from "./holography/index.mjs";

export {
  advanceSemiosis,
  semiosisStepCarrier,
  semiosphereBoundaryTranslationCarrier,
  semiosphereCarrier,
  semiosphere,
  signRelationCarrier,
  signRelation,
  translateAcrossSemiosphereBoundary,
} from "./speaking/signifying/index.mjs";
export type {
  SemiosisStepCarrier,
  SemiosphereBoundaryTranslation,
  SemiosphereCarrier,
  SignRelationCarrier,
} from "./speaking/signifying/index.mjs";

export {
  accommodateCommonGround,
  assertIntoCommonGround,
  challengeCommonGround,
  CommonGroundBasisSchema,
  commonGroundCarrier,
  commonGround,
  commonGroundPropositionCarrier,
  commonGroundProposition,
  commonGroundUpdateCarrier,
} from "./speaking/listening/grounding/index.mjs";
export type {
  CommonGroundBasis,
  CommonGroundCarrier,
  CommonGroundProposition,
  CommonGroundUpdate,
} from "./speaking/listening/grounding/index.mjs";

export {
  illocute,
  locute,
  performSpeechAct,
  perlocute,
  speechAct,
} from "./speaking/illocuting/index.mjs";
export type {
  IllocutionaryAct,
  IllocutionaryForce,
  LocutionaryAct,
  PerlocutionaryAct,
  SpeechActCarrier,
} from "./speaking/illocuting/index.mjs";

export {
  admitCommunication,
  articulateCommunication,
  carrierOfUtterance,
  communicationDocument,
  lambekForestProofCarrier,
  lambekForestProofSchema,
  lambekForestReadingProofCarrier,
  lambekForestReadingProofSchema,
  lambekProofOfForest,
  parseCommunicationForest,
  parseForest,
  parseForestCarrier,
  parseForestFromArticulation,
  parseForestReadingCarrier,
  parseForestReadingSchema,
  parseForestSchema,
  communicationMark,
  isMark,
  parseCommunication,
} from "./speaking/listening/parsing/index.mjs";

export {
  communicationObservation,
  communicationObservationCarrier,
  communicationObservations,
  communicationObservationSetCarrier,
  communicationTask,
  communicationTaskCarrier,
  observationsOfCommunication,
  taskCell as communicationTaskCell,
} from "./speaking/listening/observing/index.mjs";
export type {
  CommunicationObservation,
  CommunicationObservationSet,
  CommunicationTask,
  CommunicationTaskEvidence,
} from "./speaking/listening/observing/index.mjs";

export {
  chargeStatus,
  conjugate,
  fuse,
  grammarProfileFromLegacyBundle,
  implies,
  indefiniteArticle,
  languageRegisterFiber,
  languageRegisterFiberCarrier,
  languageRegisterFiberSchema,
  bundleFromLanguageManifest,
  chuManifestReceipt,
  compiledBundleFromLanguageManifest,
  discourseCoverManifestReceipt,
  lambekManifestReceipt,
  languageGrammarProfileCarrier,
  languageGrammarProfileSchema,
  languageManifestCarrier,
  languageManifestReceipts,
  languageManifestWitnessJournalRows,
  languageManifestSchema,
  lemma,
  load,
  loadLanguageManifest,
  loadLanguageManifestFile,
  morphotacticPatternRuleCarrier,
  morphotacticPatternRuleSchema,
  pluralize,
  registerFiberAxes,
  registerFiberDataSchema,
  registerFiberDegradationReceipt,
  translationFactorChainReceipt,
  soficManifestReceipt,
  translationFactorReceipt,
} from "./speaking/listening/algebra/index.mjs";
export type {
  BundleAttachment,
  BundleLexicon,
  BundleMeta,
  BundleMorphology,
  BundleReference,
  BundleSegmentation,
  ChargeStatus,
  ChuManifest,
  CompiledBundle,
  DiscourseCoverManifest,
  LambekManifest,
  LanguageGrammarProfile,
  LanguageManifest,
  LanguageManifestCarrier,
  LanguageManifestReceipt,
  LanguageRegisterFiber,
  MorphotacticPatternRule,
  PronounFeatures,
  RegisterAxisDegradationReceipt,
  RegisterFiberAxis,
  RegisterFiberData,
  RegisterFiberDegradationReceipt,
  RegisterFiberSelection,
  RawBundle,
  WitnessJournalLiteral,
  SoficManifest,
  SuffixRule,
  TranslationChargeMapEntry,
  TranslationFactorChainOptions,
  TranslationFactorChainReceipt,
  TranslationDegradationReceipt,
  TranslationFactorReceipt,
  TranslationRegisterDegradationOptions,
} from "./speaking/listening/algebra/index.mjs";

export {
  discourseInformationCarrier,
  discourseInformationOfState,
  discourseInformationSchema,
  discourseStateCarrier,
  discourseStateOfForest,
  discourseStateSchema,
  linkEntity,
  logicalForm,
  polarity,
  presuppositions,
  resolveReferences,
  roles,
  scope,
  temporal,
} from "./speaking/listening/understanding/index.mjs";
export type {
  AspectValue,
  DiscourseCommitment,
  DiscourseEntity,
  DiscourseInformation,
  DiscourseInformationChannel,
  DiscoursePresupposition,
  DiscourseReference,
  DiscourseRepair,
  DiscourseRepairKind,
  DiscourseState,
  DiscourseSurprisal,
  DiscourseTopic,
  EvidentialValue,
  LinkResult,
  LogicalFormNode,
  LogicalFormReading,
  LogicalFormResult,
  PolarityFrame,
  Presupposition,
  PresuppositionTrigger,
  Quantifier,
  ReferenceResolution,
  ReferenceResult,
  ScopeReading,
  ScopeResult,
  SemanticFrame,
  TemporalFrame,
  TenseValue,
  TriggerKind,
} from "./speaking/listening/understanding/index.mjs";

export { render, renderArcs } from "./speaking/listening/codecs/index.mjs";
export { similarity, similarPairsFrom } from "./speaking/listening/geometry/index.mjs";
export type { SimilarPair } from "./speaking/listening/geometry/index.mjs";
export { grammaticality } from "./speaking/listening/judging/grammaticality/index.mjs";
export type {
  GrammaticalityResult,
  GrammaticalityViolation,
} from "./speaking/listening/judging/grammaticality/index.mjs";

export {
  channelBetween,
  channelCarrier,
  CLOUDEVENTS_DATA_CONTENT_TYPE,
  CLOUDEVENTS_JSON_CONTENT_TYPE,
  CLOUDEVENTS_SPECVERSION,
  cloudEventCarrier,
  cloudEventFromUtterance,
  cloudEventIllocutionaryForce,
  cloudEventSchema,
  DIDCOMM_CONTEXT,
  DIDCOMM_ENCRYPTED_TYP,
  DIDCOMM_JWM_ALG,
  DIDCOMM_JWM_ENC,
  DIDCOMM_PRIVATE_VISIBILITY,
  DID_CONTEXT,
  didcommMessageFromUtterance,
  didcommPlaintextMessageCarrier,
  didcommPlaintextMessageSchema,
  didcommSealedMessageCarrier,
  didcommSealedMessageSchema,
  didcommVisibility,
  listener,
  listenerCarrier,
  MessageStatusSchema,
  ACTIVITYPUB_C2S_CONTENT_TYPE,
  ACTIVITYSTREAMS_CONTEXT,
  messageCarrier,
  DIDCOMM_PLAINTEXT_CONTENT_TYPE,
  acrossFaceProtocolMediaTypes,
  acrossFaceProtocolProjectors,
  activityPubC2sActivityCarrier,
  activityPubC2sActivitySchema,
  activityPubC2sProjector,
  openDIDCommMessage,
  openDIDCommUtterance,
  openChannel,
  receiveMessage,
  cloudEventsProjector,
  didcommProjector,
  negateProtocolUtterance,
  protocolProjector,
  protocolTranslate,
  protocolWireProjector,
  readProtocolUtterances,
  sealDIDCommMessage,
  sealDIDCommUtterance,
  sendMessage,
  speaker,
  speakerCarrier,
  socializingAcrossFaceLift,
  uptakeCarrier,
  utteranceFromCloudEvent,
  utteranceFromDIDCommMessage,
  withinCapacity,
  messageChargeName,
  writeProtocolUtterances,
} from "./messaging/index.mjs";
export type {
  AcrossFaceProtocol,
  ActivityPubC2sActivity,
  ChannelCarrier,
  CloudEvent,
  CloudEventOptions,
  DIDCommPlaintextMessage,
  DIDCommSealedMessage,
  ListenerCarrier,
  MessageCarrier,
  MessageStatus,
  ProtocolTranslateOptions,
  ProtocolUtteranceCarrier,
  SealDIDCommOptions,
  SocializingAcrossFaceLift,
  SpeakerCarrier,
  UptakeCarrier,
} from "./messaging/index.mjs";

export type CommunicationAction = "communicating.admit";

export interface CommunicationAdmission {
  readonly action: CommunicationAction;
  readonly carrier: CommunicatingCarrier;
}

/**
 * Admit a communicating act into the relating substrate.
 *
 * Domain: `communicating.admit x token x claim?`, where boundary strings are
 * decoded documents and Mark inputs are already admitted relating carriers.
 * Codomain: a communicating carrier whose utterance descends to Mark/Utterance.
 * Law: all communication normalizes through `Mark -> Utterance -> articulate`;
 * no text span, parse result, or grammatical reading is primitive at the root.
 */
export function communicate(
  action: CommunicationAction,
  token: CommunicationToken,
  claim?: CommunicationClaim,
): CommunicationAdmission {
  if (action !== "communicating.admit") {
    throw new TypeError(`communicate: unsupported action ${JSON.stringify(action)}`);
  }
  return Object.freeze({
    action,
    carrier: admitCommunication(token, claim),
  });
}
