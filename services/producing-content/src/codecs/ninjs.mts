/**
 * @red-cup-engineering/producing-content/codecs/ninjs - IPTC ninjs artifact codecs.
 *
 * Producing-content forms ninjs records as mill artifacts. The record follows
 * the IPTC field vocabulary; the artifact wrapper is a TypeBox/IR-visible
 * carrier that can be stored, served, and related by downstream packages.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export const IptcCodeSchema = { $id: "producing-content/codecs/ninjs/iptc-code", title: "IptcCode", additionalProperties: false, type: "object", required: ["name"], properties: { code: { minLength: 1, type: "string" }, name: { minLength: 1, type: "string" }, scheme: { minLength: 1, type: "string" } } } as const;

export const NinjsPersonSchema = { $id: "producing-content/codecs/ninjs/person", title: "NinjsPerson", additionalProperties: false, type: "object", required: ["name"], properties: { name: { minLength: 1, type: "string" }, uri: { minLength: 1, type: "string" }, literal: { minLength: 1, type: "string" } } } as const;

export const NinjsBodySchema = { $id: "producing-content/codecs/ninjs/body", title: "NinjsBody", additionalProperties: false, type: "object", properties: { text: { type: "string" }, html: { type: "string" } } } as const;

export const NewsCodecArtifactSchema = { $id: "producing-content/codecs/ninjs/news-codec-artifact", title: "NewsCodecArtifact", additionalProperties: false, type: "object", required: ["kind", "codec", "mediaType", "subject", "uri", "record"], properties: { kind: { const: "producing-content.ninjs-artifact" }, codec: { const: "ninjs" }, mediaType: { const: "application/vnd.iptc.ninjs+json" }, subject: { minLength: 1, type: "string" }, uri: { minLength: 1, type: "string" }, record: { type: "object", additionalProperties: {} } } } as const;

export type IptcCode = FromSchema<typeof IptcCodeSchema>;
export type NinjsPerson = FromSchema<typeof NinjsPersonSchema>;
export type NinjsBody = FromSchema<typeof NinjsBodySchema>;

export type NinjsArticleInput = Readonly<{
  uri: string;
  guid?: string;
  title: string;
  description?: string;
  body?: NinjsBody;
  by?: readonly NinjsPerson[] | readonly string[] | string;
  language?: string;
  firstCreated?: string;
  versionCreated?: string;
  pubStatus?: string;
  subjects?: readonly IptcCode[] | readonly string[];
  genres?: readonly IptcCode[] | readonly string[];
  services?: readonly IptcCode[] | readonly string[];
  organizations?: readonly IptcCode[] | readonly string[];
  extra?: Readonly<Record<string, JsonValue>>;
}>;

export type NinjsArticle = Readonly<{
  uri: string;
  guid: string;
  type: "text";
  version: string;
  title: string;
  description_text?: string;
  body_text?: string;
  body_html?: string;
  by?: readonly NinjsPerson[];
  language: string;
  firstcreated?: string;
  versioncreated?: string;
  pubstatus: string;
  subject?: readonly IptcCode[];
  genre?: readonly IptcCode[];
  service?: readonly IptcCode[];
  organisation?: readonly IptcCode[];
} & Readonly<Record<string, JsonValue | readonly NinjsPerson[] | readonly IptcCode[] | undefined>>>;

export type NewsCodecArtifact = FromSchema<typeof NewsCodecArtifactSchema> & Readonly<{
  record: NinjsArticle;
}>;

export const NINJS_VERSION = "http://www.iptc.org/std/ninjs/2.1/";
export const NINJS_MEDIA_TYPE = "application/vnd.iptc.ninjs+json";

export const iptcCodeCarrier = carrierFrom(IptcCodeSchema);

export const ninjsPersonCarrier = carrierFrom(NinjsPersonSchema);

export const newsCodecArtifactCarrier = carrierFrom(NewsCodecArtifactSchema);

export function createNinjsArticle(input: NinjsArticleInput): NinjsArticle {
  const uri = absoluteHttpUrl(input.uri, "ninjs.uri");
  const guid = stringValue(input.guid) ?? uri;
  const title = requiredString(input.title, "ninjs.title");
  const firstCreated = isoString(input.firstCreated, "ninjs.firstCreated");
  const versionCreated = isoString(input.versionCreated, "ninjs.versionCreated");
  const article: Record<string, JsonValue | readonly NinjsPerson[] | readonly IptcCode[] | undefined> = {
    uri,
    guid,
    type: "text",
    version: NINJS_VERSION,
    title,
    language: input.language ?? "en",
    pubstatus: input.pubStatus ?? "usable",
    ...(stringValue(input.description) === undefined ? {} : { description_text: stringValue(input.description)! }),
    ...(stringValue(input.body?.text) === undefined ? {} : { body_text: stringValue(input.body?.text)! }),
    ...(stringValue(input.body?.html) === undefined ? {} : { body_html: stringValue(input.body?.html)! }),
    ...(normalizePeople(input.by).length === 0 ? {} : { by: normalizePeople(input.by) }),
    ...(firstCreated === undefined ? {} : { firstcreated: firstCreated }),
    ...(versionCreated === undefined ? {} : { versioncreated: versionCreated }),
    ...(normalizeCodes(input.subjects).length === 0 ? {} : { subject: normalizeCodes(input.subjects) }),
    ...(normalizeCodes(input.genres).length === 0 ? {} : { genre: normalizeCodes(input.genres) }),
    ...(normalizeCodes(input.services).length === 0 ? {} : { service: normalizeCodes(input.services) }),
    ...(normalizeCodes(input.organizations).length === 0 ? {} : { organisation: normalizeCodes(input.organizations) }),
    ...(input.extra ?? {}),
  };
  return Object.freeze(article as NinjsArticle);
}

export function createNinjsArtifact(subject: string, input: NinjsArticleInput): NewsCodecArtifact {
  const record = createNinjsArticle(input);
  return newsCodecArtifactCarrier.assert({
    kind: "producing-content.ninjs-artifact" as const,
    codec: "ninjs" as const,
    mediaType: NINJS_MEDIA_TYPE,
    subject: requiredString(subject, "ninjs.subject"),
    uri: record.uri,
    record,
  }, "ninjs news codec artifact") as NewsCodecArtifact;
}

export function serializeNewsArtifact(artifact: Pick<NewsCodecArtifact, "record">): string {
  return `${JSON.stringify(artifact.record)}\n`;
}

export function assertNinjsArticle(value: unknown): asserts value is NinjsArticle {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("ninjs record must be an object");
  const record = value as Record<string, unknown>;
  requiredString(record.uri, "ninjs.uri");
  requiredString(record.guid, "ninjs.guid");
  if (record.type !== "text") throw new TypeError("ninjs.type must be text");
  if (record.version !== NINJS_VERSION) throw new TypeError("ninjs.version is unsupported");
  requiredString(record.title, "ninjs.title");
}

export function newsCodecArtifactTerm(input: NewsCodecArtifact): Tm {
  return carrierToTerm(jsonResource(newsCodecArtifactCarrier.assert(input), "ninjs news codec artifact"));
}

export function ninjsArtifactTerm(input: NewsCodecArtifact): Tm {
  return newsCodecArtifactTerm(input);
}

function normalizePeople(value: NinjsArticleInput["by"]): readonly NinjsPerson[] {
  if (value === undefined) return Object.freeze([]);
  const values = Array.isArray(value) ? value : [value];
  return Object.freeze(values.flatMap((entry): NinjsPerson[] => {
    if (typeof entry === "string") return entry.trim() ? [Object.freeze({ name: entry.trim() })] : [];
    const name = entry.name.trim();
    if (!name) return [];
    return [ninjsPersonCarrier.assert({
      name,
      ...(entry.uri ? { uri: entry.uri } : {}),
      ...(entry.literal ? { literal: entry.literal } : {}),
    }, "ninjs person")];
  }));
}

function normalizeCodes(value: NinjsArticleInput["subjects"]): readonly IptcCode[] {
  if (value === undefined) return Object.freeze([]);
  return Object.freeze(value.flatMap((entry): IptcCode[] => {
    if (typeof entry === "string") return entry.trim() ? [Object.freeze({ name: entry.trim() })] : [];
    const name = entry.name.trim();
    if (!name) return [];
    return [iptcCodeCarrier.assert({
      name,
      ...(entry.code ? { code: entry.code } : {}),
      ...(entry.scheme ? { scheme: entry.scheme } : {}),
    }, "iptc code")];
  }));
}

function absoluteHttpUrl(value: string, path: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError();
    return url.href;
  } catch {
    throw new TypeError(`${path} must be an absolute http(s) URL`);
  }
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
  return value.trim();
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function isoString(value: unknown, path: string): string | undefined {
  const text = stringValue(value);
  if (text === undefined) return undefined;
  if (Number.isNaN(Date.parse(text))) throw new TypeError(`${path} must be an ISO-like date string`);
  return text;
}
