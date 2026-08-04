declare module "@red-cup-engineering/relation-model-notation" {
  export type Ty =
    | readonly ["base"]
    | readonly ["arrow", Ty, Ty]
    | readonly ["prod", Ty, Ty]
    | readonly ["unit"]
    | readonly ["list", Ty];

  export type Tm =
    | readonly ["var", number]
    | readonly ["lam", Tm]
    | readonly ["app", Tm, Tm]
    | readonly ["pair", Tm, Tm]
    | readonly ["fst", Tm]
    | readonly ["snd", Tm]
    | readonly ["star"]
    | readonly ["mark", string]
    | readonly ["coincide", Tm, Tm]
    | readonly ["cond", Tm, Tm, Tm]
    | readonly ["fold", Tm, Tm, Tm];

  export const ty: {
    base(): Ty;
    arrow(domain: Ty, codomain: Ty): Ty;
    prod(left: Ty, right: Ty): Ty;
    unit(): Ty;
    list(element: Ty): Ty;
  };

  export const tm: {
    var(index: number): Tm;
    lam(body: Tm): Tm;
    app(fn: Tm, arg: Tm): Tm;
    pair(left: Tm, right: Tm): Tm;
    fst(value: Tm): Tm;
    snd(value: Tm): Tm;
    star(): Tm;
    mark(surface: string): Tm;
    coincide(left: Tm, right: Tm): Tm;
    cond(test: Tm, thenTerm: Tm, elseTerm: Tm): Tm;
    fold(combine: Tm, initial: Tm, list: Tm): Tm;
    field(name: string, record: Tm): Tm;
  };
}

declare module "@red-cup-engineering/relation-model-notation-typing" {
  import type { Tm, Ty } from "@red-cup-engineering/relation-model-notation";
  export function tyEqual(left: Ty, right: Ty): boolean;
  export function inferTy(context: readonly Ty[], term: Tm): Ty | null;
  export function checkTy(context: readonly Ty[], term: Tm, type: Ty): boolean;
  export const hasTy: typeof checkTy;
  export function termSize(term: Tm): number;
  export function termUses(term: Tm): readonly string[];
  export function isClosed(term: Tm): boolean;
}

declare module "@red-cup-engineering/relation-model-notation-json-codec" {
  import type { Tm, Ty } from "@red-cup-engineering/relation-model-notation";
  import type { JsonValue } from "@red-cup-engineering/json-file-codec-service";
  export function arrayTerm(items: readonly Tm[]): Tm;
  export function objectTerm(entries: ReadonlyArray<readonly [string, Tm]>): Tm;
  export function stringTerm(value: string): Tm;
  export function projectField(fieldNames: readonly string[], key: string, objectValue: Tm): Tm;
  export function objectTy(fieldNames: readonly string[], fieldTypes?: Readonly<Record<string, Ty>>): Ty;
  export function arrayTy(itemTypes: readonly Ty[]): Ty;
  export function jsonToTerm(value: JsonValue): Tm;
  export function termToJson(term: Tm): JsonValue;
}
