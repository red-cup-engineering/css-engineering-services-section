/**
 * propaganda-topology â€” propaganda as a content carrier with a declared
 * telos and a witnessed effect trace.
 *
 * "Propaganda" carries Jowett & O'Donnell's standard definition: the
 * deliberate, systematic attempt to shape perceptions to achieve a
 * response that furthers the desired intent of the propagandist. The
 * carrier is exactly that definition made structural:
 *
 *   PropagandaObject = content (a ContentObject on the meme floor)
 *                    + telos   (the intended response â€” DECLARED, first-class,
 *                               auditable; an undeclared telos is a malformed
 *                               shape, not a quieter kind of propaganda)
 *                    + effects (an append-only trace of WITNESSED responses;
 *                               time only accumulates, the trace never shrinks)
 *
 * Whether the witnessed effects further the telos is a judgment in
 * `./furtherance.mjs` â€” a charge with two-sided evidence, never a boolean.
 */
import { carrierFrom, carrierToTerm, mark, utterance, type Tm, type UtteranceCarrier, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource, type JsonValue } from "@red-cup-engineering/relating/writing";
import {
  contentCellMark,
  contentTerm,
  type AudienceCoordinate,
  type ContentObject,
} from "../topology/index.mjs";
import {
  encodeDemandCharge,
  type DemandChargeCarrier,
} from "../topology/demand.mjs";

export type { ContentObject, AudienceCoordinate, DemandChargeCarrier, UtteranceCarrier };

// ---------- terms and predicates ----------

/** Namespaced mark for a telos: "propaganda.telos.<id>". */
export function telosTerm(id: string): string {
  return `propaganda.telos.${id}`;
}

/**
 * The meme-floor predicate mark for a telos declaration:
 * "propaganda.declares-telos", relating content to the telos it declares.
 */
export function declaresTelosPredicate(): string { return "propaganda.declares-telos"; }
/**
 * The meme-floor predicate mark for furtherance: "propaganda.furthers",
 * relating witnessed effects to the telos they further.
 */
export function furthersPredicate(): string { return "propaganda.furthers"; }

// ---------- the declared telos ----------

const DecimalIntegerSchema = { pattern: "^-?[0-9]+$", type: "string" } as const;

const NestedDemandEntrySchema = { title: "DemandEntry", additionalProperties: false, type: "object", required: ["kind", "term", "value", "evidence"], properties: { kind: { const: "producing-content.demand.entry" }, term: { minLength: 1, type: "string" }, value: DecimalIntegerSchema, evidence: { type: "array", items: {} } } } as const;

const NestedDemandChargeSchema = { title: "DemandCharge", additionalProperties: false, type: "object", required: ["kind", "space", "entries"], properties: { kind: { const: "producing-content.demand.charge" }, space: { type: "array", items: { minLength: 1, type: "string" } }, entries: { type: "array", items: NestedDemandEntrySchema } } } as const;

export const TelosSchema = { $id: "producing-content/propaganda/telos", title: "Telos", additionalProperties: false, type: "object", required: ["kind", "id", "intent", "target", "declaredBy"], properties: { kind: { const: "producing-content.propaganda.telos" }, id: { minLength: 1, type: "string" }, intent: { minLength: 1, type: "string" }, target: NestedDemandChargeSchema, audience: {}, declaredBy: {} } } as const;

export const EffectWitnessSchema = { $id: "producing-content/propaganda/effect-witness", title: "EffectWitness", additionalProperties: false, type: "object", required: ["kind", "term", "magnitude", "stage", "evidence"], properties: { kind: { const: "producing-content.propaganda.effect:witness" }, term: { minLength: 1, type: "string" }, magnitude: DecimalIntegerSchema, stage: DecimalIntegerSchema, evidence: { type: "array", items: {} } } } as const;

export const PropagandaObjectSchema = { $id: "producing-content/propaganda/object", title: "PropagandaObject", additionalProperties: false, type: "object", required: ["kind", "content", "telos", "effects"], properties: { kind: { const: "producing-content.propaganda.object" }, content: {}, telos: TelosSchema, effects: { type: "array", items: EffectWitnessSchema } } } as const;

