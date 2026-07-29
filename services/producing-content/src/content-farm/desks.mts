/**
 * desks - topical production standing as content-farm carriers.
 *
 * A desk is where a newswire's intake standing becomes assignable content-farm
 * work: one beat, its source roll, seed vocabulary, public section, editorial
 * frame, and corpus count. Sites may derive the labels and frames locally; the
 * reusable packet shape belongs to producing-content.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

import { SourceRollSourceSchema } from "../cable/source-roll.mjs";
import type { SourceRollSource } from "../cable/source-roll.mjs";

export const EditorialWorkItemFieldsSchema = { $id: "producing-content/content-farm/editorial-work-item-fields", title: "EditorialWorkItemFields", additionalProperties: false, type: "object", required: ["title", "office", "requiredSkill", "slug", "summary"], properties: { title: { minLength: 1, type: "string" }, office: { minLength: 1, type: "string" }, requiredSkill: { minLength: 1, type: "string" }, slug: { minLength: 1, type: "string" }, summary: { type: "string" } } } as const;

export const EditorialWorkItemSchema = { $id: "producing-content/content-farm/editorial-work-item", title: "EditorialWorkItem", additionalProperties: false, type: "object", required: ["kind", "workId", "fields"], properties: { kind: { const: "content.farm.work-item" }, workId: { minLength: 1, type: "string" }, fields: EditorialWorkItemFieldsSchema } } as const;

export const EditorialOfficeSchema = { $id: "producing-content/content-farm/editorial-office", title: "EditorialOffice", additionalProperties: false, type: "object", required: ["name"], properties: { name: { minLength: 1, type: "string" }, gateModel: { minLength: 1, type: "string" } } } as const;

export const ContentFarmDeskEnqueueWitnessSchema = { $id: "producing-content/content-farm/desk/enqueue-witness", title: "ContentFarmDeskEnqueueWitness", additionalProperties: false, type: "object", required: ["kind", "at", "candidates", "deposited", "skipped"], properties: { kind: { const: "content.farm.desk.enqueue:witness" }, at: { minLength: 1, type: "string" }, candidates: { type: "array", items: EditorialWorkItemSchema }, deposited: { minimum: 0, type: "integer" }, skipped: { minimum: 0, type: "integer" } } } as const;

export const ContentFarmDeskObstructionSchema = { $id: "producing-content/content-farm/desk/obstruction", title: "ContentFarmDeskObstruction", additionalProperties: false, type: "object", required: ["kind", "at", "reason"], properties: { kind: { const: "content.farm.desk:obstruction" }, at: { anyOf: [{ const: "hub-read" }, { const: "hub-deposit" }] }, reason: { minLength: 1, type: "string" } } } as const;

export const ContentDeskAxesSchema = { $id: "producing-content/content-farm/desk-axes", title: "ContentDeskAxes", additionalProperties: false, type: "object", required: ["desk", "department"], properties: { desk: { minLength: 1, type: "string" }, department: { minLength: 1, type: "string" } } } as const;

export const ContentDeskSchema = { $id: "producing-content/content-farm/desk", title: "ContentDesk", additionalProperties: false, type: "object", required: ["kind", "beat", "name", "wireTitle", "sectionSlug", "sectionUrl", "keyword", "description", "editorialFrame", "relatedBeats", "seedTerms", "sourceCount", "sources", "wireItemCount", "articleCount"], properties: { kind: { const: "producing-content.desk" }, beat: { minLength: 1, type: "string" }, name: { minLength: 1, type: "string" }, wireTitle: { minLength: 1, type: "string" }, sectionSlug: { minLength: 1, type: "string" }, sectionUrl: { minLength: 1, type: "string" }, keyword: { type: "string" }, description: { type: "string" }, editorialFrame: { type: "string" }, relatedBeats: { type: "array", items: { minLength: 1, type: "string" } }, seedTerms: { type: "array", items: { minLength: 1, type: "string" } }, sourceCount: { minimum: 0, type: "integer" }, sources: { type: "array", items: SourceRollSourceSchema }, wireItemCount: { minimum: 0, type: "integer" }, latestWireItemAt: { minLength: 1, type: "string" }, articleCount: { minimum: 0, type: "integer" } } } as const;

export const ContentDesksReadingSchema = { $id: "producing-content/content-farm/desks", title: "ContentDesksReading", additionalProperties: false, type: "object", required: ["kind", "generatedAt", "deskCount", "desks", "axes"], properties: { kind: { const: "producing-content.desks" }, generatedAt: { minLength: 1, type: "string" }, deskCount: { minimum: 0, type: "integer" }, desks: { type: "array", items: ContentDeskSchema }, axes: ContentDeskAxesSchema } } as const;

export type ContentDeskAxes = FromSchema<typeof ContentDeskAxesSchema>;
export type ContentDesk = FromSchema<typeof ContentDeskSchema>;
export type ContentDesksReading = FromSchema<typeof ContentDesksReadingSchema>;
export type EditorialOffice = FromSchema<typeof EditorialOfficeSchema>;
export type EditorialWorkItem = FromSchema<typeof EditorialWorkItemSchema>;
export type EditorialWorkItemFields = FromSchema<typeof EditorialWorkItemFieldsSchema>;
export type ContentFarmDeskEnqueueWitness = FromSchema<typeof ContentFarmDeskEnqueueWitnessSchema>;
export type ContentFarmDeskObstruction = FromSchema<typeof ContentFarmDeskObstructionSchema>;

export const editorialWorkItemCarrier = carrierFrom(EditorialWorkItemSchema);

export const contentFarmDeskEnqueueWitnessCarrier = carrierFrom(ContentFarmDeskEnqueueWitnessSchema);

export const contentFarmDeskObstructionCarrier = carrierFrom(ContentFarmDeskObstructionSchema);

export const contentDeskCarrier = carrierFrom(ContentDeskSchema);

export const contentDesksReadingCarrier = carrierFrom(ContentDesksReadingSchema);

export function editorialWorkItem(office: EditorialOffice, input: Readonly<{ slug: string; title: string; summary: string }>): EditorialWorkItem {
  return editorialWorkItemCarrier.assert({
    kind: "content.farm.work-item" as const,
    workId: `${office.name}--${input.slug}`,
    fields: {
      title: `Editorial review: ${input.title}`,
      office: office.name,
      requiredSkill: office.gateModel ?? "fable",
      slug: input.slug,
      summary: input.summary.slice(0, 280),
    },
  }, "editorial work item");
}

export function contentFarmDeskEnqueueWitness(input: Omit<ContentFarmDeskEnqueueWitness, "kind" | "candidates"> & Readonly<{
  candidates: readonly EditorialWorkItem[];
}>): ContentFarmDeskEnqueueWitness {
  return contentFarmDeskEnqueueWitnessCarrier.assert({
    kind: "content.farm.desk.enqueue:witness" as const,
    at: input.at,
    candidates: input.candidates.map((candidate) => editorialWorkItemCarrier.assert(candidate)),
    deposited: input.deposited,
    skipped: input.skipped,
  }, "content farm desk enqueue witness");
}

export function contentFarmDeskObstruction(input: Omit<ContentFarmDeskObstruction, "kind">): ContentFarmDeskObstruction {
  return contentFarmDeskObstructionCarrier.assert({
    kind: "content.farm.desk:obstruction" as const,
    ...input,
  }, "content farm desk obstruction");
}

export function contentDesk(input: Omit<ContentDesk, "kind" | "relatedBeats" | "seedTerms" | "sources"> & Readonly<{
  relatedBeats: readonly string[];
  seedTerms: readonly string[];
  sources: readonly SourceRollSource[];
}>): ContentDesk {
  return contentDeskCarrier.assert({
    kind: "producing-content.desk" as const,
    ...input,
    relatedBeats: [...input.relatedBeats],
    seedTerms: [...input.seedTerms],
    sources: input.sources.map((source) => ({ ...source })),
  }, "content desk");
}

export function contentDesksReading(input: Omit<ContentDesksReading, "kind" | "deskCount" | "desks"> & Readonly<{
  desks: readonly ContentDesk[];
}>): ContentDesksReading {
  const desks = [...input.desks].map((desk) => contentDesk(desk))
    .sort((left, right) => left.name.localeCompare(right.name) || left.beat.localeCompare(right.beat));
  return contentDesksReadingCarrier.assert({
    kind: "producing-content.desks" as const,
    generatedAt: input.generatedAt,
    deskCount: desks.length,
    desks,
    axes: { ...input.axes },
  }, "content desks reading");
}

export function contentDeskTerm(input: ContentDesk): Tm {
  return carrierToTerm(jsonResource(contentDeskCarrier.assert(input), "content desk"));
}

export function contentDesksReadingTerm(input: ContentDesksReading): Tm {
  return carrierToTerm(jsonResource(contentDesksReadingCarrier.assert(input), "content desks reading"));
}

export function editorialWorkItemTerm(input: EditorialWorkItem): Tm {
  return carrierToTerm(jsonResource(editorialWorkItemCarrier.assert(input), "editorial work item"));
}

export function contentFarmDeskEnqueueWitnessTerm(input: ContentFarmDeskEnqueueWitness): Tm {
  return carrierToTerm(jsonResource(contentFarmDeskEnqueueWitnessCarrier.assert(input), "content farm desk enqueue witness"));
}

export function contentFarmDeskObstructionTerm(input: ContentFarmDeskObstruction): Tm {
  return carrierToTerm(jsonResource(contentFarmDeskObstructionCarrier.assert(input), "content farm desk obstruction"));
}
