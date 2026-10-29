/**
 * manuscripts - draft-manuscript operator packets.
 *
 * The farm owns the reusable admission/result vocabulary for creating draft
 * manuscripts. A site still owns how that packet is projected into its local
 * content store and front-matter dialect.
 */
import type { CslItem } from "../codecs/references.mjs";
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const CslReferenceRecordSchema = { title: "CslReferenceRecord", type: "object", additionalProperties: {} } as const;

export const CreateDraftManuscriptInputSchema = { $id: "producing-content/content-farm/draft-manuscript/create-input", title: "CreateDraftManuscriptInput", additionalProperties: false, type: "object", required: ["title", "summary", "body", "seoTerm", "beat", "references"], properties: { title: { minLength: 1, type: "string" }, summary: { minLength: 1, type: "string" }, body: { minLength: 1, type: "string" }, seoTerm: { minLength: 1, type: "string" }, beat: { minLength: 1, type: "string" }, references: { minItems: 1, type: "array", items: CslReferenceRecordSchema }, tags: { type: "array", items: { minLength: 1, type: "string" } }, category: { minLength: 1, type: "string" }, slug: { minLength: 1, type: "string" }, date: { minLength: 1, type: "string" }, license: { minLength: 1, type: "string" }, licenseUrl: { minLength: 1, type: "string" }, syndicationRights: { minLength: 1, type: "string" }, assignmentId: { minLength: 1, type: "string" } } } as const;

export const CreateAssignmentDraftInputSchema = { $id: "producing-content/content-farm/assignment-draft/create-input", title: "CreateAssignmentDraftInput", additionalProperties: false, type: "object", required: ["title", "summary", "body"], properties: { title: { minLength: 1, type: "string" }, summary: { minLength: 1, type: "string" }, body: { minLength: 1, type: "string" }, references: { type: "array", items: CslReferenceRecordSchema }, tags: { type: "array", items: { minLength: 1, type: "string" } }, category: { minLength: 1, type: "string" }, slug: { minLength: 1, type: "string" }, date: { minLength: 1, type: "string" }, license: { minLength: 1, type: "string" }, licenseUrl: { minLength: 1, type: "string" }, syndicationRights: { minLength: 1, type: "string" } } } as const;

export const CreateDraftManuscriptResultSchema = { $id: "producing-content/content-farm/draft-manuscript/created", title: "CreateDraftManuscriptResult", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "draft", "title", "wordCount", "referenceCount", "license", "licenseUrl", "syndicationRights"], properties: { kind: { const: "producing-content.draft-manuscript.created" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, draft: { const: true }, title: { minLength: 1, type: "string" }, wordCount: { minimum: 0, type: "number" }, referenceCount: { minimum: 0, type: "number" }, license: { minLength: 1, type: "string" }, licenseUrl: { minLength: 1, type: "string" }, syndicationRights: { minLength: 1, type: "string" } } } as const;

export type CslReferenceRecord = CslItem;
export type CreateDraftManuscriptInput = Readonly<Omit<FromSchema<typeof CreateDraftManuscriptInputSchema>, "references" | "tags"> & {
  references: readonly CslItem[];
  tags?: readonly string[];
}>;
export type CreateAssignmentDraftInput = Readonly<Omit<FromSchema<typeof CreateAssignmentDraftInputSchema>, "references" | "tags"> & {
  references?: readonly CslItem[];
  tags?: readonly string[];
}>;
export type CreateDraftManuscriptResult = FromSchema<typeof CreateDraftManuscriptResultSchema>;

export const createDraftManuscriptInputCarrier = carrierFrom(CreateDraftManuscriptInputSchema);

export const createAssignmentDraftInputCarrier = carrierFrom(CreateAssignmentDraftInputSchema);

export const createDraftManuscriptResultCarrier = carrierFrom(CreateDraftManuscriptResultSchema);

export const createDraftManuscriptJsonSchema = CreateDraftManuscriptInputSchema;
export const createAssignmentDraftJsonSchema = CreateAssignmentDraftInputSchema;

const URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireText(value, field);
}

function textArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  const out = value.map((item, index) => requireText(item, `${field}[${index}]`));
  if (out.length === 0) throw new TypeError(`${field} must not be empty`);
  return out;
}

function optionalTextArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  return textArray(value, field);
}

function optionalRecordText(record: Readonly<Record<string, unknown>>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
}

function referenceUrl(reference: Readonly<Record<string, unknown>>): string | undefined {
  return optionalRecordText(reference, ["URL", "url"]);
}

