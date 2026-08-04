# First derived refactor slice: language kernel

The first slice should prove that the architecture can separate a named product span from the roots that realize it.

The product span is RMN/CHL.
The target is not a new `rmn/` directory.
The target is:

```text
lib/language       pure syntax and reduction/type law
lib/calculus       pure charge/order/action calculus used by the language
src/evaluators     package evaluator entrypoints and public dispatch wiring
src/codecs         JSON, Lean JSONL, and carrier/wire encodings
src/carriers       runtime carrier validators for Ty/Tm, if kept registry-backed
apps/workbench     only if an authored term workbench appears
```

## Current Files In The Slice

Pure syntax today:

```text
lib/notating/index.mts
```

It currently owns:

- `Ty`, `Tm`;
- `TySchema`, `TmSchema`;
- term/type constructors;
- `rename`, `subst`, `inst`;
- CHL quartet finite receipt helpers;
- imports from current `lib/articulating/...` charge and four-corner modules.

Pure evaluator mixed with package bridge today:

```text
src/evaluating/index.mts
```

It currently owns:

- `step`, `dev`, `evaluate`;
- `hasTy`, `checkTy`, `inferTy`;
- domain primitive reduction through charge/order/settling functions;
- `evaluateRunTerm`;
- term analysis helpers;
- imports from `src/evaluating/projecting`;
- imports `JsonValue` from `src/writing/json`.

Carrier bridge today:

```text
src/evaluating/projecting/index.mts
```

It currently owns:

- `carrierToTerm`, `termToCarrier`;
- `objectTerm`, `arrayTerm`, `stringTerm`;
- object/array/list bridge helpers used by evaluator reduction;
- JSON canonicalization and parsing through `src/writing/json`.

Lean/vector codecs today:

```text
src/writing/lean/index.mts
test/fixtures/lean-*.jsonl
```

Test proof surfaces today:

```text
test/term.test.mjs
test/lean-conformance.test.mjs
test/codecs.test.mjs
```

## Derived Split

### `lib/language/syntax.mts`

Move from `lib/notating/index.mts`:

- `Ty`;
- `Tm`;
- constructors `ty` and `tm`;
- `rename`;
- `subst`;
- `inst`;
- pure structural term analysis if it does not depend on package realization.

This file may import pure prior strata such as `lib/primitive`, `lib/articulation`, or `lib/calculus`.
It may not import `src/**`.

### `lib/language/schema.mts`

Move from `lib/notating/index.mts`:

- `TySchema`;
- `TmSchema`;
- pure schema literals as carrier shape declarations.

Important distinction:

- the schema literal belongs here as pure carrier shape;
- runtime validator objects built from it belong in `src/carriers`.

### `lib/language/chl.mts`

Move from `src/evaluating/index.mts`:

- CHL-core `step`;
- CHL-core `dev`;
- `evaluate`;
- `tyEqual`;
- `inferTy`;
- `checkTy`;
- `hasTy`;
- `termSize`;
- `termUses`;
- `isClosed`.

But split out reduction rules that need carrier bridge helpers.

The pure CHL kernel can reduce:

- variables;
- lambda/application;
- products;
- unit;
- pure charge/order primitives once their algebra is in `lib/calculus`.

It cannot depend on `src/evaluating/projecting` or `src/writing/json`.

### `lib/language/carrier-encoded-data.mts`

This is the delicate part.

The current language includes term constructors:

```text
field
append
coincide
cond
fold
```

`cond` is pure language.
`fold` is pure language if its list substrate is a term-level product/list law.
`field` and `append` are currently defined against a JSON-carrier encoding in `src/evaluating/projecting`.

Therefore one of two things must be chosen:

1. If object/array encoding is part of the mathematical term language, move the encoding law into `lib/language/carrier-encoded-data.mts` and make `src/codecs/json-term` only serialize/admit JSON to that law.
2. If object/array encoding is only a package bridge, keep `field`/`append` reduction in `src/evaluators` and keep the pure `lib/language` evaluator smaller.

The mathematical evidence points to option 1 for list/product/fold and option 2 for JSON object field projection unless object fields are promoted to a pure finite-record carrier.

This is the first real design fork.
It should be decided by the invariant:

> if the constructor is meaningful over carried relation matter without JSON, it is `lib/language`; if it is meaningful only because JSON was admitted as a wire carrier, it is `src/evaluators` or `src/codecs`.

