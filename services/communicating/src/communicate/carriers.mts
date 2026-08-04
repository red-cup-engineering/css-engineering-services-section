import { carrierFrom, type FromSchema, type Meme } from "@red-cup-engineering/relating";

const memeSlot = {
  $ref: "relating/articulating/predicating/positing/meme",
  description: "A relating meme carrier.",
} as const;
const jsonSlot = {} as const;

const withMeme = {
  meme: memeSlot,
} as const;

export const speakInputSchema = {
  $id: "communicating/communicate/speak-input",
  type: "object",
  required: ["meme", "speaker"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    speaker: { type: "string" },
    listener: { type: "string" },
    medium: { type: "string" },
    capacity: { type: "number" },
  },
} as const;
export const speakInputCarrier = carrierFrom(speakInputSchema);

export const listenInputSchema = {
  $id: "communicating/communicate/listen-input",
  type: "object",
  required: ["meme", "listener"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    listener: { type: "string" },
  },
} as const;
export const listenInputCarrier = carrierFrom(listenInputSchema);

export const groundInputSchema = {
  $id: "communicating/communicate/ground-input",
  type: "object",
  required: ["meme", "partner", "mode"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    partner: { type: "string" },
    mode: { enum: ["assertion", "accommodation", "challenge"] },
  },
} as const;
export const groundInputCarrier = carrierFrom(groundInputSchema);

export const composeInputSchema = {
  $id: "communicating/communicate/compose-input",
  type: "object",
  required: ["meme", "with"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    with: memeSlot,
  },
} as const;
export const composeInputCarrier = carrierFrom(composeInputSchema);

export const illocuteInputSchema = {
  $id: "communicating/communicate/illocute-input",
  type: "object",
  required: ["meme", "force"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    force: { enum: ["assertive", "directive", "commissive", "expressive", "declaration"] },
    goal: { type: "string" },
    perlocution: { type: "string" },
  },
} as const;
export const illocuteInputCarrier = carrierFrom(illocuteInputSchema);

export const modalizeInputSchema = {
  $id: "communicating/communicate/modalize-input",
  type: "object",
  required: ["meme", "mode", "witness"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    mode: { type: "string" },
    witness: { type: "string" },
  },
} as const;
export const modalizeInputCarrier = carrierFrom(modalizeInputSchema);

export const presupposeInputSchema = {
  $id: "communicating/communicate/presuppose-input",
  type: "object",
  required: ["meme", "trigger"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    trigger: { type: "string" },
  },
} as const;
export const presupposeInputCarrier = carrierFrom(presupposeInputSchema);

export const quoteInputSchema = {
  $id: "communicating/communicate/quote-input",
  type: "object",
  required: ["meme", "position"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    position: { enum: ["subject", "object"] },
  },
} as const;
export const quoteInputCarrier = carrierFrom(quoteInputSchema);

export const referInputSchema = {
  $id: "communicating/communicate/refer-input",
  type: "object",
  required: ["meme", "position", "entity"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    position: { enum: ["subject", "object"] },
    entity: jsonSlot,
  },
} as const;
export const referInputCarrier = carrierFrom(referInputSchema);

export const translateInputSchema = {
  $id: "communicating/communicate/translate-input",
  type: "object",
  required: ["meme", "target"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    target: { type: "string", minLength: 1 },
  },
} as const;
export const translateInputCarrier = carrierFrom(translateInputSchema);

type WithMeme<T> = Omit<T, "meme"> & { readonly meme: Meme };

export type SpeakInput = WithMeme<FromSchema<typeof speakInputSchema>>;
export type ListenInput = WithMeme<FromSchema<typeof listenInputSchema>>;
export type GroundInput = WithMeme<FromSchema<typeof groundInputSchema>>;
export type ComposeInput = WithMeme<Omit<FromSchema<typeof composeInputSchema>, "with">> & { readonly with: Meme };
export type IllocuteInput = WithMeme<FromSchema<typeof illocuteInputSchema>>;
export type ModalizeInput = WithMeme<FromSchema<typeof modalizeInputSchema>>;
export type PresupposeInput = WithMeme<FromSchema<typeof presupposeInputSchema>>;
export type QuoteInput = WithMeme<FromSchema<typeof quoteInputSchema>>;
export type ReferInput = WithMeme<FromSchema<typeof referInputSchema>>;
export type TranslateInput = WithMeme<FromSchema<typeof translateInputSchema>>;