function referenceRecords(value: unknown, field = "references", minimum = 1): CslReferenceRecord[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new TypeError(minimum > 0
      ? `${field} must be a non-empty array of CSL reference objects`
      : `${field} must be an array of CSL reference objects`);
  }
  return value.map((item, index) => {
    if (!isRecord(item)) throw new TypeError(`${field}[${index}] must be a CSL reference object`);
    if (optionalRecordText(item, ["id"]) === undefined) throw new TypeError(`${field}[${index}] must carry a CSL id`);
    if (optionalRecordText(item, ["type"]) === undefined) throw new TypeError(`${field}[${index}] must carry a CSL type`);
    if (optionalRecordText(item, ["key", "citation-key", "citation_key"]) !== undefined) throw new TypeError(`${field}[${index}] must use CSL id, not key`);
    const url = referenceUrl(item);
    if (url !== undefined && !URL_PATTERN.test(url)) throw new TypeError(`${field}[${index}] URL must be an http(s) URL`);
    return { ...item } as CslItem;
  });
}

export function normalizeCreateDraftManuscriptInput(input: unknown): CreateDraftManuscriptInput {
  if (!isRecord(input)) throw new TypeError("draft manuscript input must be a JSON object");
  const title = requireText(input["title"], "title");
  const summary = requireText(input["summary"], "summary");
  const body = requireText(input["body"], "body");
  const seoTerm = requireText(input["seoTerm"], "seoTerm");
  const beat = requireText(input["beat"], "beat");
  const references = referenceRecords(input["references"]);
  const tags = optionalTextArray(input["tags"], "tags");
  const category = optionalText(input["category"], "category");
  const slug = optionalText(input["slug"], "slug");
  const date = optionalText(input["date"], "date");
  const license = optionalText(input["license"], "license");
  const licenseUrl = optionalText(input["licenseUrl"], "licenseUrl");
  if (licenseUrl !== undefined && !URL_PATTERN.test(licenseUrl)) throw new TypeError("licenseUrl must be an http(s) URL");
  const syndicationRights = optionalText(input["syndicationRights"], "syndicationRights");
  const assignmentId = optionalText(input["assignmentId"], "assignmentId");
  return createDraftManuscriptInputCarrier.assert({
    title,
    summary,
    body,
    seoTerm,
    beat,
    references,
    ...(tags === undefined ? {} : { tags }),
    ...(category === undefined ? {} : { category }),
    ...(slug === undefined ? {} : { slug }),
    ...(date === undefined ? {} : { date }),
    ...(license === undefined ? {} : { license }),
    ...(licenseUrl === undefined ? {} : { licenseUrl }),
    ...(syndicationRights === undefined ? {} : { syndicationRights }),
    ...(assignmentId === undefined ? {} : { assignmentId }),
  }, "create draft manuscript input") as unknown as CreateDraftManuscriptInput;
}

export function normalizeCreateAssignmentDraftInput(input: unknown): CreateAssignmentDraftInput {
  if (!isRecord(input)) throw new TypeError("assignment draft input must be a JSON object");
  const title = requireText(input["title"], "title");
  const summary = requireText(input["summary"], "summary");
  const body = requireText(input["body"], "body");
  const references = input["references"] === undefined ? undefined : referenceRecords(input["references"], "references", 0);
  const tags = optionalTextArray(input["tags"], "tags");
  const category = optionalText(input["category"], "category");
  const slug = optionalText(input["slug"], "slug");
  const date = optionalText(input["date"], "date");
  const license = optionalText(input["license"], "license");
  const licenseUrl = optionalText(input["licenseUrl"], "licenseUrl");
  if (licenseUrl !== undefined && !URL_PATTERN.test(licenseUrl)) throw new TypeError("licenseUrl must be an http(s) URL");
  const syndicationRights = optionalText(input["syndicationRights"], "syndicationRights");
  return createAssignmentDraftInputCarrier.assert({
    title,
    summary,
    body,
    ...(references === undefined ? {} : { references }),
    ...(tags === undefined ? {} : { tags }),
    ...(category === undefined ? {} : { category }),
    ...(slug === undefined ? {} : { slug }),
    ...(date === undefined ? {} : { date }),
    ...(license === undefined ? {} : { license }),
    ...(licenseUrl === undefined ? {} : { licenseUrl }),
    ...(syndicationRights === undefined ? {} : { syndicationRights }),
  }, "create assignment draft input") as unknown as CreateAssignmentDraftInput;
}

export function draftManuscriptCreated(input: Omit<CreateDraftManuscriptResult, "kind" | "draft">): CreateDraftManuscriptResult {
  return createDraftManuscriptResultCarrier.assert({
    ...input,
    kind: "producing-content.draft-manuscript.created" as const,
    draft: true as const,
  }, "created draft manuscript result");
}

export function createDraftManuscriptInputTerm(input: CreateDraftManuscriptInput): Tm {
  return carrierToTerm(jsonResource(createDraftManuscriptInputCarrier.assert(input), "create draft manuscript input"));
}

export function createAssignmentDraftInputTerm(input: CreateAssignmentDraftInput): Tm {
  return carrierToTerm(jsonResource(createAssignmentDraftInputCarrier.assert(input), "create assignment draft input"));
}

export function createDraftManuscriptResultTerm(input: CreateDraftManuscriptResult): Tm {
  return carrierToTerm(jsonResource(createDraftManuscriptResultCarrier.assert(input), "created draft manuscript result"));
}
