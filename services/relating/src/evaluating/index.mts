/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relating/evaluating` is the RMN reduction engine and type checker.
 *
 * `step` (one-step reducts), `dev` (Takahashi complete development), and
 * `evaluate` (iterate dev to fixed point) implement RelMath.CHL.step and
 * RelMath.CHL.dev. `evaluateRunTerm` is the action-body entry point: admit
 * JSON, apply a run-term, evaluate, decode. The bidirectional type checker
 * (`hasTy`/`checkTy`/`inferTy`) implements the decidable RelMath.CHL.HasTy.
 *
 * The charge reduction rules delegate to the bilattice-charge algebra; the
 * structural data reductions (field/append/coincide/fold) delegate to the
 * bridge helpers exported from evaluating/projecting.
 *
 * Product reading: this is the executable proof-kernel side of the package's
 * behavior-as-data story. A pure carrier morphism can be carried as an RMN
 * body, inspected by TypeDoc and action audits, projected through CLI/HTTP/MCP,
 * and replayed against Lean golden vectors where the package has them. Boundary
 * effects remain outside this evaluator.
 */
import {
  charge,
  chargeValue,
  conflateValue,
  joinKnowledgeValue,
  joinTruthValue,
  leqKnowledge,
  leqTruth,
  meetKnowledgeValue,
  meetTruthValue,
  negateValue,
  type ChargeValueName,
} from "../../lib/articulating/predicating/positing/bilattice-charge.mjs";
import {
  chargeJoinVClosure,
  settleOverValue,
} from "../../lib/articulating/predicating/positing/settling/value-category.mjs";
import { type JsonValue } from "../codecs/text/json/core.mjs";
import { type Tm, type Ty, tm, ty, inst, rename } from "../../lib/notating/index.mjs";
import {
  objectFieldOf,
  arrayConcatOf,
  isValueTerm,
  arrayHeadTail,
  carrierToTerm,
  termToCarrier,
} from "./projecting/index.mjs";

// ── internal helpers ──────────────────────────────────────────────────────────

function dedupe(terms: readonly Tm[]): readonly Tm[] {
  const seen = new Set<string>();
  const out: Tm[] = [];
  for (const term of terms) {
    const key = JSON.stringify(term);
    if (!seen.has(key)) { seen.add(key); out.push(term); }
  }
  return Object.freeze(out);
}

const chargeName = (term: Tm): ChargeValueName | undefined =>
  term[0] === "charge" ? term[1] : undefined;

const unaryChargeStep = (
  ctor: (value: Tm) => Tm,
  op: (value: ReturnType<typeof chargeValue>) => ReturnType<typeof chargeValue>,
  value: Tm,
): readonly Tm[] => {
  const name = chargeName(value);
  const top = name === undefined ? [] : [tm.charge(op(chargeValue(name)).name)];
  return dedupe([...top, ...step(value).map((next) => ctor(next))]);
};

const binaryChargeStep = (
  ctor: (left: Tm, right: Tm) => Tm,
  op: (left: ReturnType<typeof chargeValue>, right: ReturnType<typeof chargeValue>) => ReturnType<typeof chargeValue>,
  left: Tm,
  right: Tm,
): readonly Tm[] => {
  const leftName = chargeName(left);
  const rightName = chargeName(right);
  const top = leftName === undefined || rightName === undefined
    ? []
    : [tm.charge(op(chargeValue(leftName), chargeValue(rightName)).name)];
  return dedupe([
    ...top,
    ...step(left).map((next) => ctor(next, right)),
    ...step(right).map((next) => ctor(left, next)),
  ]);
};

const orderStep = (
  ctor: (left: Tm, right: Tm) => Tm,
  op: (left: ReturnType<typeof charge>, right: ReturnType<typeof charge>) => boolean,
  left: Tm,
  right: Tm,
): readonly Tm[] => {
  const leftName = chargeName(left);
  const rightName = chargeName(right);
  const top = leftName === undefined || rightName === undefined
    ? []
    : [tm.bool(op(charge(chargeValue(leftName)), charge(chargeValue(rightName))))];
  return dedupe([
    ...top,
    ...step(left).map((next) => ctor(next, right)),
    ...step(right).map((next) => ctor(left, next)),
  ]);
};

function devUnaryCharge(ctor: (value: Tm) => Tm, op: (value: ReturnType<typeof chargeValue>) => ReturnType<typeof chargeValue>, value: Tm): Tm {
  const next = dev(value);
  const name = chargeName(next);
  return name === undefined ? ctor(next) : tm.charge(op(chargeValue(name)).name);
}

function devBinaryCharge(
  ctor: (left: Tm, right: Tm) => Tm,
  op: (left: ReturnType<typeof chargeValue>, right: ReturnType<typeof chargeValue>) => ReturnType<typeof chargeValue>,
  left: Tm,
  right: Tm,
): Tm {
  const nextLeft = dev(left);
  const nextRight = dev(right);
  const leftName = chargeName(nextLeft);
  const rightName = chargeName(nextRight);
  return leftName === undefined || rightName === undefined
    ? ctor(nextLeft, nextRight)
    : tm.charge(op(chargeValue(leftName), chargeValue(rightName)).name);
}

function devOrder(ctor: (left: Tm, right: Tm) => Tm, op: (left: ReturnType<typeof charge>, right: ReturnType<typeof charge>) => boolean, left: Tm, right: Tm): Tm {
  const nextLeft = dev(left);
  const nextRight = dev(right);
  const leftName = chargeName(nextLeft);
  const rightName = chargeName(nextRight);
  return leftName === undefined || rightName === undefined
    ? ctor(nextLeft, nextRight)
    : tm.bool(op(charge(chargeValue(leftName)), charge(chargeValue(rightName))));
}

// ── reduction ─────────────────────────────────────────────────────────────────

/** All one-step reducts admitted by RelMath.CHL.step. */
export function step(term: Tm): readonly Tm[] {
  switch (term[0]) {
    case "var":
    case "star":
    case "mark":
    case "charge":
    case "bool":
    case "generator":
      return Object.freeze([]);
    case "lam":
      return dedupe(step(term[1]).map((body) => tm.lam(body)));
    case "app": {
      const top = term[1][0] === "lam" ? [inst(term[1][1], term[2])] : [];
      return dedupe([
        ...top,
        ...step(term[1]).map((fn) => tm.app(fn, term[2])),
        ...step(term[2]).map((arg) => tm.app(term[1], arg)),
      ]);
    }
    case "pair":
      return dedupe([
        ...step(term[1]).map((left) => tm.pair(left, term[2])),
        ...step(term[2]).map((right) => tm.pair(term[1], right)),
      ]);
    case "fst": {
      const top = term[1][0] === "pair" ? [term[1][1]] : [];
      return dedupe([...top, ...step(term[1]).map((value) => tm.fst(value))]);
    }
    case "snd": {
      const top = term[1][0] === "pair" ? [term[1][2]] : [];
      return dedupe([...top, ...step(term[1]).map((value) => tm.snd(value))]);
    }
    case "negate": return unaryChargeStep(tm.negate, negateValue, term[1]);
    case "conflate": return unaryChargeStep(tm.conflate, conflateValue, term[1]);
    case "negConf": return unaryChargeStep(tm.negConf, (value) => negateValue(conflateValue(value)), term[1]);
    case "joinK": return binaryChargeStep(tm.joinK, joinKnowledgeValue, term[1], term[2]);
    case "meetK": return binaryChargeStep(tm.meetK, meetKnowledgeValue, term[1], term[2]);
    case "joinT": return binaryChargeStep(tm.joinT, joinTruthValue, term[1], term[2]);
    case "meetT": return binaryChargeStep(tm.meetT, meetTruthValue, term[1], term[2]);
    case "leK": return orderStep(tm.leK, leqKnowledge, term[1], term[2]);
    case "leT": return orderStep(tm.leT, leqTruth, term[1], term[2]);
    case "settle":
      return binaryChargeStep(
        tm.settle,
        (target, seed) => settleOverValue(chargeJoinVClosure(target), seed),
        term[1],
        term[2],
      );
    case "field": {
      const projected = objectFieldOf(term[2], term[1]);
      return dedupe([
        ...(projected === undefined ? [] : [projected]),
        ...step(term[2]).map((object) => tm.field(term[1], object)),
      ]);
    }
    case "append": {
      const concatenated = arrayConcatOf(term[1], term[2]);
      return dedupe([
        ...(concatenated === undefined ? [] : [concatenated]),
        ...step(term[1]).map((left) => tm.append(left, term[2])),
        ...step(term[2]).map((right) => tm.append(term[1], right)),
      ]);
    }
    case "coincide": {
      const settled = isValueTerm(term[1]) && isValueTerm(term[2]);
      return dedupe([
        ...(settled ? [tm.bool(JSON.stringify(term[1]) === JSON.stringify(term[2]))] : []),
        ...step(term[1]).map((left) => tm.coincide(left, term[2])),
        ...step(term[2]).map((right) => tm.coincide(term[1], right)),
      ]);
    }
    case "cond": {
      const top = term[1][0] === "bool" ? [term[1][1] ? term[2] : term[3]] : [];
      return dedupe([
        ...top,
        ...step(term[1]).map((test) => tm.cond(test, term[2], term[3])),
        ...step(term[2]).map((then) => tm.cond(term[1], then, term[3])),
        ...step(term[3]).map((otherwise) => tm.cond(term[1], term[2], otherwise)),
      ]);
    }
    case "fold": {
      const decomposed = arrayHeadTail(term[3]);
      const top = decomposed === "empty"
        ? [term[2]]
        : decomposed === undefined
          ? []
          : [tm.fold(term[1], tm.app(tm.app(term[1], term[2]), decomposed.head), decomposed.tail)];
      return dedupe([
        ...top,
        ...step(term[1]).map((combine) => tm.fold(combine, term[2], term[3])),
        ...step(term[2]).map((init) => tm.fold(term[1], init, term[3])),
        ...step(term[3]).map((list) => tm.fold(term[1], term[2], list)),
      ]);
    }
  }
}

/** Takahashi complete development, matching RelMath.CHL.dev. */
export function dev(term: Tm): Tm {
  switch (term[0]) {
    case "var": return tm.var(term[1]);
    case "star": return tm.star();
    case "mark": return tm.mark(term[1]);
    case "charge": return tm.charge(term[1]);
    case "bool": return tm.bool(term[1]);
    case "generator": return tm.generator(term[1]);
    case "lam": return tm.lam(dev(term[1]));
    case "app":
      return term[1][0] === "lam"
        ? inst(dev(term[1][1]), dev(term[2]))
        : tm.app(dev(term[1]), dev(term[2]));
    case "pair": return tm.pair(dev(term[1]), dev(term[2]));
    case "fst": return term[1][0] === "pair" ? dev(term[1][1]) : tm.fst(dev(term[1]));
    case "snd": return term[1][0] === "pair" ? dev(term[1][2]) : tm.snd(dev(term[1]));
    case "negate": return devUnaryCharge(tm.negate, negateValue, term[1]);
    case "conflate": return devUnaryCharge(tm.conflate, conflateValue, term[1]);
    case "negConf": return devUnaryCharge(tm.negConf, (value) => negateValue(conflateValue(value)), term[1]);
    case "joinK": return devBinaryCharge(tm.joinK, joinKnowledgeValue, term[1], term[2]);
    case "meetK": return devBinaryCharge(tm.meetK, meetKnowledgeValue, term[1], term[2]);
    case "joinT": return devBinaryCharge(tm.joinT, joinTruthValue, term[1], term[2]);
    case "meetT": return devBinaryCharge(tm.meetT, meetTruthValue, term[1], term[2]);
    case "leK": return devOrder(tm.leK, leqKnowledge, term[1], term[2]);
    case "leT": return devOrder(tm.leT, leqTruth, term[1], term[2]);
    case "settle":
      return devBinaryCharge(
        tm.settle,
        (target, seed) => settleOverValue(chargeJoinVClosure(target), seed),
        term[1],
        term[2],
      );
    case "field": {
      const developed = dev(term[2]);
      const projected = objectFieldOf(developed, term[1]);
      return projected === undefined ? tm.field(term[1], developed) : projected;
    }
    case "append": {
      const left = dev(term[1]);
      const right = dev(term[2]);
      const concatenated = arrayConcatOf(left, right);
      return concatenated === undefined ? tm.append(left, right) : concatenated;
    }
    case "coincide": {
      const a = dev(term[1]);
      const b = dev(term[2]);
      if (isValueTerm(a) && isValueTerm(b)) return tm.bool(JSON.stringify(a) === JSON.stringify(b));
      return tm.coincide(a, b);
    }
    case "cond": {
      const test = dev(term[1]);
      if (test[0] === "bool") return test[1] ? dev(term[2]) : dev(term[3]);
      return tm.cond(test, dev(term[2]), dev(term[3]));
    }
    case "fold": {
      const combine = dev(term[1]);
      const init = dev(term[2]);
      const list = dev(term[3]);
      const decomposed = arrayHeadTail(list);
      if (decomposed === "empty") return init;
      if (decomposed === undefined) return tm.fold(combine, init, list);
      return dev(tm.fold(combine, tm.app(tm.app(combine, init), decomposed.head), decomposed.tail));
    }
  }
}

export function evaluate(term: Tm): Tm {
  let current = term;
  for (let fuel = 0; fuel < 10_000; fuel += 1) {
    const next = dev(current);
    if (JSON.stringify(next) === JSON.stringify(current)) return next;
    current = next;
  }
  throw new Error("eval: development did not reach a fixed point within 10000 iterations");
}

export { evaluate as eval };

/** Apply an action run-term to an admitted input carrier and evaluate it. */
export function evaluateRunTerm(runTerm: Tm, input: JsonValue): JsonValue {
  const normal = evaluate(tm.app(runTerm, carrierToTerm(input)));
  return termToCarrier(normal);
}

// ── type checker ──────────────────────────────────────────────────────────────

/** Structural equality of types. */
export function tyEqual(left: Ty, right: Ty): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Infer the type of an inferable CHL-core term in a context, or null. */
export function inferTy(ctx: readonly Ty[], term: Tm): Ty | null {
  switch (term[0]) {
    case "var": return ctx[term[1]] ?? null;
    case "star": return ty.unit();
    case "app": {
      const fn = inferTy(ctx, term[1]);
      if (fn !== null && fn[0] === "arrow") return checkTy(ctx, term[2], fn[1]) ? fn[2] : null;
      const argTy = inferTy(ctx, term[2]);
      if (argTy !== null && term[1][0] === "lam") return inferTy([argTy, ...ctx], term[1][1]);
      return null;
    }
    case "fst": {
      const product = inferTy(ctx, term[1]);
      return product !== null && product[0] === "prod" ? product[1] : null;
    }
    case "snd": {
      const product = inferTy(ctx, term[1]);
      return product !== null && product[0] === "prod" ? product[2] : null;
    }
    case "pair": {
      const left = inferTy(ctx, term[1]);
      const right = inferTy(ctx, term[2]);
      return left !== null && right !== null ? ty.prod(left, right) : null;
    }
    default: return null;
  }
}

/** Check a CHL-core term against a type — the decidable HasTy. */
export function checkTy(ctx: readonly Ty[], term: Tm, type: Ty): boolean {
  if (term[0] === "lam") return type[0] === "arrow" && checkTy([type[1], ...ctx], term[1], type[2]);
  if (term[0] === "pair") return type[0] === "prod" && checkTy(ctx, term[1], type[1]) && checkTy(ctx, term[2], type[2]);
  const inferred = inferTy(ctx, term);
  if (inferred !== null) return tyEqual(inferred, type);
  if (term[0] === "app") {
    const argTy = inferTy(ctx, term[2]);
    if (argTy !== null && checkTy(ctx, term[1], ty.arrow(argTy, type))) return true;
  }
  return false;
}

/** Whether a CHL-core term proves a proposition (type) in a context — RelMath.CHL.HasTy. */
export const hasTy = (ctx: readonly Ty[], term: Tm, type: Ty): boolean => checkTy(ctx, term, type);

// ── structural analysis ───────────────────────────────────────────────────────

/** Count the total number of nodes in a term. */
export function termSize(term: Tm): number {
  switch (term[0]) {
    case "var": case "star": case "mark": case "charge": case "bool": case "generator": return 1;
    case "lam": case "negate": case "conflate": case "negConf": case "fst": case "snd":
      return 1 + termSize(term[1]);
    case "app": case "pair": case "joinK": case "meetK": case "joinT": case "meetT":
    case "leK": case "leT": case "settle": case "append": case "coincide":
      return 1 + termSize(term[1]) + termSize(term[2]);
    case "field": return 1 + termSize(term[2]);
    case "cond": case "fold": return 1 + termSize(term[1]) + termSize(term[2]) + termSize(term[3]);
  }
}

/** Collect the unique opcode tags used within a term, in sorted order. */
export function termUses(term: Tm): readonly string[] {
  const uses = new Set<string>();
  function collect(t: Tm): void {
    uses.add(t[0]);
    switch (t[0]) {
      case "var": case "star": case "mark": case "charge": case "bool": case "generator": break;
      case "lam": case "negate": case "conflate": case "negConf": case "fst": case "snd":
        collect(t[1]); break;
      case "app": case "pair": case "joinK": case "meetK": case "joinT": case "meetT":
      case "leK": case "leT": case "settle": case "append": case "coincide":
        collect(t[1]); collect(t[2]); break;
      case "field": collect(t[2]); break;
      case "cond": case "fold": collect(t[1]); collect(t[2]); collect(t[3]); break;
    }
  }
  collect(term);
  return Object.freeze([...uses].sort());
}

/** True if the term contains no free de Bruijn variables. */
export function isClosed(term: Tm): boolean {
  function hasFree(t: Tm, depth: number): boolean {
    switch (t[0]) {
      case "var": return t[1] >= depth;
      case "star": case "mark": case "charge": case "bool": case "generator": return false;
      case "lam": return hasFree(t[1], depth + 1);
      case "negate": case "conflate": case "negConf": case "fst": case "snd":
        return hasFree(t[1], depth);
      case "app": case "pair": case "joinK": case "meetK": case "joinT": case "meetT":
      case "leK": case "leT": case "settle": case "append": case "coincide":
        return hasFree(t[1], depth) || hasFree(t[2], depth);
      case "field": return hasFree(t[2], depth);
      case "cond": case "fold":
        return hasFree(t[1], depth) || hasFree(t[2], depth) || hasFree(t[3], depth);
    }
  }
  return !hasFree(term, 0);
}