### `lib/calculus/charge.mts`

The evaluator currently imports charge/order operations from:

```text
lib/articulating/predicating/positing/bilattice-charge.mjs
lib/articulating/predicating/positing/settling/value-category.mjs
```

Those are pure.
Their target is not determined by the old path.

Derived placement:

- FOUR value carrier and knowledge/truth orders: `lib/primitive` or `lib/calculus`;
- bilattice operations: `lib/calculus`;
- settlement-over-value closure: `lib/closure` if it is a closure law, `lib/calculus` only if it is an algebraic operator.

The language kernel imports the resulting pure law.

### `src/evaluators/rmn.mts`

Move from `src/evaluating/index.mts`:

- `evaluateRunTerm`;
- any evaluation entrypoint that accepts package carrier data;
- any reduction step that depends on package bridge helpers;
- public evaluator barrel wiring.

It imports:

```text
lib/language
src/codecs or src/evaluators/json-term
```

It does not define CHL law.

### `src/codecs/json.mts`

Current:

```text
src/writing/json.mts
```

Target:

```text
src/codecs/json.mts
```

It owns:

- canonical JSON bytes;
- parse/require JSON value;
- JSON representation carrier.

### `src/codecs/lean-jsonl.mts`

Current:

```text
src/writing/lean/index.mts
```

Target:

```text
src/codecs/lean-jsonl.mts
```

It owns:

- Lean golden-vector row encoding/decoding;
- row schema realization if runtime-backed;
- no Lean theorem or term law.

### `src/carriers/language.mts`

Move runtime validator construction for:

```text
tyCarrier
tmCarrier
```

The pure schema literals remain in `lib/language/schema.mts`.
The validator/registry-backed objects live here because they are package realization.

## Public Export Target

Current:

```text
./notating   -> dist/lib/notating/index.mjs
./evaluating -> dist/src/evaluating/index.mjs
./writing/lean -> dist/src/writing/lean/index.mjs
```

Target commitments:

```text
./language   -> dist/lib/language/index.mjs
./evaluators -> dist/src/evaluators/index.mjs
./codecs     -> dist/src/codecs/index.mjs
```

The old exports can remain transitional aliases only if explicitly marked as aliases.
They should not continue to determine the architecture.

## Test Split

Pure language tests:

```text
test/language.test.mjs
```

Should import from `@emsenn/relating/language` or direct built pure path during migration and prove:

- `Ty`/`Tm` constructors;
- schema literal shape if pure export is committed;
- `rename`, `subst`, `inst`;
- CHL `step`, `dev`, `evaluate`;
- `hasTy`, `inferTy`, `checkTy`;
- Lean CHL vectors that do not require JSON carrier bridge.

Package evaluator tests:

```text
test/evaluators-rmn.test.mjs
```

Should prove:

- `evaluateRunTerm`;
- JSON-carrier-to-term bridge;
- `field`, `append`, `fold` over admitted JSON carriers if those remain package evaluator operations;
- finite settlement reader terms that depend on package carrier projection.

Codec tests:

```text
test/codecs-json.test.mjs
test/codecs-lean-jsonl.test.mjs
```

Should prove:

- JSON canonicalization and parse idempotence;
- Lean golden-vector JSONL round trip;
- EAVT/Datom/triple wire laws when those move.

Existing tests to keep green during the slice:

```text
node --test test/term.test.mjs
node --test test/lean-conformance.test.mjs
node --test test/codecs.test.mjs
```

Final target gate:

```text
pnpm --filter @emsenn/relating check
pnpm --filter @emsenn/relating build
pnpm --filter @emsenn/relating test
```

## Why This Slice Is Forced

The math says:

- syntax and reduction are not transport;
- carrier bridges are readings/admissions;
- Lean golden vectors are witnesses about finite law, but their JSONL form is a codec;
- evaluation as pure development is different from package action-body execution.

Node says:

- pure surfaces can emit under `dist/lib/language`;
- package evaluator surfaces emit under `dist/src/evaluators`;
- JSON/Lean encodings are package modules with `.mjs` ESM specifiers;
- exports must name the commitments a PNPM consumer can actually import.

Therefore the target is not a stylistic cleanup.
It is the minimum split that stops RMN from being confused with its Node package bridge.
