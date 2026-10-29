declare module "@red-cup-engineering/relation-model-notation" {
  type JsonValue = import("@red-cup-engineering/json-file-codec-service").JsonValue;
  export type Tm = JsonValue;
  export type Ty = JsonValue;

  export const TmSchema: Record<string, unknown> & { readonly $id: string };
  export const TySchema: Record<string, unknown> & { readonly $id: string };
  export function isTerm(value: unknown): value is Tm;
  export const ty: {
    base(): Ty;
    arrow(domain: Ty, codomain: Ty): Ty;
    prod(left: Ty, right: Ty): Ty;
    unit(): Ty;
    list(element: Ty): Ty;
  };
  export const tm: Record<string, (...args: never[]) => Tm> & {
    var(index: number): Tm;
    lam(body: Tm): Tm;
    app(fn: Tm, arg: Tm): Tm;
    pair(left: Tm, right: Tm): Tm;
    fst(value: Tm): Tm;
    snd(value: Tm): Tm;
    star(): Tm;
    mark(surface: string): Tm;
  };
  export const chargeValueNames: readonly string[];
  export function isChargeValueName(value: string): boolean;
  export function generatorNameOfTerm(term: Tm): string | undefined;
  export function chargeNameOfTerm(term: Tm): string | undefined;
  export function boolOfTerm(term: Tm): boolean | undefined;
  export function rename(rho: (index: number) => number, term: Tm): Tm;
  export function subst(sigma: (index: number) => Tm, term: Tm): Tm;
  export function inst(body: Tm, value: Tm): Tm;
}

declare module "@red-cup-engineering/relation-model-notation/schema" {
  export const TmSchema: Record<string, unknown> & { readonly $id: string };
  export const TySchema: Record<string, unknown> & { readonly $id: string };
}

declare module "@red-cup-engineering/relation-model-notation-eval" {
  type JsonValue = import("@red-cup-engineering/json-file-codec-service").JsonValue;
  type Tm = import("@red-cup-engineering/relation-model-notation").Tm;
  export function step(term: Tm): readonly Tm[];
  export function dev(term: Tm): Tm;
  export function normalize(term: Tm): Tm;
  export function evaluate(term: Tm): Tm;
  export { evaluate as eval };
  export function evaluateRunTerm(runTerm: Tm, input: JsonValue): JsonValue;
}

declare module "@red-cup-engineering/relation-model-notation-typing" {
  type Tm = import("@red-cup-engineering/relation-model-notation").Tm;
  type Ty = import("@red-cup-engineering/relation-model-notation").Ty;
  export function tyEqual(left: Ty, right: Ty): boolean;
  export function inferTy(ctx: readonly Ty[], term: Tm): Ty | null;
  export function checkTy(ctx: readonly Ty[], term: Tm, type: Ty): boolean;
  export const hasTy: typeof checkTy;
  export function termSize(term: Tm): number;
  export function termUses(term: Tm): readonly string[];
  export function isClosed(term: Tm): boolean;
}
