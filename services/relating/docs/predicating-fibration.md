---
title: "Predicating Fibration"
---

# Predicating Fibration

`@emsenn/relating` now exposes finite predication-fibration witnesses derived from the existing predication-site and FOUR carriers.

This surface covers:

- finite category shadows read from a `PredicationSite`;
- incoming-arrow bundles for finite Yoneda recovery;
- serializable finite valuation fibers keyed by predication-cell signatures;
- reindexing as precomposition along finite embeddings;
- bilattice-homomorphic reindexing witnesses;
- strict Grothendieck-transpose receipts;
- strict-regime temporal two-category and Beck-Chevalley receipts;
- theory-relative ideal restriction witnesses.

The root import exposes matching RMN normalizers as `predicating.*`.

```js
import {
  evaluateRunTerm,
  predicating,
  predicationCategoryShadow,
  yonedaRecovery,
} from "@emsenn/relating";

const category = predicationCategoryShadow(site);
const witness = yonedaRecovery(category, leftCellKey, rightCellKey);

evaluateRunTerm(predicating.yonedaRecovery, witness).kind;
// "predication.yonedaRecovery:witness"
```

## Boundary

This is the finite, carrier-first runtime layer.
It does not claim the full abstract Yoneda lemma for arbitrary small categories, the pseudo-N-coalgebra layer of arbitrary cloven fibrations, or non-strict temporal pseudo-natural transformations.
Those remain Lean/proof-side structure.
Runtime parity is limited to finite witnesses derived from the package's own predication sites, embeddings, and charge-valued valuation fibers.
