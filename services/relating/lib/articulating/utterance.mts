/**
 * articulating/utterance — the base object, base carrier, and base morphism.
 *
 * `Mark` is the opaque atom: an immutable carrier wrapping one present value.
 * Core code never inspects a Mark's payload as ordinary data — only a codec
 * boundary may. A `Token` (left hand) and a `Claim` (right hand) each carry a
 * Mark; an `Utterance = (Token, Claim)` is the base admission carrier; and
 * `articulate` opens the aperiodic articulation category at its potential cell.
 * Every public morphism of relating normalizes back through `Mark → Utterance →
 * articulate`; this module is where that base lives.
 *
 * `UtteranceCarrier` is derived from the plain schema literal. The schema is the carrier's identity and runtime
 * law; this module supplies the declaration, constructors, and morphisms over it.
 */
import type { FromSchema } from "../primitive/schema.mjs";

const MarkSchema = {
  type: "object",
  required: ["kind", "value"],
  properties: {
    kind: { const: "utterance.mark" },
    value: {},
  },
  additionalProperties: false,
} as const;

const TokenSchema = {
  type: "object",
  required: ["kind", "hand", "mark"],
  properties: {
    kind: { const: "utterance.token" },
    hand: { const: "left" },
    mark: MarkSchema,
  },
  additionalProperties: false,
} as const;

const ClaimSchema = {
  type: "object",
  required: ["kind", "hand", "mark"],
  properties: {
    kind: { const: "utterance.claim" },
    hand: { const: "right" },
    mark: MarkSchema,
  },
  additionalProperties: false,
} as const;

/** The base admission carrier shape: token + claim, each carrying a Mark. */
const utteranceShape = {
  kind: { const: "utterance.carrier" },
  token: TokenSchema,
  claim: ClaimSchema,
};

/** The base admission carrier schema: one plain JSON-Schema literal with a bare `$id`. */
export const utteranceSchema = {
  $id: "relating/articulating/utterance",
  type: "object",
  required: ["kind", "token", "claim"],
  properties: utteranceShape,
  additionalProperties: false,
  title: "UtteranceCarrier",
  description: "The base admission carrier: a token and a claim, each carrying a Mark.",
} as const;

/** The base admission carrier type, derived from `utteranceSchema`. */
export type UtteranceCarrier = FromSchema<typeof utteranceSchema>;

/** The articulation cell carrier shape opened from an utterance. */
const articulationCellShape = {
  kind: { const: "utterance.articulation.cell" },
  potentialAperiodicArticulationCell: {
    type: "array",
    items: [
      utteranceSchema,
      {
        type: "array",
        items: [
          { type: "array", items: [], minItems: 0, maxItems: 0, additionalItems: false },
          { type: "array", items: [], minItems: 0, maxItems: 0, additionalItems: false },
        ],
        minItems: 2,
        maxItems: 2,
        additionalItems: false,
      },
    ],
    minItems: 2,
    maxItems: 2,
    additionalItems: false,
  },
};

/** The articulation cell carrier schema opened from an utterance. */
export const articulationCellSchema = {
  $id: "relating/articulating/articulation-cell",
  type: "object",
  required: ["kind", "potentialAperiodicArticulationCell"],
  properties: articulationCellShape,
  additionalProperties: false,
  title: "ArticulationCell",
  description: "An utterance opened at its potential aperiodic articulation cell.",
} as const;

/** A mark: an immutable carrier wrapping a single present value. The opaque atom. */
export class Mark {
  readonly kind = "utterance.mark" as const;
  readonly value: unknown;

  constructor(value: unknown) {
    if (value === undefined) throw new TypeError("Mark: value must be present");
    this.value = value;
    Object.freeze(this);
  }
}

/** A token: the immutable left-hand utterance carrier holding one mark. */
export class Token {
  readonly kind = "utterance.token" as const;
  readonly hand = "left" as const;
  readonly mark: Mark;

  constructor(mark: Mark) {
    this.mark = mark;
    Object.freeze(this);
  }
}

/** A claim: the immutable right-hand utterance carrier holding one mark. */
export class Claim {
  readonly kind = "utterance.claim" as const;
  readonly hand = "right" as const;
  readonly mark: Mark;

  constructor(mark: Mark) {
    this.mark = mark;
    Object.freeze(this);
  }
}

/** The two RelMath mark roles: identity-bearing token and content-bearing claim. */
export type MarkKind = "token" | "claim";

