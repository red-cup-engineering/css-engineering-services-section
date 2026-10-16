# Web taxonomy receiving evidence — 2026-10-16

This is a source-only draft for independent review, not full native package
qualification. The implementation checkpoint is
`083c155fdf38f68a0024992e8a752cea08237671`; requirements/design preceded it
in `e289bb3`. The PR adds the supplier-audit correction and these receipts.
The destination base is `b3ddd1b45b0567b0e5dc6d393dccad40ee3c725c`.

## What passed

- Focused production and test compilation under the package's strict settings.
- All **14 acceptance cases** at 09:58:49 UTC: the original seven source cases,
  all 16 knowledge joins and repeated/opposite-order evidence, knowledge-family
  rejection, absent/denied/affirmed/contested membership, custom predicates,
  ordering, archives, escaping, current HTTP negotiation (including 404/406),
  and the pinned SWARM positive/negative/both/neither pure projections.
- The actual current HTTP 0.6.2 Fetch engine and Node transport served the
  taxonomy resources on loopback. Taxonomy now returns standard Responses;
  it preserves representation bodies, content types and public 300-second
  caching. This does not migrate SWARM's old req/res/send adapter.
- A real diagnostic npm tarball's `/taxonomy` import exposed all 12 source
  functions and preserved contested membership. A separate strict TypeScript
  consumer passed with `skipLibCheck=false`, including rejection of a truth
  reading assigned to the knowledge-only cell type.
- The portable fixture generator reproduced the previously tested SWARM
  fixture and provenance byte-for-byte from the three pinned Git blobs.
- Forty-four source files matched the acceptance snapshot byte-for-byte before
  the publication audit. The new audit script does not change production code.

See `taxonomy-acceptance.log`, `receiving-commands.json`,
`publication-commands.json`, and `publication-source-hashes.json`.
Focused tsconfig files are included so their scope is reviewable.

## URI admission review follow-up

Independent review identified an intentional migration that the specification
had incorrectly described as equivalent validation. Canonical `assertHttpUrl`
requires well-formed Unicode. Legacy `new URL` parsing accepted lone surrogates
in a URL path by replacement-character normalization. The requirement and
specification now document the stricter refusal explicitly.

The new scenario admits ordinary HTTP(S), non-ASCII text and paired-surrogate
URLs, preserves admitted item strings, and refuses lone high/low surrogates
through indexing, related-item validation, app construction and archive base
validation. It also demonstrates the legacy replacement-character result.
Production code and the URI owner are unchanged; the validation is not weakened.

Both focused compilations and all **15 acceptance cases** pass in the latest
run under the existing exclusive compute lease. See `uri-review-acceptance.log`
and `uri-review-receipt.json` for commands, times and the changed test's hash.
The prior 14-case and packed-import receipts remain historical evidence;
production source is byte-identical to that accepted snapshot. Native baseline
repair and full native qualification remain outstanding.

## Native package failures remain

The unchanged base and current source use the same existing dependencies.
After line-number normalization they have **13 distinct check diagnostics and
11 distinct build diagnostics**, with no added or removed diagnostics.
`npm run test` stops at the same build failure; the full native suite therefore
did not execute. The publication check/build/test calls all exited 2.

The failures concern removed Animating algebra/lesson/assertion-world exports,
Relating's missing codecs/declarations, and existing webmention test references
to BodyInit/HeadersInit. `publication-native-diagnostics.json` contains both
sets, not just counts. No stubs or fabricated declarations were added.

The qualification environment resolves Animating **0.3.0** and Relating
**0.10.8** through existing local owner links. At 10:11:11 UTC, both manifests
were tracked in the agent-organization-engine checkout at
`4181ee46317d32bb589af897bed458f5675d6466`, with no tracked changes in either
package scope. `baseline-owner-identities.json` records paths, manifest Git
blobs, export maps and the read-only Git results. These are source-owner links,
not the immutable Data package identity described below.

Normal `npm pack --json` also exited 2 in prepack. The separate
`npm pack --ignore-scripts --json` was a **diagnostic import experiment** on
emitted files. It neither passes the prepack gate nor qualifies a release.
Its archive SHA-256 is
`072e008b3c738f19e559f3a1371ebee019640f37811f77875adbc920b1644bfa`.
Only its compact identity is included here, not the tarball.

## Installed supplier versus pinned source

The Data package actually exercised is the already-installed
`@red-cup-engineering/computer-data-engineering-services-section@0.2.0`
in immutable runtime
`/gnu/store/082w7cllxg9pi4jydyy4npr2k21dmrjm-registry-runtime`.

| Identity | Value |
| --- | --- |
| Pinned source commit | `d974d4ec978a9da73c51ac3f958cdbc10f254e23` |
| Pinned `src/four.mjs` Git blob | `680fdd6f16dd1442761f03dfb99202b172026ce8` |
| Installed `src/four.mjs` Git blob | `b49729a25ec092c8cd3d56a8a50d60a4d079861a` |
| Installed file size | 29,436 bytes |
| Locked tarball integrity | `sha512-fHoL1GrjGExKOuVosgLfUl0HK6WVQ1EZcOrR4LkC6XN6dUBbvOtA7n+mupaqvSSErWdDENL6SCPiiApgCaUOTQ==` |

The files are **not byte-identical**. The corrected supplementary audit
compares all 16 joins directly, checks every result belongs to the knowledge
family, and requires both providers to throw the exact mixed-family TypeError:
`four: potential (knowledge) and true (truth) are named in different families`.
This corrects the audit's singular-word regex; it does not relax the supplier
contract or substitute a different operation. All comparisons pass.
The production boundary still loads the genuine export as unknown and checks
its function and each result; its static cell type remains knowledge-only.

At 10:06:46 UTC, all **32 installed package files** matched their sizes and
SHA-512 digests in the existing pnpm index entry keyed by the locked tarball
integrity. Both immutable lockfiles carry that same integrity. The read-only
integrity audit and resulting receipt are included.

This establishes agreement with the existing local package-integrity records.
It does **not** independently rehash the original tarball or establish a
release Git commit. The installed manifest has neither gitHead nor repository;
the inspected index supplies no source commit. In particular, the installed
artifact is not attributed to d974d4ec. The cached registry metadata inspected
was older (0.1.0 only) and supplies no additional 0.2.0 provenance.
Retain this limit for independent review.

## Scope and continuation

Before publication, main remained at the recorded base. Open PRs 111, 110 and
13 retained heads `332ed81d94ce7fe7e9df7afc47bb3fec51122959`,
`68692c9ffef06927784c16b8811fa0d581073769`, and
`ecca6cbbd22d33ad612ba21f8caba1a058f4defd`; their 1/19/29 listed changed
files do not overlap this increment. The checked workflows are path-scoped
outside this change; commits retain the existing [skip ci] publication convention.

The accountable carrier remains
[Operations issue 10](https://github.com/coesite-operations/operations-services-section/issues/10).
Source authorship/history and the source repository remain preserved.
Independent review, unrelated native owner-contract repair and eventual
consumer disposition remain outstanding. No merge, release, deployment, live
traffic, access changes or legacy retirement is performed by this increment.

All qualification used existing dependencies and the established exclusive
compute lease. No packages were installed. Commands and observation times are
in the receipts; local paths are nonsecret execution evidence.

