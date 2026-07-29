/**
 * circulation - reader-return channel carriers.
 *
 * Circulation is the reader-return surface. The mill owns the channel packet;
 * a site owns the masthead and route where those channels are mounted.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const CirculationChannelKindSchema = { anyOf: [{ const: "rss" }, { const: "atom" }, { const: "json-feed" }] } as const;

export const CirculationChannelSchema = { $id: "producing-content/content-mill/circulation-channel", title: "CirculationChannel", additionalProperties: false, type: "object", required: ["kind", "title", "href", "mediaType"], properties: { kind: CirculationChannelKindSchema, title: { minLength: 1, type: "string" }, href: { minLength: 1, type: "string" }, mediaType: { minLength: 1, type: "string" } } } as const;

export const CirculationReadingSchema = { $id: "producing-content/content-mill/circulation-reading", title: "CirculationReading", additionalProperties: false, type: "object", required: ["kind", "channels", "identifierPolicy"], properties: { kind: { const: "producing-content.circulation-reading" }, channels: { type: "array", items: CirculationChannelSchema }, identifierPolicy: { const: "none" } } } as const;

export type CirculationChannelKind = FromSchema<typeof CirculationChannelKindSchema>;
export type CirculationChannel = FromSchema<typeof CirculationChannelSchema>;
export type CirculationReading = FromSchema<typeof CirculationReadingSchema>;

export const circulationChannelCarrier = carrierFrom(CirculationChannelSchema);

export const circulationReadingCarrier = carrierFrom(CirculationReadingSchema);

export function circulationChannel(input: CirculationChannel): CirculationChannel {
  return circulationChannelCarrier.assert(input, "circulation channel");
}

export function circulationReading(input: Readonly<{
  channels: readonly CirculationChannel[];
  identifierPolicy?: "none";
}>): CirculationReading {
  return circulationReadingCarrier.assert({
    kind: "producing-content.circulation-reading" as const,
    channels: input.channels.map((channel) => circulationChannel(channel)),
    identifierPolicy: input.identifierPolicy ?? "none",
  }, "circulation reading");
}

export function feedNativeCirculationReading(input: Readonly<{
  siteUrl: string;
}>): CirculationReading {
  const base = input.siteUrl.replace(/\/$/, "");
  return circulationReading({
    channels: [
      circulationChannel({ kind: "rss", title: "RSS", href: `${base}/feed.xml`, mediaType: "application/rss+xml" }),
      circulationChannel({ kind: "atom", title: "Atom", href: `${base}/feed.atom`, mediaType: "application/atom+xml" }),
      circulationChannel({ kind: "json-feed", title: "JSON Feed", href: `${base}/feed.json`, mediaType: "application/feed+json" }),
    ],
    identifierPolicy: "none",
  });
}

export function circulationChannelTerm(input: CirculationChannel): Tm {
  return carrierToTerm(jsonResource(circulationChannelCarrier.assert(input), "circulation channel"));
}

export function circulationReadingTerm(input: CirculationReading): Tm {
  return carrierToTerm(jsonResource(circulationReadingCarrier.assert(input), "circulation reading"));
}
