/**
 * source-submission - one operator-supplied source as a farm assignment.
 *
 * The content farm normally listens to configured wires and lets demand select
 * the next assignment. A source submission runs the same cycle from the other
 * end: an operator gives one source, the farm appraises which beat/term it
 * fits, gathers related intake when requested, and cultivates the assignment.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource, type JsonValue } from "@red-cup-engineering/relating/writing";
import { syndicationItem, type FetchLike, type SyndicationItem } from "../syndication/index.mjs";
import { distinctiveTermWords } from "../topology/article.mjs";
import { normalizeTerm } from "../topology/gates.mjs";

import {
  cultivate,
  intakeItems,
  type Ask,
  type SelectStory,
} from "./cultivate.mjs";
import type { FarmProperty } from "./property.mjs";
import type { SeedTerm } from "./demand.mjs";

export const SubmittedSourceSchema = { $id: "producing-content/content-farm/submitted-source", title: "SubmittedSource", additionalProperties: false, type: "object", required: ["url", "title"], properties: { url: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, summary: { type: "string" }, text: { type: "string" }, authors: { type: "array", items: { type: "string" } }, published: { type: "string" }, beat: { type: "string" }, term: { type: "string" } } } as const;

export const BeatFitScoreSchema = { additionalProperties: false, type: "object", required: ["beat", "score", "matched"], properties: { beat: { minLength: 1, type: "string" }, score: { type: "number" }, matched: { type: "array", items: { type: "string" } } } } as const;

export const SourceSubmissionAppraisalSchema = { $id: "producing-content/content-farm/source-submission/appraisal", title: "SourceSubmissionAppraisal", additionalProperties: false, type: "object", required: ["kind", "appropriate", "beat", "term", "score", "threshold", "forced", "matchedTerms", "evidence", "beatScores"], properties: { kind: { const: "producing-content.farm.source-submission.appraisal" }, appropriate: { type: "boolean" }, beat: { anyOf: [{ type: "string" }, { type: "null" }] }, term: { anyOf: [{ type: "string" }, { type: "null" }] }, score: { type: "number" }, threshold: { type: "number" }, forced: { type: "boolean" }, matchedTerms: { type: "array", items: { type: "string" } }, evidence: { minLength: 1, type: "string" }, beatScores: { type: "array", items: BeatFitScoreSchema } } } as const;

export const GatheredSourcesSchema = { $id: "producing-content/content-farm/source-submission/gathered", title: "GatheredSources", additionalProperties: false, type: "object", required: ["kind", "seedUrl", "relatedCount", "sourceUrls", "wireObstructions"], properties: { kind: { const: "producing-content.farm.source-submission.gathered" }, seedUrl: { minLength: 1, type: "string" }, relatedCount: { type: "number" }, sourceUrls: { type: "array", items: { type: "string" } }, wireObstructions: { type: "array", items: { type: "string" } } } } as const;

export const SourceSubmissionOutOfFrameSchema = { $id: "producing-content/content-farm/source-submission/out-of-frame", title: "SourceSubmissionOutOfFrame", additionalProperties: false, type: "object", required: ["kind", "url", "title", "appraisal", "evidence"], properties: { kind: { const: "producing-content.farm.source-submission:out-of-frame" }, url: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, appraisal: SourceSubmissionAppraisalSchema, evidence: { minLength: 1, type: "string" } } } as const;

export const SourceSubmissionCultivatedSchema = { $id: "producing-content/content-farm/source-submission/cultivated", title: "SourceSubmissionCultivated", additionalProperties: false, type: "object", required: ["kind", "url", "title", "mode", "appraisal", "gathered", "cultivation"], properties: { kind: { const: "producing-content.farm.source-submission:cultivated" }, url: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, mode: { anyOf: [{ const: "single" }, { const: "expand" }] }, appraisal: SourceSubmissionAppraisalSchema, gathered: GatheredSourcesSchema, cultivation: {} } } as const;

export const SourceSubmissionJudgmentSchema = { $id: "producing-content/content-farm/source-submission/judgment", title: "SourceSubmissionJudgment", anyOf: [SourceSubmissionOutOfFrameSchema, SourceSubmissionCultivatedSchema] } as const;

export type SubmittedSource = FromSchema<typeof SubmittedSourceSchema>;
export type BeatFitScore = FromSchema<typeof BeatFitScoreSchema>;
export type SubmissionAppraisal = FromSchema<typeof SourceSubmissionAppraisalSchema>;
export type GatheredSources = FromSchema<typeof GatheredSourcesSchema>;
export type SourceSubmissionOutOfFrame = FromSchema<typeof SourceSubmissionOutOfFrameSchema>;
export type SourceSubmissionCultivated = FromSchema<typeof SourceSubmissionCultivatedSchema>;
export type SourceSubmissionJudgment = SourceSubmissionOutOfFrame | SourceSubmissionCultivated;

export const submittedSourceCarrier = carrierFrom(SubmittedSourceSchema);

export const sourceSubmissionAppraisalCarrier = carrierFrom(SourceSubmissionAppraisalSchema);

export const gatheredSourcesCarrier = carrierFrom(GatheredSourcesSchema);

export const sourceSubmissionOutOfFrameCarrier = carrierFrom(SourceSubmissionOutOfFrameSchema);

export const sourceSubmissionCultivatedCarrier = carrierFrom(SourceSubmissionCultivatedSchema);

export type SubmitSourceOptions = Readonly<{
  mode?: "single" | "expand";
  discoveredSources?: readonly SubmittedSource[];
  maxRelated?: number;
  property: FarmProperty;
  at?: string;
  ask?: Ask;
  provider?: string;
  model?: string;
  env?: Readonly<Record<string, string | undefined>>;
  fetchImpl?: FetchLike;
  dryRun?: boolean;
  threshold?: number;
  now?: () => string;
}>;

const DEFAULT_APPRAISAL_THRESHOLD = 2;

export function isOutOfFrame(judgment: SourceSubmissionJudgment): judgment is SourceSubmissionOutOfFrame {
  return judgment.kind === "producing-content.farm.source-submission:out-of-frame";
}

function submissionHaystack(submitted: SubmittedSource): ReadonlySet<string> {
  const text = [submitted.title, submitted.summary ?? "", submitted.text ?? ""].join(" ");
  return new Set(normalizeTerm(text).split(" ").filter((word) => word.length > 2));
}

function beatVocabulary(property: FarmProperty, beat: string): ReadonlySet<string> {
  const generic = new Set(property.genericTermWords ?? []);
  const words = new Set<string>();
  for (const seed of property.seeds) {
    if (seed.beat !== beat) continue;
    for (const word of distinctiveTermWords(seed.term, generic)) words.add(word);
  }
  const category = property.beatCategory?.[beat];
  if (category !== undefined) for (const word of distinctiveTermWords(category, generic)) words.add(word);
  return words;
}

function beatFitScores(property: FarmProperty, haystack: ReadonlySet<string>): readonly BeatFitScore[] {
  return Object.freeze(Object.keys(property.beatSources)
    .map((beat): BeatFitScore => {
      const matched = [...beatVocabulary(property, beat)].filter((word) => haystack.has(word));
      return { beat, score: matched.length, matched };
    })
    .sort((left, right) => right.score - left.score || left.beat.localeCompare(right.beat)));
}

function inferTerm(property: FarmProperty, beat: string, haystack: ReadonlySet<string>): string | null {
  const generic = new Set(property.genericTermWords ?? []);
  const seeds = property.seeds.filter((seed): seed is SeedTerm => seed.beat === beat);
  if (seeds.length === 0) return property.beatCategory?.[beat] ?? null;
  const ranked = [...seeds]
    .map((seed) => ({
      term: seed.term,
      priority: seed.priority ?? 0,
      overlap: [...distinctiveTermWords(seed.term, generic)].filter((word) => haystack.has(word)).length,
    }))
    .sort((left, right) => right.overlap - left.overlap || right.priority - left.priority || left.term.localeCompare(right.term));
  return ranked[0]?.term ?? null;
}

export function appraiseSubmission(
  submitted: SubmittedSource,
  property: FarmProperty,
  options: Readonly<{ threshold?: number }> = {},
): SubmissionAppraisal {
  const threshold = options.threshold ?? DEFAULT_APPRAISAL_THRESHOLD;
  const haystack = submissionHaystack(submitted);
  const beatScores = beatFitScores(property, haystack);
  const configuredBeats = new Set(Object.keys(property.beatSources));

  if (submitted.beat !== undefined) {
    if (!configuredBeats.has(submitted.beat)) {
      return sourceSubmissionAppraisalCarrier.assert({
        kind: "producing-content.farm.source-submission.appraisal" as const,
        appropriate: false,
        beat: null,
        term: null,
        score: 0,
        threshold,
        forced: true,
        matchedTerms: [],
        evidence: `Forced beat "${submitted.beat}" is not a configured beat (${[...configuredBeats].join(", ")}).`,
        beatScores: [...beatScores],
      }, "source submission appraisal");
    }
    const fit = beatScores.find((entry) => entry.beat === submitted.beat);
    const term = submitted.term ?? inferTerm(property, submitted.beat, haystack);
    return sourceSubmissionAppraisalCarrier.assert({
      kind: "producing-content.farm.source-submission.appraisal" as const,
      appropriate: term !== null,
      beat: submitted.beat,
      term,
      score: fit?.score ?? 0,
      threshold,
      forced: true,
      matchedTerms: [...(fit?.matched ?? [])],
      evidence: `Operator forced beat "${submitted.beat}"${submitted.term === undefined ? ` with inferred term "${term ?? "(none)"}"` : ` with term "${submitted.term}"`}.`,
      beatScores: [...beatScores],
    }, "source submission appraisal");
  }

  const best = beatScores[0];
  if (best === undefined || best.score < threshold) {
    return sourceSubmissionAppraisalCarrier.assert({
      kind: "producing-content.farm.source-submission.appraisal" as const,
      appropriate: false,
      beat: null,
      term: null,
      score: best?.score ?? 0,
      threshold,
      forced: false,
      matchedTerms: [...(best?.matched ?? [])],
      evidence: `No beat reaches the signal threshold of ${threshold} distinct words against this material (best: ${best?.beat ?? "none"} at ${best?.score ?? 0}). Force a beat to override, or this source is out of frame.`,
      beatScores: [...beatScores],
    }, "source submission appraisal");
  }
  const term = submitted.term ?? inferTerm(property, best.beat, haystack);
  return sourceSubmissionAppraisalCarrier.assert({
    kind: "producing-content.farm.source-submission.appraisal" as const,
    appropriate: term !== null,
    beat: best.beat,
    term,
    score: best.score,
    threshold,
    forced: false,
    matchedTerms: [...best.matched],
    evidence: `Material fits beat "${best.beat}" (${best.score} distinct signal words: ${best.matched.slice(0, 8).join(", ")}); lens term "${term ?? "(none)"}".`,
    beatScores: [...beatScores],
  }, "source submission appraisal");
}

function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

export function syndicationItemFromSubmission(submitted: SubmittedSource): SyndicationItem {
  const summary = submitted.summary ?? (submitted.text === undefined ? undefined : submitted.text.slice(0, 900));
  const source = domainOf(submitted.url) ?? "submitted";
  return syndicationItem({
    url: submitted.url,
    title: submitted.title,
    ...(summary === undefined ? {} : { summary }),
    ...(submitted.authors === undefined ? {} : { authors: submitted.authors }),
    ...(submitted.published === undefined ? {} : { published: submitted.published }),
    source,
  });
}

function dedupeByUrl(items: readonly SyndicationItem[]): readonly SyndicationItem[] {
  const seen = new Set<string>();
  const kept: SyndicationItem[] = [];
  for (const item of items) {
    const key = item.url.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(item);
  }
  return Object.freeze(kept);
}

export async function gatherRelatedSources(
  seed: SubmittedSource,
  beat: string,
  term: string,
  property: FarmProperty,
  options: Readonly<{ fetchImpl?: FetchLike; discovered?: readonly SubmittedSource[]; max?: number }> = {},
): Promise<Readonly<{ items: readonly SyndicationItem[]; obstructions: readonly string[]; relatedCount: number }>> {
  const seedItem = syndicationItemFromSubmission(seed);
  const discovered = (options.discovered ?? []).map(syndicationItemFromSubmission);
  const generic = new Set(property.genericTermWords ?? []);
  const keywords = new Set<string>([
    ...distinctiveTermWords(term, generic),
    ...normalizeTerm(`${seed.title} ${seed.summary ?? ""}`).split(" ").filter((word) => word.length > 3 && !generic.has(word)),
  ]);
  const intake = await intakeItems(property, beat, {
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
  });
  const seedKey = seedItem.url.replace(/\/+$/, "");
  const related = intake.items
    .filter((item) => item.url.replace(/\/+$/, "") !== seedKey)
    .map((item) => {
      const haystack = normalizeTerm(`${item.title} ${item.summary ?? ""}`);
      const score = [...keywords].filter((word) => haystack.includes(word)).length;
      return { item, score };
    })
    .filter((scored) => scored.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, options.max ?? 8)
    .map((scored) => scored.item);
  const items = dedupeByUrl([seedItem, ...discovered, ...related]);
  return Object.freeze({ items, obstructions: intake.obstructions, relatedCount: items.length - 1 });
}

const seedLeadSelect: SelectStory = ({ items }) => Object.freeze({
  story: items[0]!,
  context: Object.freeze(items.slice(1, 6)),
});

export async function submitSource(
  submitted: SubmittedSource,
  options: SubmitSourceOptions,
): Promise<SourceSubmissionJudgment> {
  const property = options.property;
  const appraisal = appraiseSubmission(submitted, property, {
    ...(options.threshold === undefined ? {} : { threshold: options.threshold }),
  });
  if (!appraisal.appropriate || appraisal.beat === null || appraisal.term === null) {
    return sourceSubmissionOutOfFrameCarrier.assert({
      kind: "producing-content.farm.source-submission:out-of-frame" as const,
      url: submitted.url,
      title: submitted.title,
      appraisal,
      evidence: appraisal.evidence,
    }, "source submission out-of-frame");
  }
  const mode = options.mode ?? "expand";
  const now = options.now ?? (() => new Date().toISOString());
  const at = options.at ?? now().slice(0, 10);
  const gathered: Readonly<{ items: readonly SyndicationItem[]; obstructions: readonly string[]; relatedCount: number }> =
    mode === "single"
      ? Object.freeze({ items: Object.freeze([syndicationItemFromSubmission(submitted)]), obstructions: Object.freeze([]), relatedCount: 0 })
      : await gatherRelatedSources(submitted, appraisal.beat, appraisal.term, property, {
        ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
        ...(options.discoveredSources === undefined ? {} : { discovered: options.discoveredSources }),
        ...(options.maxRelated === undefined ? {} : { max: options.maxRelated }),
      });

  const cultivation = await cultivate(property, {
    at,
    items: gathered.items,
    term: appraisal.term,
    beat: appraisal.beat,
    ...(mode === "expand" ? { select: seedLeadSelect } : {}),
    ...(options.ask === undefined ? {} : { ask: options.ask }),
    ...(options.provider === undefined ? {} : { provider: options.provider }),
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(options.env === undefined ? {} : { env: options.env }),
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
  });
  return sourceSubmissionCultivatedCarrier.assert({
    kind: "producing-content.farm.source-submission:cultivated" as const,
    url: submitted.url,
    title: submitted.title,
    mode,
    appraisal,
    gathered: gatheredSourcesCarrier.assert({
      kind: "producing-content.farm.source-submission.gathered" as const,
      seedUrl: submitted.url,
      relatedCount: gathered.relatedCount,
      sourceUrls: gathered.items.map((item) => item.url),
      wireObstructions: [...gathered.obstructions],
    }, "gathered source submission intake"),
    cultivation: jsonResource(cultivation as unknown as JsonValue, "source submission cultivation"),
  }, "source submission cultivation");
}

export function submittedSourceTerm(input: SubmittedSource): Tm {
  return carrierToTerm(jsonResource(submittedSourceCarrier.assert(input), "submitted source"));
}

export function sourceSubmissionAppraisalTerm(input: SubmissionAppraisal): Tm {
  return carrierToTerm(jsonResource(sourceSubmissionAppraisalCarrier.assert(input), "source submission appraisal"));
}

export function sourceSubmissionJudgmentTerm(input: SourceSubmissionJudgment): Tm {
  const carrierFor = isOutOfFrame(input) ? sourceSubmissionOutOfFrameCarrier : sourceSubmissionCultivatedCarrier;
  return carrierToTerm(jsonResource(carrierFor.assert(input), "source submission judgment"));
}