export type TelosJsonCarrier = FromSchema<typeof TelosSchema>;
export type EffectWitnessJsonCarrier = FromSchema<typeof EffectWitnessSchema>;
export type PropagandaObjectJsonCarrier = FromSchema<typeof PropagandaObjectSchema>;

export const telosCarrier = carrierFrom(TelosSchema);

export const effectWitnessCarrier = carrierFrom(EffectWitnessSchema);

export const propagandaObjectCarrier = carrierFrom(PropagandaObjectSchema);

/**
 * A declared telos: the intended response a propagandist seeks, carrying its
 * id, named intent, a signed demand charge target over term space, an optional
 * audience coordinate, and the required declarant who declared it.
 */
export interface TelosCarrier {
  readonly kind: "producing-content.propaganda.telos";
  readonly id: string;
  /** The desired response, named ("attention", "subscription", "assent"). */
  readonly intent: string;
  /** The target as a signed demand charge over audience/effect term space:
   *  which terms the propagandist intends to move, and in which direction. */
  readonly target: DemandChargeCarrier;
  readonly audience?: AudienceCoordinate;
  /** Who declared this telos. Required: a telos is declared, never hidden. */
  readonly declaredBy: unknown;
}

/**
 * The arguments for declareTelos: id, named intent, signed demand charge
 * target, optional audience coordinate, and the required declarant.
 */
export interface TelosInput {
  readonly id: string;
  readonly intent: string;
  readonly target: DemandChargeCarrier;
  readonly audience?: AudienceCoordinate;
  readonly declaredBy: unknown;
}

/** Declare a telos. An undeclared declarant is a malformed shape: the
 *  declaration is what makes the intent auditable rather than hidden. */
export function declareTelos(input: TelosInput): TelosCarrier {
  if (input.declaredBy === undefined || input.declaredBy === null) {
    throw new TypeError("declareTelos: a telos must be declared by someone â€” declaredBy is required");
  }
  if (typeof input.id !== "string" || input.id.length === 0) throw new TypeError("declareTelos: id must be a non-empty string");
  if (typeof input.intent !== "string" || input.intent.length === 0) throw new TypeError("declareTelos: intent must be a non-empty string");
  return Object.freeze({
    kind: "producing-content.propaganda.telos" as const,
    id: input.id,
    intent: input.intent,
    target: input.target,
    ...(input.audience !== undefined ? { audience: input.audience } : {}),
    declaredBy: input.declaredBy,
  });
}

/** Put the declaration on the meme floor: "content declares-telos telos".
 *  The declarant and intent travel on the TelosCarrier itself â€” provenance
 *  is this package's structure, never kernel structure. The telos is
 *  auditable wherever the content's other utterances are. */
export function telosDeclarationUtterance(contentId: string, telos: TelosCarrier): UtteranceCarrier {
  return utterance(
    mark(contentCellMark(contentTerm(contentId), telosTerm(telos.id))),
    mark(declaresTelosPredicate()),
  );
}

// ---------- witnessed effects ----------

/**
 * A single witnessed response in the effect trace: the term the response landed
 * on, its exact signed bigint magnitude, the ordinal stage that sequences it,
 * and the evidence that observed it.
 */
export interface EffectWitness {
  readonly kind: "producing-content.propaganda.effect:witness";
  /** The term (keyword, effect state) the response landed on. */
  readonly term: string;
  /** Exact signed magnitude of the witnessed response (e.g. views). */
  readonly magnitude: bigint;
  /** Ordinal position in the effect trace â€” sequencing is never wall-clock. */
  readonly stage: bigint;
  /** What observed this response (analytics record, log line, survey). */
  readonly evidence: readonly unknown[];
}

/**
 * The arguments for effectWitness: the term, the signed bigint magnitude, the
 * bigint stage ordinal, and optional evidence.
 */
export interface EffectWitnessInput {
  readonly term: string;
  readonly magnitude: bigint;
  readonly stage: bigint;
  readonly evidence?: readonly unknown[];
}

/**
 * Construct a frozen EffectWitness from its input, requiring magnitude and
 * stage to be bigints so carrier math stays exact, and freezing a copy of the
 * evidence list.
 */
