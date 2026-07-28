import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import type { SemiosphereCarrier } from "../speaking/signifying/index.mjs";

export const speakerSchema = {
  $id: "communicating/messaging/speaker",
  title: "SpeakerCarrier",
  description: "The extending endpoint of a channel, bound to a semiosphere.",
  type: "object",
  required: ["kind", "name", "semiosphere"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.messaging.speaker" },
    name: { type: "string" },
    semiosphere: {},
  },
} as const;
export const speakerCarrier = carrierFrom(speakerSchema);

export type SpeakerCarrier = Omit<FromSchema<typeof speakerSchema>, "semiosphere"> & {
  readonly semiosphere: SemiosphereCarrier;
};

export const listenerSchema = {
  $id: "communicating/messaging/listener",
  title: "ListenerCarrier",
  description: "The restricting endpoint of a channel, bound to a semiosphere.",
  type: "object",
  required: ["kind", "name", "semiosphere"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.messaging.listener" },
    name: { type: "string" },
    semiosphere: {},
  },
} as const;
export const listenerCarrier = carrierFrom(listenerSchema);

export type ListenerCarrier = Omit<FromSchema<typeof listenerSchema>, "semiosphere"> & {
  readonly semiosphere: SemiosphereCarrier;
};

export const channelSchema = {
  $id: "communicating/messaging/channel",
  title: "ChannelCarrier",
  description: "A directed relation between semiospheres with an optional capacity.",
  type: "object",
  required: ["kind", "medium", "from", "to", "capacity"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.messaging.channel" },
    medium: { type: "string" },
    from: {},
    to: {},
    capacity: { type: ["integer", "null"] },
  },
} as const;
export const channelCarrier = carrierFrom(channelSchema);

export type ChannelCarrier = Omit<FromSchema<typeof channelSchema>, "from" | "to"> & {
  readonly from: SemiosphereCarrier;
  readonly to: SemiosphereCarrier;
};

export const MessageStatusSchema = { enum: ["sent", "received"] } as const;
export type MessageStatus = FromSchema<typeof MessageStatusSchema>;

export const messageSchema = {
  $id: "communicating/messaging/message",
  title: "MessageCarrier",
  description: "A message placed in transit on a channel and tracked as a once-consumed linear resource.",
  type: "object",
  required: ["kind", "text", "content", "speaker", "listener", "channel", "status", "charge"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.messaging.message" },
    text: { type: "string" },
    content: {},
    speaker: {},
    listener: {},
    channel: {},
    status: MessageStatusSchema,
    charge: {},
  },
} as const;
export const messageCarrier = carrierFrom(messageSchema);

export type MessageCarrier = Omit<FromSchema<typeof messageSchema>, "speaker" | "listener" | "channel"> & {
  readonly speaker: SpeakerCarrier;
  readonly listener: ListenerCarrier;
  readonly channel: ChannelCarrier;
};

export const uptakeSchema = {
  $id: "communicating/messaging/uptake",
  title: "UptakeCarrier",
  description: "A listener's uptake: the settled record of restricting an in-transit message.",
  type: "object",
  required: ["kind", "consumed", "reading", "charge"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.messaging.uptake" },
    consumed: {},
    reading: {},
    charge: {},
  },
} as const;
export const uptakeCarrier = carrierFrom(uptakeSchema);

export type UptakeCarrier = Omit<FromSchema<typeof uptakeSchema>, "consumed"> & {
  readonly consumed: MessageCarrier;
};