/** The complete finite enumeration of `RelMath.Mark.Kind`. */
export const markKinds: readonly MarkKind[] = Object.freeze(["token", "claim"]);

/** Decide membership in the two-element mark-kind carrier. */
export const isMarkKind = (kind: unknown): kind is MarkKind =>
  kind === "token" || kind === "claim";

/** `RelMath.Mark.Kind.two_kinds`: every mark kind is token or claim. */
export const markKindTwoKinds = (kind: MarkKind): boolean =>
  markKinds.includes(kind);

/** `RelMath.Mark.Kind.token_ne_claim`: the two mark roles are distinct. */
export const tokenNeClaim = (): true => true;

/** The token-side slot of an aperiodic articulation cell. */
export type TokenArticulationSlot = readonly [] | readonly [Token];

/** The claim-side slot of an aperiodic articulation cell. */
export type ClaimArticulationSlot = readonly [] | readonly [Claim];

/** The pairing term of an aperiodic articulation cell. */
export type AperiodicArticulationPairing = readonly [TokenArticulationSlot, ClaimArticulationSlot];

/** An aperiodic articulation cell: a carrier utterance plus its two slots. */
export type AperiodicArticulationCell = readonly [UtteranceCarrier, AperiodicArticulationPairing];

/** The potential aperiodic articulation cell: both slots empty (the initial object). */
export type PotentialAperiodicArticulationCell = readonly [UtteranceCarrier, readonly [readonly [], readonly []]];

/** The articulation cell `articulate` opens, carrying the potential aperiodic cell. */
export interface ArticulationCell {
  readonly kind: "utterance.articulation.cell";
  readonly potentialAperiodicArticulationCell: PotentialAperiodicArticulationCell;
}

export interface ArticulatingUtter {
  readonly kind: "articulating.utter";
  readonly utterance: UtteranceCarrier;
}

export interface ArticulatingPair {
  readonly kind: "articulating.pair";
  readonly utterance: UtteranceCarrier;
  readonly articulating: Articulating;
}

/** Finite recursive carrier for `RelMath.Articulating`. */
export type Articulating = ArticulatingUtter | ArticulatingPair;

/** A witness that two marks coincide. */
export interface MarkCoincidenceWitness<Carrier> {
  readonly kind: "utterance.coincidence:witness";
  readonly left: Carrier;
  readonly right: Carrier;
}

/** An obstruction to two marks coinciding. */
export interface MarkCoincidenceObstruction<Carrier> {
  readonly kind: "utterance.coincidence-obstruction";
  readonly left: Carrier;
  readonly right: Carrier;
}

/** The result of judging two token/claim carriers coincident. */
export type TokenIdentityJudgment = MarkCoincidenceWitness<Token> | MarkCoincidenceObstruction<Token>;
/** The result of judging two claim carriers coincident. */
export type ClaimIdentityJudgment = MarkCoincidenceWitness<Claim> | MarkCoincidenceObstruction<Claim>;

/** Constructs a Mark wrapping the given value. */
export function mark(value: unknown): Mark {
  return new Mark(value);
}

/** Constructs a Token from the given mark. */
export function token(markCarrier: Mark): Token {
  return new Token(markCarrier);
}

/** Constructs a Claim from the given mark. */
export function claim(markCarrier: Mark): Claim {
  return new Claim(markCarrier);
}

/** Constructs an utterance carrier from two marks: left becomes a token, right a claim. */
export function utterance(left: Mark, right: Mark): UtteranceCarrier {
  return Object.freeze({ kind: "utterance.carrier" as const, token: token(left), claim: claim(right) });
}

/** The innermost `RelMath.Articulating.utter` constructor. */
export function articulatingUtter(carrier: UtteranceCarrier): ArticulatingUtter {
  return Object.freeze({ kind: "articulating.utter" as const, utterance: carrier });
}

/** The recursive `RelMath.Articulating.pair` constructor. */
export function articulatingPair(carrier: UtteranceCarrier, nested: Articulating): ArticulatingPair {
  return Object.freeze({ kind: "articulating.pair" as const, utterance: carrier, articulating: nested });
}

/** `RelMath.Articulating.head`: the utterance at the head of the recursion. */
export function articulatingHead(carrier: Articulating): UtteranceCarrier {
  return carrier.utterance;
}

