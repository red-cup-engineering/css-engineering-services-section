---
title: Receive the complete Web taxonomy capability
date-created: 2026-10-16
type: specification
status: implementation and receiving in progress; no consumer retirement
part-of: computer-web-engineering-services-section
version: 0.1.0
requirements:
  - receive-complete-web-taxonomy
accountable-carrier: https://github.com/coesite-operations/operations-services-section/issues/10
---

# Requirements and receiving design

This increment receives the complete `emsenn/web-taxonomy` API into
`services/web-protocol-services-section/services/computing-with-the-web`.
The source is preserved at commit `3834b98d2cdb85b85e49b9ee601c58040c49576d`;
implementation blob `3ef74ce51eb2b5c8e5fdf7cad0f2826798bce470`, original
seven-case test blob `26a3296340eb7dd4e212d9addb2a9c4c871993c7`.
Authorship remains attributed to the source repository and its history. This is
a receiving increment, not permission to retire that repository or migrate a
live consumer.

The destination was reconciled at main
`b3ddd1b45b0567b0e5dc6d393dccad40ee3c725c`. Open PRs 111
(`332ed81d94ce7fe7e9df7afc47bb3fec51122959`), 110
(`68692c9ffef06927784c16b8811fa0d581073769`), and 13
(`ecca6cbbd22d33ad612ba21f8caba1a058f4defd`) do not list the receiving
package among their changed paths. Their scopes remain outside this increment.
The existing Operations issue 10 remains the accountable carrier.

## Required capability

| Requirement | Receiving condition |
| --- | --- |
| R1 Complete public surface | Preserve all exported source types and functions, ordinary scheme indexing, slugs, item ordering, pagination, related ranking, escaped archive HTML, and negotiated JSON/HTML resources. Publish the receiving entry as `/taxonomy`. |
| R2 Knowledge family | `absurd=(0,0)`, `potential=(1,0)`, `active=(0,1)`, `stable=(1,1)`. Missing cells read absurd. Merging delegates to Data's knowledge join; other reading families cannot enter the public cell type. |
| R3 Relation semantics | Preserve custom/default predicates, subject order, deterministic term order, potential-only members/termsOf/related, stable contested membership, duplicate/idempotent evidence and opposite-order evidence. |
| R4 Owner composition | Use real Data 0.2.0 `/four`, URI, HTML and HTTP owners where equivalent. Reuse pagination contracts without inventing a second institutional carrier. |
| R5 Consumer evidence | Exercise SWARM's actual positive/negative/both/neither projections and ordinary archive/relation-document behavior from pinned source; record the old HTTP adapter as an unresolved live-consumer migration. |
| R6 Reviewable delivery | Original seven tests, exhaustive 16 joins, escaping/ordering/custom-path tests, genuine current HTTP negotiation including 404/406, native check/build/test, and a packed subpath import with TypeScript consumption. Record unavailable prerequisites explicitly. Independent review precedes merge. |

## Grounding and boundary

Data owns the operation:
`red-cup-engineering/computer-data-engineering-services-section@d974d4ec978a9da73c51ac3f958cdbc10f254e23`,
`src/four.mjs`, blob `680fdd6f16dd1442761f03dfb99202b172026ce8`.
Its `knowledgeJoinReading` joins evidence sides by Boolean OR and rejects
cross-family operands. Historical taxonomy `mergeCell` is this operation with
missing input replaced by absurd; it is not a second algebra to retain.

The authoritative naming and operation were read at
`lenticule-science/obsmetrologia@e83a68d1afd35732e9632fb8f300cc994320b5bc`:
`docs/history/corner-naming-convention.md` (including its 2026-10-06
amendment), `Obsmetrologia/Articulation/Articulating/Cell.lean`, and
`Charge.joinK` in `Obsmetrologia/Language/Positing/Charge.lean`.
Taxonomy displays a finite Web input projection; `FiniteAlgebra` neither
admits institutional facts nor establishes proofs, witnesses or authority.
A stable input records already-contested input; receiving it is not creation
of a foundational told-both cell.

Data 0.2.0 exposes JavaScript without declarations. The Node package already
requires Node >=22.18. A private boundary uses Node's supported synchronous ESM
loader (`createRequire`) on the genuine exported `/four` package path.
The module, selected function and each result are checked; values enter as
`unknown` and only the four knowledge names leave. No ambient declaration,
unchecked cast, replacement operation or mock dependency supplies this
contract. Generated declarations describe the checked consumer boundary.
All 16 input pairs are checked against independently specified expected
knowledge readings and the installed real provider.

## Architecture and detailed design

- `src/taxonomy/index.mts` retains the complete source API. A small private
  checked Data boundary supplies only knowledge joining.
- URI's `assertHttpUrl` replaces the equivalent local URL validator.
  HTML's `escapeHtml` supplies escaping after equivalence inspection.
- HTTP representation constructors and `App/Resource` come from
  `computing-with-http/app`; acceptance exercises the genuine owner handler.
  Inspection of the current HTTP 0.6.2 engine shows it requires a standard
  `Response`, although the older typed App accepts representation records
  too. Taxonomy converts its string representations to Responses, using the
  HTTP owner's cache serializer. It does not invent a req/res/send adapter.
  Preserve pretty JSON with newline, public 300-second cache metadata, routes,
  page-query normalization, 404 body and 406 negotiation.
- Pagination reuse must preserve the source's page clamp, encoded path
  expansion and links. The shared page-count and link contracts are eligible;
  stricter pagination argument validation or changed navigation markup is
  not silently substituted.
  The dependency-free page-count functions move intact to
  `pagination/count.mts` and remain re-exported from the original entry;
  taxonomy therefore does not load unrelated pagination evidence machinery.
- Package metadata adds the genuine Data dependency, the conditional
  `/taxonomy` type/import export, taxonomy namespace and test entries.
  Tests and checked consumer fixtures do not enter production semantics.

## Consumer disposition

`emsenn/swarm@72847d0a5a0e3303a0ec417e793daabb0634fa8d` imports the
ordinary archive API and relation API. Its `taxonomyAlgebraFromTraceEntry`
always places the neutral charge label in potential, then projects charged
facts to potential for positive-only, active for negative-only, stable for
both, and no charged facts for neither. Ordinary item archives retain terms
irrespective of charge. Its relation document omits absurd cells.

The consumer's HTTP handlers use `ctx.req/ctx.res/send` from the former
`@emsenn/web-server`. Changing only its import would not migrate that
interface. This increment records and exercises the pure projections and
does not claim a live consumer upgrade. Source/history deletion, retirement,
deployment and merge remain outside the increment.

## Verification record

The complete API is implemented. Focused compilation, 14 acceptance cases,
strict packed-subpath TypeScript consumption and the diagnostic packed runtime
import pass. Native check/build/test and normal prepack remain blocked by the
same existing owner-contract failures reproduced on the unchanged base.

See `data/records/receiving/web-taxonomy-2026-10-16/README.md` and its command,
diagnostic and supplier-integrity receipts. Installed Data 0.2.0 has different
FOUR bytes from the pinned source; all 16 joins agree, and all 32 installed
package files match the existing integrity index. These records do not establish
the installed release's Git source commit. Independent review and full native
qualification remain outstanding; this is a source-only draft.

