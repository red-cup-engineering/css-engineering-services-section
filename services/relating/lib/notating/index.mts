/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relating/notating` is the grammar of Relation Model Notation.
 *
 * Types (Ty) and terms (Tm) as frozen-array JSON s-expressions, the recursive
 * JSON-Schema literals that admit those arrays, and the structural de-Bruijn
 * operations (rename, subst, inst). This is what RMN notation is: no
 * evaluation, no carrier bridge, no pre-built programs.
 *
 * Corresponds to RelMath.CHL.Ty and RelMath.CHL.Tm proven in
 * lean/RelMath/CurryHowardLambekQuartet.lean.
 *
 * Product reading: this is the authored syntax and admission layer for
 * behavior-as-data. Use it when a morphism body needs to be a portable term
 * rather than a JavaScript closure. Validate syntax with `TySchema`/`TmSchema`,
 * manipulate open terms with `rename`/`subst`/`inst`, use
 * `@red-cup-engineering/relating/evaluating` to reduce or type-check those terms, and use
 * `@red-cup-engineering/relating/evaluating/projecting` to cross the JSON carrier boundary.
 */
import { fourCornerNames, type FourCornerName } from "../articulating/four-corner-cell.mjs";
import { type ChargeValueName } from "../articulating/predicating/positing/bilattice-charge.mjs";

// ── type exports ──────────────────────────────────────────────────────────────

export type { ChargeValueName };

export type GeneratorName =
  | "specialization"
  | "converse"
  | "subjectProjection"
  | "objectProjection";

export type UnaryChargeOp = "negate" | "conflate" | "negConf";
export type BinaryChargeOp = "joinK" | "meetK" | "joinT" | "meetT";
export type OrderOp = "leK" | "leT";
export type CHLFormerName = "terminal" | "product" | "exponential" | "dual";

export type Ty =
  | readonly ["base"]
  | readonly ["arrow", Ty, Ty]
  | readonly ["prod", Ty, Ty]
  | readonly ["unit"];

export type Tm =
  | readonly ["var", number]
  | readonly ["lam", Tm]
  | readonly ["app", Tm, Tm]
  | readonly ["pair", Tm, Tm]
  | readonly ["fst", Tm]
  | readonly ["snd", Tm]
  | readonly ["star"]
  | readonly ["mark", string]
  | readonly ["charge", ChargeValueName]
  | readonly ["bool", boolean]
  | readonly ["generator", GeneratorName]
  | readonly [UnaryChargeOp, Tm]
  | readonly [BinaryChargeOp, Tm, Tm]
  | readonly [OrderOp, Tm, Tm]
  | readonly ["settle", Tm, Tm]
  | readonly ["field", string, Tm]
  | readonly ["append", Tm, Tm]
  | readonly ["coincide", Tm, Tm]
  | readonly ["cond", Tm, Tm, Tm]
  | readonly ["fold", Tm, Tm, Tm];

// ── schema carriers ───────────────────────────────────────────────────────────

export const TySchema = {
  $id: "relating/term/ty",
  title: "CHL Ty",
  description: "RelMath.CHL.Ty as a recursive JSON s-expression: base, arrow, prod, unit.",
  anyOf: [
    { type: "array", items: [{ const: "base" }], minItems: 1, maxItems: 1, additionalItems: false },
    { type: "array", items: [{ const: "arrow" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "prod" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "unit" }], minItems: 1, maxItems: 1, additionalItems: false },
  ],
} as const;

export const TmSchema = {
  $id: "relating/term/tm",
  title: "CHL Tm",
  description: "RelMath.CHL.Tm as a recursive de-Bruijn JSON s-expression.",
  anyOf: [
    { type: "array", items: [{ const: "var" }, { type: "integer", minimum: 0 }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "lam" }, { $ref: "#" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "app" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "pair" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "fst" }, { $ref: "#" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "snd" }, { $ref: "#" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "star" }], minItems: 1, maxItems: 1, additionalItems: false },
    { type: "array", items: [{ const: "mark" }, { type: "string" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "charge" }, { enum: ["absurd", "potential", "active", "stable"] }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "bool" }, { type: "boolean" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "generator" }, { enum: ["specialization", "converse", "subjectProjection", "objectProjection"] }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ enum: ["negate", "conflate", "negConf"] }, { $ref: "#" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ enum: ["joinK", "meetK", "joinT", "meetT", "leK", "leT", "settle"] }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "field" }, { type: "string" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "append" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "coincide" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "cond" }, { $ref: "#" }, { $ref: "#" }, { $ref: "#" }], minItems: 4, maxItems: 4, additionalItems: false },
    { type: "array", items: [{ const: "fold" }, { $ref: "#" }, { $ref: "#" }, { $ref: "#" }], minItems: 4, maxItems: 4, additionalItems: false },
  ],
} as const;

export type TyCarrier = Ty;
export type TmCarrier = Tm;

export interface CHLQuartetIsNuclearReceipt {
  readonly kind: "chl.quartetIsNuclear.receipt:witness";
  readonly formers: readonly CHLFormerName[];
  readonly corners: readonly FourCornerName[];
  readonly formerToCorner: Readonly<Record<CHLFormerName, FourCornerName>>;
  readonly cornerToFormer: Readonly<Record<FourCornerName, CHLFormerName>>;
  readonly cornerFormerCorner: true;
  readonly formerCornerFormer: true;
  readonly formersCardFour: 4;
  readonly cornersCardFour: 4;
  readonly nuclearCornerAgree: true;
}

export const chlFormerNames: readonly CHLFormerName[] = Object.freeze(["terminal", "product", "exponential", "dual"] as const);

const chlFormerToCornerMap: Readonly<Record<CHLFormerName, FourCornerName>> = Object.freeze({
  terminal: "potential",
  product: "stable",
  exponential: "active",
  dual: "absurd",
});

const cornerToChlFormerMap: Readonly<Record<FourCornerName, CHLFormerName>> = Object.freeze({
  potential: "terminal",
  active: "exponential",
  stable: "product",
  absurd: "dual",
});

export function chlFormerToCorner(former: CHLFormerName): FourCornerName {
  return chlFormerToCornerMap[former];
}

export function cornerToChlFormer(corner: FourCornerName): CHLFormerName {
  return cornerToChlFormerMap[corner];
}

export function chlQuartetIsNuclearReceipt(): CHLQuartetIsNuclearReceipt {
  const formerRoundTrip = chlFormerNames.every((former) => cornerToChlFormer(chlFormerToCorner(former)) === former);
  const cornerRoundTrip = fourCornerNames.every((corner) => chlFormerToCorner(cornerToChlFormer(corner)) === corner);
  const cornersExhaustive = chlFormerNames.every((former) => fourCornerNames.includes(chlFormerToCorner(former)));
  if (!formerRoundTrip || !cornerRoundTrip || !cornersExhaustive || chlFormerNames.length !== 4 || fourCornerNames.length !== 4) {
    throw new TypeError("chlQuartetIsNuclearReceipt: finite CHL/corner bijection failed");
  }
  return Object.freeze({
    kind: "chl.quartetIsNuclear.receipt:witness" as const,
    formers: chlFormerNames,
    corners: fourCornerNames,
    formerToCorner: chlFormerToCornerMap,
    cornerToFormer: cornerToChlFormerMap,
    cornerFormerCorner: true as const,
    formerCornerFormer: true as const,
    formersCardFour: 4 as const,
    cornersCardFour: 4 as const,
    nuclearCornerAgree: true as const,
  });
}

// ── type constructors ─────────────────────────────────────────────────────────

export const ty = {
  base: (): Ty => Object.freeze(["base"] as const),
  arrow: (domain: Ty, codomain: Ty): Ty => Object.freeze(["arrow", domain, codomain] as const),
  prod: (left: Ty, right: Ty): Ty => Object.freeze(["prod", left, right] as const),
  unit: (): Ty => Object.freeze(["unit"] as const),
} as const;

// ── term constructors ─────────────────────────────────────────────────────────

export const tm = {
  var: (index: number): Tm => {
    if (!Number.isInteger(index) || index < 0) throw new TypeError(`tm.var: de-Bruijn index must be a natural number: ${index}`);
    return Object.freeze(["var", index] as const);
  },
  lam: (body: Tm): Tm => Object.freeze(["lam", body] as const),
  app: (fn: Tm, arg: Tm): Tm => Object.freeze(["app", fn, arg] as const),
  pair: (left: Tm, right: Tm): Tm => Object.freeze(["pair", left, right] as const),
  fst: (value: Tm): Tm => Object.freeze(["fst", value] as const),
  snd: (value: Tm): Tm => Object.freeze(["snd", value] as const),
  star: (): Tm => Object.freeze(["star"] as const),
  mark: (surface: string): Tm => Object.freeze(["mark", surface] as const),
  charge: (name: ChargeValueName): Tm => Object.freeze(["charge", name] as const),
  bool: (value: boolean): Tm => Object.freeze(["bool", value] as const),
  generator: (name: GeneratorName): Tm => Object.freeze(["generator", name] as const),
  negate: (value: Tm): Tm => Object.freeze(["negate", value] as const),
  conflate: (value: Tm): Tm => Object.freeze(["conflate", value] as const),
  negConf: (value: Tm): Tm => Object.freeze(["negConf", value] as const),
  joinK: (left: Tm, right: Tm): Tm => Object.freeze(["joinK", left, right] as const),
  meetK: (left: Tm, right: Tm): Tm => Object.freeze(["meetK", left, right] as const),
  joinT: (left: Tm, right: Tm): Tm => Object.freeze(["joinT", left, right] as const),
  meetT: (left: Tm, right: Tm): Tm => Object.freeze(["meetT", left, right] as const),
  leK: (left: Tm, right: Tm): Tm => Object.freeze(["leK", left, right] as const),
  leT: (left: Tm, right: Tm): Tm => Object.freeze(["leT", left, right] as const),
  settle: (target: Tm, seed: Tm): Tm => Object.freeze(["settle", target, seed] as const),
  field: (key: string, object: Tm): Tm => Object.freeze(["field", key, object] as const),
  append: (left: Tm, right: Tm): Tm => Object.freeze(["append", left, right] as const),
  coincide: (left: Tm, right: Tm): Tm => Object.freeze(["coincide", left, right] as const),
  cond: (test: Tm, then: Tm, otherwise: Tm): Tm => Object.freeze(["cond", test, then, otherwise] as const),
  /** Left fold over an array-encoded list: `fold f init [x₀..xₙ] = f (… (f init x₀) …) xₙ`,
   *  with `f` a curried `λacc.λelem.…`. The one structural recursion (over `Articulating`). */
  fold: (combine: Tm, init: Tm, list: Tm): Tm => Object.freeze(["fold", combine, init, list] as const),
} as const;

// ── structural operations ─────────────────────────────────────────────────────

export function rename(rho: (index: number) => number, term: Tm): Tm {
  switch (term[0]) {
    case "var": return tm.var(rho(term[1]));
    case "lam": return tm.lam(rename((index) => index === 0 ? 0 : rho(index - 1) + 1, term[1]));
    case "app": return tm.app(rename(rho, term[1]), rename(rho, term[2]));
    case "pair": return tm.pair(rename(rho, term[1]), rename(rho, term[2]));
    case "fst": return tm.fst(rename(rho, term[1]));
    case "snd": return tm.snd(rename(rho, term[1]));
    case "star": return tm.star();
    case "mark": return tm.mark(term[1]);
    case "charge": return tm.charge(term[1]);
    case "bool": return tm.bool(term[1]);
    case "generator": return tm.generator(term[1]);
    case "negate": return tm.negate(rename(rho, term[1]));
    case "conflate": return tm.conflate(rename(rho, term[1]));
    case "negConf": return tm.negConf(rename(rho, term[1]));
    case "joinK": return tm.joinK(rename(rho, term[1]), rename(rho, term[2]));
    case "meetK": return tm.meetK(rename(rho, term[1]), rename(rho, term[2]));
    case "joinT": return tm.joinT(rename(rho, term[1]), rename(rho, term[2]));
    case "meetT": return tm.meetT(rename(rho, term[1]), rename(rho, term[2]));
    case "leK": return tm.leK(rename(rho, term[1]), rename(rho, term[2]));
    case "leT": return tm.leT(rename(rho, term[1]), rename(rho, term[2]));
    case "settle": return tm.settle(rename(rho, term[1]), rename(rho, term[2]));
    case "field": return tm.field(term[1], rename(rho, term[2]));
    case "append": return tm.append(rename(rho, term[1]), rename(rho, term[2]));
    case "coincide": return tm.coincide(rename(rho, term[1]), rename(rho, term[2]));
    case "cond": return tm.cond(rename(rho, term[1]), rename(rho, term[2]), rename(rho, term[3]));
    case "fold": return tm.fold(rename(rho, term[1]), rename(rho, term[2]), rename(rho, term[3]));
  }
}

export function subst(sigma: (index: number) => Tm, term: Tm): Tm {
  switch (term[0]) {
    case "var": return sigma(term[1]);
    case "lam": return tm.lam(subst((index) => index === 0 ? tm.var(0) : rename((n) => n + 1, sigma(index - 1)), term[1]));
    case "app": return tm.app(subst(sigma, term[1]), subst(sigma, term[2]));
    case "pair": return tm.pair(subst(sigma, term[1]), subst(sigma, term[2]));
    case "fst": return tm.fst(subst(sigma, term[1]));
    case "snd": return tm.snd(subst(sigma, term[1]));
    case "star": return tm.star();
    case "mark": return tm.mark(term[1]);
    case "charge": return tm.charge(term[1]);
    case "bool": return tm.bool(term[1]);
    case "generator": return tm.generator(term[1]);
    case "negate": return tm.negate(subst(sigma, term[1]));
    case "conflate": return tm.conflate(subst(sigma, term[1]));
    case "negConf": return tm.negConf(subst(sigma, term[1]));
    case "joinK": return tm.joinK(subst(sigma, term[1]), subst(sigma, term[2]));
    case "meetK": return tm.meetK(subst(sigma, term[1]), subst(sigma, term[2]));
    case "joinT": return tm.joinT(subst(sigma, term[1]), subst(sigma, term[2]));
    case "meetT": return tm.meetT(subst(sigma, term[1]), subst(sigma, term[2]));
    case "leK": return tm.leK(subst(sigma, term[1]), subst(sigma, term[2]));
    case "leT": return tm.leT(subst(sigma, term[1]), subst(sigma, term[2]));
    case "settle": return tm.settle(subst(sigma, term[1]), subst(sigma, term[2]));
    case "field": return tm.field(term[1], subst(sigma, term[2]));
    case "append": return tm.append(subst(sigma, term[1]), subst(sigma, term[2]));
    case "coincide": return tm.coincide(subst(sigma, term[1]), subst(sigma, term[2]));
    case "cond": return tm.cond(subst(sigma, term[1]), subst(sigma, term[2]), subst(sigma, term[3]));
    case "fold": return tm.fold(subst(sigma, term[1]), subst(sigma, term[2]), subst(sigma, term[3]));
  }
}

export function inst(body: Tm, value: Tm): Tm {
  return subst((index) => index === 0 ? value : tm.var(index - 1), body);
}