/** `RelMath.Articulating.depth`: the finite recursion depth to the primitive floor. */
export function articulatingDepth(carrier: Articulating): number {
  return carrier.kind === "articulating.utter" ? 0 : articulatingDepth(carrier.articulating) + 1;
}

/** `RelMath.Articulating.floor`: the innermost utterance at the primitive floor. */
export function articulatingFloor(carrier: Articulating): UtteranceCarrier {
  return carrier.kind === "articulating.utter" ? carrier.utterance : articulatingFloor(carrier.articulating);
}

/** `RelMath.Articulating.utter_ne_pair`: the two constructors remain distinguishable. */
export function articulatingUtterNePair(_u: UtteranceCarrier, _v: UtteranceCarrier, _a: Articulating): true {
  return true;
}

/** Whether two mark payloads coincide: identical primitives, or structurally
 *  equal plain JSON. This is the only place core code reads a Mark payload, and
 *  it reads it only to judge coincidence — never to branch on its content.
 *
 *  Structural (value) coincidence, not reference identity: this package is
 *  boundary-first, so carriers are routinely reconstructed from JSON with no
 *  shared references. Coincidence must survive a transport round-trip; reference
 *  identity would not. (This is the one deliberate divergence from the prior
 *  reference-identity carrier coincidence.) */
export function coincides(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => coincides(item, right[index]));
  }
  const leftKeys = Object.keys(left as Record<string, unknown>).sort();
  const rightKeys = Object.keys(right as Record<string, unknown>).sort();
  if (leftKeys.length !== rightKeys.length || !leftKeys.every((key, index) => key === rightKeys[index])) return false;
  return leftKeys.every((key) => coincides((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}

/** Structural guard for a Mark carrier. Boundary-first: a Mark rehydrated from JSON
 *  is a plain object, not a class instance, so membership is judged by shape (kind +
 *  a present value), the same stance `coincides` takes — never by `instanceof`, which
 *  would not survive a transport round-trip. */
export function isMark(value: unknown): value is Mark {
  return typeof value === "object" && value !== null
    && (value as { kind?: unknown }).kind === "utterance.mark"
    && "value" in value;
}

/** Judges whether two tokens coincide: a witness when their marks coincide, else an obstruction. */
export function tokenIdentity(left: Token, right: Token): TokenIdentityJudgment {
  return coincides(left.mark.value, right.mark.value)
    ? Object.freeze({ kind: "utterance.coincidence:witness" as const, left, right })
    : Object.freeze({ kind: "utterance.coincidence-obstruction" as const, left, right });
}

/** Judges whether two claims coincide: a witness when their marks coincide, else an obstruction. */
export function claimIdentity(left: Claim, right: Claim): ClaimIdentityJudgment {
  return coincides(left.mark.value, right.mark.value)
    ? Object.freeze({ kind: "utterance.coincidence:witness" as const, left, right })
    : Object.freeze({ kind: "utterance.coincidence-obstruction" as const, left, right });
}

/**
 * Articulates an utterance carrier: opens the aperiodic articulation category at
 * its potential cell. The token and claim are fixed by the carrier; neither slot
 * is filled at this initial object. This is the base morphism.
 */
export function articulate(carrier: UtteranceCarrier): ArticulationCell {
  const pairing = Object.freeze([Object.freeze([]), Object.freeze([])]) as readonly [readonly [], readonly []];
  return Object.freeze({
    kind: "utterance.articulation.cell" as const,
    potentialAperiodicArticulationCell: Object.freeze([carrier, pairing]) as PotentialAperiodicArticulationCell,
  });
}

/** Type guard: the aperiodic articulation shape with a potential cell whose slots are empty. */
export function isArticulationCell(value: object): value is ArticulationCell {
  const kind = "kind" in value ? value.kind : undefined;
  const cell = "potentialAperiodicArticulationCell" in value ? value.potentialAperiodicArticulationCell : undefined;
  return kind === "utterance.articulation.cell"
    && Array.isArray(cell)
    && cell.length === 2
    && typeof cell[0] === "object"
    && cell[0] !== null
    && "kind" in cell[0]
    && cell[0].kind === "utterance.carrier"
    && Array.isArray(cell[1])
    && cell[1].length === 2
    && Array.isArray(cell[1][0])
    && cell[1][0].length === 0
    && Array.isArray(cell[1][1])
    && cell[1][1].length === 0;
}
