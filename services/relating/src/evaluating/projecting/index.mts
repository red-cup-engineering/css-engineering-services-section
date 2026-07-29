/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relating/evaluating/projecting` is the bridge between JSON carriers
 * and RMN terms.
 *
 * `carrierToTerm` admits a JSON value into the term layer; `termToCarrier`
 * decodes a normal-form term back to JSON. `evaluateRunTerm` is the single
 * entry point for running an action body: admit the input, apply the term,
 * evaluate, decode.
 *
 * Arrays and objects encode as tagged-pair spines with sentinel marks; the
 * encoding is deterministic (object keys sorted), so the same JSON value
 * always produces the same term. The internal bridge helpers (objectFieldOf,
 * arrayConcatOf, etc.) are exported for the evaluating engine, which needs
 * them to reduce field/append/coincide/fold over bridge-encoded data.
 *
 * Product reading: this is not a schema validator or a general serializer. It
 * is the deterministic crossing from already-admitted carrier data into the
 * typed total term substrate, and back out after evaluation.
 */
import { type JsonValue } from "../../codecs/text/json/core.mjs";
import { canonical, parse } from "../../codecs/text/json/core.mjs";
import { type ChargeValueName, isChargeValueName } from "@lenticule-science/articulating/predicating/positing/bilattice-charge";
import { type Tm, tm } from "../../../lib/notating/index.mjs";

export const arrayTag = "relating.term.array";
export const objectTag = "relating.term.object";

export function listTerm(items: readonly Tm[]): Tm {
  return items.reduceRight<Tm>((tail, item) => tm.pair(item, tail), tm.star());
}

export function termList(term: Tm): readonly Tm[] {
  const out: Tm[] = [];
  let current = term;
  while (current[0] === "pair") {
    out.push(current[1]);
    current = current[2];
  }
  if (current[0] !== "star") throw new TypeError(`termToCarrier: malformed product list ${JSON.stringify(term)}`);
  return Object.freeze(out);
}

function markString(term: Tm): string | undefined {
  if (term[0] !== "mark") return undefined;
  const value = parse(term[1]);
  return typeof value === "string" ? value : undefined;
}

/** Project the value of a named field from an object-encoded term. Used by the evaluating engine for `field` reduction. */
export function objectFieldOf(term: Tm, key: string): Tm | undefined {
  if (term[0] !== "pair" || term[1][0] !== "mark" || term[1][1] !== canonical(objectTag)) return undefined;
  const wanted = canonical(key);
  let entries = term[2];
  while (entries[0] === "pair") {
    const entry = entries[1];
    if (entry[0] === "pair" && entry[1][0] === "mark" && entry[1][1] === wanted) return entry[2];
    entries = entries[2];
  }
  return undefined;
}

/** Whether a term is a fully-reduced value (closed data). Used by the evaluating engine for `coincide` reduction. */
export function isValueTerm(t: Tm): boolean {
  switch (t[0]) {
    case "mark":
    case "bool":
    case "charge":
    case "generator":
    case "star":
      return true;
    case "pair":
      return isValueTerm(t[1]) && isValueTerm(t[2]);
    default:
      return false;
  }
}

function appendList(listA: Tm, listB: Tm): Tm {
  if (listA[0] === "star") return listB;
  if (listA[0] === "pair") return tm.pair(listA[1], appendList(listA[2], listB));
  return listA;
}

/** Concatenate two array-encoded carrier terms. Used by the evaluating engine for `append` reduction. */
export function arrayConcatOf(a: Tm, b: Tm): Tm | undefined {
  const tag = canonical(arrayTag);
  if (a[0] !== "pair" || a[1][0] !== "mark" || a[1][1] !== tag) return undefined;
  if (b[0] !== "pair" || b[1][0] !== "mark" || b[1][1] !== tag) return undefined;
  return tm.pair(tm.mark(tag), appendList(a[2], b[2]));
}

/** Decompose an array-encoded carrier term for `fold`. Used by the evaluating engine. */
export function arrayHeadTail(term: Tm): "empty" | { readonly head: Tm; readonly tail: Tm } | undefined {
  const tag = canonical(arrayTag);
  if (term[0] !== "pair" || term[1][0] !== "mark" || term[1][1] !== tag) return undefined;
  const spine = term[2];
  if (spine[0] === "star") return "empty";
  if (spine[0] === "pair") return { head: spine[1], tail: tm.pair(tm.mark(tag), spine[2]) };
  return undefined;
}

// ── public builder API ────────────────────────────────────────────────────────

/** Build an object-carrier term (matching carrierToTerm's object encoding). */
export function objectTerm(entries: ReadonlyArray<readonly [string, Tm]>): Tm {
  const sorted = [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return tm.pair(
    tm.mark(canonical(objectTag)),
    listTerm(sorted.map(([key, value]) => tm.pair(tm.mark(canonical(key)), value))),
  );
}

/** Build an array-carrier term (matching carrierToTerm's array encoding). */
export function arrayTerm(items: readonly Tm[]): Tm {
  return tm.pair(tm.mark(canonical(arrayTag)), listTerm(items));
}

/** Admit a string literal exactly as the bridge encodes one (an opaque mark). */
export function stringTerm(value: string): Tm {
  return tm.mark(canonical(value));
}

// ── bridge ────────────────────────────────────────────────────────────────────

/** Admit a JSON carrier into the term layer. */
export function carrierToTerm(value: JsonValue): Tm {
  if (value === null) return tm.star();
  if (typeof value === "boolean") return tm.bool(value);
  if (typeof value === "string" && isChargeValueName(value)) return tm.charge(value as ChargeValueName);
  if (typeof value === "string" || typeof value === "number") return tm.mark(canonical(value));
  if (Array.isArray(value)) {
    return tm.pair(tm.mark(canonical(arrayTag)), listTerm(value.map((item) => carrierToTerm(item))));
  }
  const record = value as { readonly [key: string]: JsonValue };
  const entries = Object.keys(record).sort().map((key) =>
    tm.pair(tm.mark(canonical(key)), carrierToTerm(record[key] as JsonValue)));
  return tm.pair(tm.mark(canonical(objectTag)), listTerm(entries));
}

/** Decode a normal-form term back to an admitted JSON carrier. */
export function termToCarrier(term: Tm): JsonValue {
  if (term[0] === "mark") return parse(term[1]);
  if (term[0] === "bool") return term[1];
  if (term[0] === "charge") return term[1];
  if (term[0] === "generator") return term[1];
  if (term[0] === "star") return null;
  if (term[0] === "pair") {
    const tag = markString(term[1]);
    if (tag === arrayTag) return termList(term[2]).map((item) => termToCarrier(item));
    if (tag === objectTag) {
      const out: Record<string, JsonValue> = {};
      for (const entry of termList(term[2])) {
        if (entry[0] !== "pair") throw new TypeError(`termToCarrier: malformed object entry ${JSON.stringify(entry)}`);
        const key = markString(entry[1]);
        if (key === undefined) throw new TypeError(`termToCarrier: object key is not an opaque string mark ${JSON.stringify(entry[1])}`);
        out[key] = termToCarrier(entry[2]);
      }
      return out;
    }
    return [termToCarrier(term[1]), termToCarrier(term[2])];
  }
  throw new TypeError(`termToCarrier: cannot decode normal form ${JSON.stringify(term)}`);
}
