# Derived boundary check findings

Command:

```text
node dev/scripts/check-derived-boundaries.mjs
```

Current result after the first root-mode slice: passing.

The original failing output is kept below as migration history because it
identified the seams that were corrected.

Passing evidence:

```text
node dev/scripts/check-derived-boundaries.mjs
derived boundary check passed
```

The first slice corrected:

- pure `lib` imports of `src/typing/carrier` by introducing `lib/primitive/schema.mts`;
- comment-only package self-import false positives by stripping comments in the checker;
- process entrypoints by moving `scripts/cli.mts` and `scripts/serve.mts` to `services/cli/main.mts` and `services/http/main.mts`.

## Findings

`lib` imports package self-surfaces:

```text
lib/articulating/predicating/geometry/spatial/index.mts -> @emsenn/relating/articulating
lib/articulating/predicating/geometry/spatial/index.mts -> @emsenn/relating/writing
lib/articulating/predicating/index.mts -> @emsenn/relating
lib/articulating/predicating/positing/settling/analysis/index.mts -> @emsenn/relating/analysis
lib/articulating/predicating/positing/settling/analysis/index.mts -> @emsenn/relating
lib/articulating/predicating/positing/settling/closure.mts -> @emsenn/relating/settling
```

Meaning:

- pure derivation modules are depending on package export surfaces;
- package barrels are being used as import conveniences inside the pure body;
- this violates the rule that exports are commitments, not internal source structure.

Target correction:

- replace self-surface imports with direct lower-stratum pure imports;
- if the imported thing is a package realization, move the caller out of `lib`;
- if the import is only for a codec/projection, move that portion to `src/codecs` or `src/projections`.

`lib` imports `src/typing/carrier`:

```text
lib/articulating/predicating/positing/fiber.mts -> ../../../../src/typing/carrier.mjs
lib/articulating/predicating/positing/settling/monotonicity-certificate.mts -> ../../../../../src/typing/carrier.mjs
lib/articulating/utterance.mts -> ../../src/typing/carrier.mjs
```

Meaning:

- runtime carrier realization has leaked into pure schema/carrier declarations;
- these files are currently mixing pure carrier shape with package validator machinery.

Target correction:

- pure schema literals stay in `lib/<stratum>`;
- `carrierFrom` calls move to `src/carriers`;
- carrier registry effects move to `src/registries`.

`scripts` is a non-target root:

```text
scripts/cli.mts
scripts/serve.mts
```

Meaning:

- current process entrypoints are under a historical scripts root;
- the target process root is `services`.

Target correction:

```text
scripts/cli.mts   -> services/cli/main.mts
scripts/serve.mts -> services/http/main.mts
```

with matching updates to:

```text
tsconfig.services.json
package.json bin
package.json build chmod targets
copy-dist-assets.mjs source roots
```

## Architectural Reading

These failures are not incidental.
They identify the first real code seams:

1. Carrier shapes must be split from runtime carrier realization.
2. Pure `lib` modules must stop importing public package self-surfaces.
3. Process entrypoints must move from `scripts` to `services`.

The checker therefore gives a concrete verification target for the refactor:

```text
node dev/scripts/check-derived-boundaries.mjs
```

should pass after the root-mode split is complete.