export function effectWitness(input: EffectWitnessInput): EffectWitness {
  if (typeof input.magnitude !== "bigint") throw new TypeError("effectWitness: magnitude must be a bigint â€” carrier math is exact");
  if (typeof input.stage !== "bigint") throw new TypeError("effectWitness: stage must be a bigint ordinal");
  return Object.freeze({
    kind: "producing-content.propaganda.effect:witness" as const,
    term: input.term,
    magnitude: input.magnitude,
    stage: input.stage,
    evidence: Object.freeze([...(input.evidence ?? [])]),
  });
}

// ---------- the propaganda object ----------

/**
 * Propaganda as a carrier: a content object bound to its declared telos plus an
 * append-only trace of witnessed effects.
 */
export interface PropagandaObjectCarrier {
  readonly kind: "producing-content.propaganda.object";
  readonly content: ContentObject;
  readonly telos: TelosCarrier;
  /** Append-only trace of witnessed responses. */
  readonly effects: readonly EffectWitness[];
}

/** Bind content to a declared telos. The effect trace starts empty: at
 *  birth, nothing has been witnessed and furtherance reads absurd. */
export function propagandaObject(content: ContentObject, telos: TelosCarrier): PropagandaObjectCarrier {
  return Object.freeze({
    kind: "producing-content.propaganda.object" as const,
    content,
    telos,
    effects: Object.freeze([] as EffectWitness[]),
  });
}

/**
 * The arguments for witnessEffect: the term, the signed bigint magnitude, and
 * optional evidence; the stage ordinal is assigned from the existing trace
 * length.
 */
export interface WitnessEffectInput {
  readonly term: string;
  readonly magnitude: bigint;
  readonly evidence?: readonly unknown[];
}

/** Append a witnessed effect at the next stage ordinal. The original
 *  carrier survives untouched; the trace only ever extends. */
export function witnessEffect(object: PropagandaObjectCarrier, input: WitnessEffectInput): PropagandaObjectCarrier {
  const witness = effectWitness({
    term: input.term,
    magnitude: input.magnitude,
    stage: BigInt(object.effects.length),
    ...(input.evidence !== undefined ? { evidence: input.evidence } : {}),
  });
  return Object.freeze({
    ...object,
    effects: Object.freeze([...object.effects, witness]),
  });
}

function toJsonValue(value: unknown): JsonValue {
  if (typeof value === "bigint") return value.toString();
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, toJsonValue(child)]));
  }
  return String(value);
}

export function encodeTelos(telos: TelosCarrier): TelosJsonCarrier {
  return telosCarrier.assert({
    kind: "producing-content.propaganda.telos" as const,
    id: telos.id,
    intent: telos.intent,
    target: encodeDemandCharge(telos.target),
    ...(telos.audience === undefined ? {} : { audience: toJsonValue(telos.audience) }),
    declaredBy: toJsonValue(telos.declaredBy),
  }, "propaganda telos");
}

export function encodeEffectWitness(witness: EffectWitness): EffectWitnessJsonCarrier {
  return effectWitnessCarrier.assert({
    kind: "producing-content.propaganda.effect:witness" as const,
    term: witness.term,
    magnitude: witness.magnitude.toString(),
    stage: witness.stage.toString(),
    evidence: witness.evidence.map(toJsonValue),
  }, "propaganda effect witness");
}

export function encodePropagandaObject(object: PropagandaObjectCarrier): PropagandaObjectJsonCarrier {
  return propagandaObjectCarrier.assert({
    kind: "producing-content.propaganda.object" as const,
    content: toJsonValue(object.content),
    telos: encodeTelos(object.telos),
    effects: object.effects.map(encodeEffectWitness),
  }, "propaganda object");
}

export function telosCarrierTerm(telos: TelosCarrier): Tm {
  return carrierToTerm(jsonResource(encodeTelos(telos), "propaganda telos"));
}

export function effectWitnessTerm(witness: EffectWitness): Tm {
  return carrierToTerm(jsonResource(encodeEffectWitness(witness), "propaganda effect witness"));
}

export function propagandaObjectTerm(object: PropagandaObjectCarrier): Tm {
  return carrierToTerm(jsonResource(encodePropagandaObject(object), "propaganda object"));
}
