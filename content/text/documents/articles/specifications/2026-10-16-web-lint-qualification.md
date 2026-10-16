# Exact lint qualification and packed consumer gate reliability

Base: merged PR124, ea120f8011bb420e87f4f9f4a4f015270194c369.
The source package trees match the previously qualified prepared source.

Use ESLint 10.4.1, @eslint/js 10.0.1 and typescript-eslint 8.61.0: these
are the existing declared lower bounds, with the last already exact in HTTP.
The existing publication owner's registry reader establishes exact identities,
engines, peers and advertised SHA-512 integrity. Node 24.19.0 and TypeScript
5.9.3 satisfy those engine/peer declarations.

An isolated tooling manifest may acquire these versions through ordinary pnpm
11.19.0 installation, lifecycle scripts disabled. Its generated pnpm lock is
tooling qualification evidence, not a Web/HTTP consumer release lock. Preserve
existing registry, minimum release age and security defaults; stop on policy
rejection without exclusions, alternate acquisition or changing versions.

Run each actual authored ESLint configuration against both the accepted source
and prepared source. Record any baseline defects without widening this change
into lint cleanup or changing the rules. Only admit exact pins after successful
installation and configuration exercise; preserve all source behavior, tests,
exports, normal prepack and both private markers.

The existing qualify-preparation.py must raise when either packed-runtime or
packed-types returns nonzero. Demonstrate both failure branches and the all-zero
branch using the actual gate implementation; retain earlier successful receipts
as historical results. Previous recorded exits were zero, so this correction
improves future qualification reliability.

Publication and private-marker removal remain held pending audience authority.
The two package identities are still absent from their canonical registry. No
downstream release receiving, migration, deployment or unrelated effect is
authorized by this increment.

## Received result

The ordinary isolated install succeeded without age/security exceptions. Its
generated lock contains the 90 admitted tooling packages. Registry SHA-512
identities match both lock entries and pnpm content-addressed store keys; the
three installed lint package manifests match those exact identities.

All four actual lint runs passed without errors or warnings: accepted and
prepared Web each checked 42 files; accepted and prepared HTTP each checked
34. The authored configurations define no explicit lint rules; this result
establishes their parser/project-service execution, not additional style or
semantic rules. No configuration or source cleanup was needed.

The five ranged declarations are now exact. Fresh native acceptance retains
95 passing tests, both normal prepack lifecycles, 20 runtime and 19 typed Web
exports. Both owner module graphs pass and both dependency manifest assays
have zero violations. The actual packed gate implementation and call sites
reject runtime exit 17 and type-check exit 23; only zero/zero continues.
All source and test files, versions and private markers are unchanged.

Evidence: data/records/receiving/web-lint-qualification-2026-10-16/.
