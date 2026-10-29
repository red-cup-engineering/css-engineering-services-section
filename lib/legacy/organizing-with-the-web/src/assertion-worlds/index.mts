import type { ChargeValueName } from "@emsenn/relating";

export type Assertion = Readonly<{
  e: string;
  a: string;
  v: unknown;
  t?: unknown;
}>;

export type AssertionTrace = readonly Assertion[];

export const CONTRARY_PREDICATE = "contrary-to";

export type WorldInput =
  | AssertionTrace
  | Readonly<Record<string, AssertionTrace>>
  | Readonly<{ assertions?: AssertionTrace; log?: AssertionTrace; traces?: Readonly<Record<string, AssertionTrace>> }>;

export type FoldedCell = Readonly<{
  predicate: string;
  object: unknown;
  value: ChargeValueName;
  witnessedBy: ReadonlySet<string>;
}>;

export type Folded = Readonly<{
  entity: string;
  subject: string;
  fiber: readonly FoldedCell[];
}>;

export type SettleOptions = Readonly<{
  functional?: Iterable<string>;
}>;

export type ContraryOptions = Readonly<{
  contrary?: Record<string, string>;
}>;

export type AssertionProvenance = Readonly<{
  source: string;
}>;

export type RecognitionInput =
  | readonly string[]
  | ReadonlySet<string>
  | Record<string, ChargeValueName | boolean | string>
  | ((source: string) => ChargeValueName | boolean | string | undefined);

export function assertAssertion(value: Assertion): Assertion {
  if (typeof value !== "object" || value === null) throw new TypeError("assertion must be an object");
  if (typeof value.e !== "string") throw new TypeError("assertion.e must be a string");
  if (typeof value.a !== "string") throw new TypeError("assertion.a must be a string");
  return Object.freeze({
    e: value.e,
    a: value.a,
    v: value.v,
    ...(value.t === undefined ? {} : { t: value.t }),
  });
}

export function provenanceOf(assertion: Assertion): AssertionProvenance | null {
  const t = assertion.t;
  if (typeof t === "object" && t !== null) {
    const record = t as Record<string, unknown>;
    if (typeof record.source === "string" && record.source) return Object.freeze({ source: record.source });
    if (typeof record.by === "string" && record.by) return Object.freeze({ source: record.by });
    const signature = record.signature;
    if (typeof signature === "object" && signature !== null) {
      const by = (signature as Record<string, unknown>).by;
      if (typeof by === "string" && by) return Object.freeze({ source: by });
    }
  }
  return null;
}

function standingOf(value: ChargeValueName | boolean | string | undefined): ChargeValueName {
  if (value === true) return "potential";
  if (value === false || value === undefined) return "absurd";
  if (value === "absurd" || value === "potential" || value === "active" || value === "stable") return value;
  return value ? "potential" : "absurd";
}

export function recognizerFrom(input: RecognitionInput): (source: string) => ChargeValueName {
  if (typeof input === "function") return (source) => standingOf(input(source));
  if (Array.isArray(input)) {
    const set = new Set(input);
    return (source) => set.has(source) ? "potential" : "absurd";
  }
  if (input instanceof Set) return (source) => input.has(source) ? "potential" : "absurd";
  const record = input as Record<string, ChargeValueName | boolean | string | undefined>;
  return (source) => standingOf(record[source]);
}

function witnessOf(assertion: Assertion): string {
  const provenance = provenanceOf(assertion);
  if (provenance) return provenance.source;
  return typeof assertion.t === "string" ? assertion.t : JSON.stringify(assertion.t ?? null);
}

function cellKey(predicate: string, object: unknown): string {
  return JSON.stringify([predicate, object]);
}

export function settle(subject: string, assertions: AssertionTrace, _options: SettleOptions = {}): Folded {
  const cells = new Map<string, { predicate: string; object: unknown; witnessedBy: Set<string> }>();
  for (const assertion of assertions) {
    const admitted = assertAssertion(assertion);
    if (admitted.e !== subject) continue;
    const key = cellKey(admitted.a, admitted.v);
    const cell = cells.get(key) ?? { predicate: admitted.a, object: admitted.v, witnessedBy: new Set<string>() };
    cell.witnessedBy.add(witnessOf(admitted));
    cells.set(key, cell);
  }
  return Object.freeze({
    subject,
    entity: subject,
    fiber: Object.freeze([...cells.values()].map((cell) => Object.freeze({
      predicate: cell.predicate,
      object: cell.object,
      value: "potential" as const,
      witnessedBy: new Set(cell.witnessedBy),
    }))),
  });
}

export function logFor(world: WorldInput, subject?: string): AssertionTrace {
  const all = Array.isArray(world)
    ? world
    : "assertions" in world && Array.isArray(world.assertions)
      ? world.assertions
      : "log" in world && Array.isArray(world.log)
        ? world.log
        : "traces" in world && world.traces
          ? Object.values(world.traces).flat()
          : Object.values(world as Readonly<Record<string, AssertionTrace>>).flat();
  return Object.freeze((subject === undefined ? all : all.filter((assertion) => assertion.e === subject)).map(assertAssertion));
}

export function subjects(world: WorldInput): readonly string[] {
  return Object.freeze([...new Set(logFor(world).map((assertion) => assertion.e))].sort());
}
