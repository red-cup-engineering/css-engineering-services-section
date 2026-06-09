# @561-group/web-triple-pattern-fragments

Triple Pattern Fragment helpers and web resources over four-valued memetic assertion
worlds.

The package settles memetic federation assertions into affirmed, denied, and
contradicted triples, filters them by triple pattern and witness, paginates the
result, and renders JSON, JSON-LD/Hydra, and Turtle fragments through
`@561-group/web-server`.

## Package Boundary

Source is authored as `.mts` and built to `dist/index.mjs` with
`dist/index.d.ts` declarations. The package root is the public API:

- `@561-group/web-triple-pattern-fragments`

Published consumers do not need TypeScript source loading or workspace-only
`src` paths.
