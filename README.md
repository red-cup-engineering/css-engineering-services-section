# @561-group/web-taxonomy

Taxonomy indexes, archive pages, related-content scoring, and web-server
resources.

The package groups content items by scheme and term, projects finite algebras
into four-valued taxonomy relations, computes membership and related-subject
views, builds archive pages with pagination links, and exposes taxonomy index
and archive resources through `@561-group/web-server`.

## Package Boundary

Source is authored as `.mts` and built to `dist/index.mjs` with
`dist/index.d.ts` declarations. The package root is the public API:

- `@561-group/web-taxonomy`

Published consumers do not need TypeScript source loading or workspace-only
`src` paths.
