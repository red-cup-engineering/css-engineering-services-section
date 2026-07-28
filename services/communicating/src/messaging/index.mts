/**
 * messaging - message passing as a communicating capability, downstream of
 * @red-cup-engineering/relating and grounded in the research corpus.
 *
 * A message is richer than an utterance: it is a linear resource produced by a
 * speaker, carried by a channel, and consumed once by a listener. The carriers
 * below are declared once as JSON-Schema literals in `carriers.mts`; this module
 * keeps the constructors and morphisms over those admitted carrier types.
 */
import { charge, chargeValue, valueOf, witnessedPotential, mark, type ChargeCarrier } from "@red-cup-engineering/relating";

import { semiosphere, type SemiosphereCarrier } from "../speaking/signifying/index.mjs";
import { admitCommunication, articulateCommunication } from "../speaking/listening/parsing/index.mjs";
import type { CompiledBundle } from "../speaking/listening/algebra/index.mjs";
import { read } from "../holography/index.mjs";

import type {
  ChannelCarrier,
  ListenerCarrier,
  MessageCarrier,
  SpeakerCarrier,
  UptakeCarrier,
} from "./carriers.mjs";

export {
  MessageStatusSchema,
  channelCarrier,
  listenerCarrier,
  messageCarrier,
  speakerCarrier,
  uptakeCarrier,
} from "./carriers.mjs";
export type {
  ChannelCarrier,
  ListenerCarrier,
  MessageCarrier,
  MessageStatus,
  SpeakerCarrier,
  UptakeCarrier,
} from "./carriers.mjs";

export {
  CLOUDEVENTS_DATA_CONTENT_TYPE,
  CLOUDEVENTS_JSON_CONTENT_TYPE,
  CLOUDEVENTS_SPECVERSION,
  cloudEventCarrier,
  cloudEventFromUtterance,
  cloudEventIllocutionaryForce,
  cloudEventSchema,
  utteranceFromCloudEvent,
} from "./cloudevents.mjs";
export type {
  CloudEvent,
  CloudEventOptions,
} from "./cloudevents.mjs";

export {
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
  openDIDCommMessage,
  openDIDCommUtterance,
  sealDIDCommMessage,
  sealDIDCommUtterance,
  utteranceFromDIDCommMessage,
} from "./didcomm.mjs";
export type {
  DIDCommPlaintextMessage,
  DIDCommSealedMessage,
  SealDIDCommOptions,
} from "./didcomm.mjs";

export {
  ACTIVITYPUB_C2S_CONTENT_TYPE,
  ACTIVITYSTREAMS_CONTEXT,
  DIDCOMM_PLAINTEXT_CONTENT_TYPE,
  acrossFaceProtocolMediaTypes,
  acrossFaceProtocolProjectors,
  activityPubC2sActivityCarrier,
  activityPubC2sActivitySchema,
  activityPubC2sProjector,
  cloudEventsProjector,
  didcommProjector,
  negateProtocolUtterance,
  protocolProjector,
  protocolTranslate,
  protocolWireProjector,
  readProtocolUtterances,
  socializingAcrossFaceLift,
  writeProtocolUtterances,
} from "./protocol-translate.mjs";
export type {
  AcrossFaceProtocol,
  ActivityPubC2sActivity,
  ProtocolTranslateOptions,
  ProtocolUtteranceCarrier,
  SocializingAcrossFaceLift,
} from "./protocol-translate.mjs";

/** Construct a speaker bound to a semiosphere. */
export const speaker = (name: string, within: SemiosphereCarrier = semiosphere(name)): SpeakerCarrier =>
  Object.freeze({ kind: "communicating.messaging.speaker" as const, name, semiosphere: within });

/** Construct a listener bound to a semiosphere. */
export const listener = (name: string, within: SemiosphereCarrier = semiosphere(name)): ListenerCarrier =>
  Object.freeze({ kind: "communicating.messaging.listener" as const, name, semiosphere: within });

/** Open a channel: a directed relation between two semiospheres. */
export function openChannel(
  medium: string,
  from: SemiosphereCarrier,
  to: SemiosphereCarrier,
  capacity: number | null = null,
): ChannelCarrier {
  return Object.freeze({ kind: "communicating.messaging.channel" as const, medium, from, to, capacity });
}

/** A channel for a speaker-to-listener pair, named for its medium. */
export const channelBetween = (
  medium: string,
  from: SpeakerCarrier,
  to: ListenerCarrier,
  capacity: number | null = null,
): ChannelCarrier => openChannel(medium, from.semiosphere, to.semiosphere, capacity);

/** Whether a channel admits a text without exceeding its capacity. */
export const withinCapacity = (channel: ChannelCarrier, text: string): boolean =>
  channel.capacity === null || text.length <= channel.capacity;

/** Send a message: the speaker extends a content into a linear resource in transit. */
export function sendMessage(
  speakerOf: SpeakerCarrier,
  listenerOf: ListenerCarrier,
  channel: ChannelCarrier,
  text: string,
  bundle: CompiledBundle,
): MessageCarrier {
  if (!withinCapacity(channel, text)) {
    throw new RangeError(`channel ${JSON.stringify(channel.medium)} capacity ${channel.capacity} cannot carry ${text.length} marks`);
  }
  return Object.freeze({
    kind: "communicating.messaging.message" as const,
    text,
    content: articulateCommunication(admitCommunication(text.trim()), bundle),
    speaker: speakerOf,
    listener: listenerOf,
    channel,
    status: "sent" as const,
    charge: witnessedPotential(mark(speakerOf.name)),
  });
}

/** Receive a message: the listener restricts and consumes the in-transit resource. */
export function receiveMessage(message: MessageCarrier, bundle: CompiledBundle): UptakeCarrier {
  if (message.status === "received") {
    throw new TypeError("receiveMessage: this message is a spent resource (already received once)");
  }
  return Object.freeze({
    kind: "communicating.messaging.uptake" as const,
    consumed: Object.freeze({ ...message, status: "received" as const, charge: charge(chargeValue("active")) }),
    reading: read(message.text.trim(), bundle),
    charge: charge(chargeValue("active")),
  });
}

/** The bilattice value name of a message's charge. */
export const messageChargeName = (message: MessageCarrier): string => valueOf(message.charge as ChargeCarrier).name;
