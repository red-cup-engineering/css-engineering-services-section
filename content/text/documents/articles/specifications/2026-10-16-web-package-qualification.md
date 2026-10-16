# Web package prerequisite qualification

Date: 2026-10-16. Owner: Web Engineering, computing-with-the-web.
Accountable carrier: https://github.com/coesite-operations/operations-services-section/issues/10.
This is a separate source increment stacked on reviewed taxonomy head
8fb1a6a18e926bdb0da0ca47b3cb43f8271764bc (PR 122, open/draft/unmerged).
No merge, release, runtime activation, source retirement, connector mutation or
federation probe is authorized here. All three unrelated approval holds remain.

## Problem and responsibility

The reviewed taxonomy receipt preserved its full capability, but the package's
native gates reproduce 13 check and 11 build diagnostics from its unchanged base.
The affected source still imports removed assertion-worlds, codecs, algebra and
lessons APIs. Adding aliases under their former names would conceal ownership.
The repair instead establishes the existing Web contracts at their actual owners.

| Responsibility | Existing behavior retained | Supplier / owner |
| --- | --- | --- |
| Web wire assertions and source recognition | Admission, provenance precedence, recognition coercion, bounds and refusal | Web sync-guard, shared with ActivityPub and Micropub |
| Token serialization | Canonical JSON bytes, base64url, HS256 signing and verification | JSON 0.4.0 canonical-json and require-json-value; IndieAuth owns protocol/signing |
| Opaque marks, utterances and cells | Genuine canonical carriers and identity/evidence normalization | SignCell 0.4.2 mark, utterance, cell exports |
| Four-valued classifications/folds | Knowledge join, absurd identity | Data 0.2.0 FOUR through checked unknown boundary |
| Theme validation/rendering | Structural contract, reasons, contrary predicates, article bytes | Web theming |
| Wire traversal | One entry per hop in order, repeated hops retained, silent identity | Web topology |
| Feed history | Existing complete/archive/subscription classifications and supplied witnesses | Web pagination |
| Fake-fetch log types | Existing FetchLike parameter body/header types | Webmention tests only |

No production fetch refactor or global DOM library addition is needed.

## Exact sources and comparison

Sync policy was recovered from emsenn/web-sync-guard at
137409ccd9a6b2f7d53a17ba2f307d6cf06e8eeb and its actual supplier
emsenn/memetics-federation at 0cd862144b2390dbc81a6bc91ef352c23fb0ee86:
src/admission.mts, src/assertions.mts, src/types.mts and src/index.test.mts.
Web's current validateSyncAssertions body matches the original. The prior
assertion-worlds import is not evidence that a current Animating API owns this
Web wire format.

The actual baseline provider graph used AOE
4181ee46317d32bb589af897bed458f5675d6466, with Animating 0.3.0 and Relating 0.10.8.
It did not use the later canonical AOE revision cited in independent research.
Neither manifest offers the removed imports. PRs 111/110/13 do not repair this package.

Existing canonical SignCell source is
1f435dfb27dc5fd081340cac7a3e0d674b5892b3 (0.4.2).
The genuine constructors and schemas define Mark as kind/value; utterance as
kind/token/claim with left/right hands and Marks; and cell as ordered
subject/predicate/object with for/against evidence and an optional knowledge
reading. SignCell owns canonical content addressing, witness deduplication and
normalization. Web must not reproduce those algorithms or claim Lesson aliases.

Existing JSON source is 430d24c50e3c3003a8a07fe78ce5ffd8869dba86 (0.4.0),
with typed canonical-json and require-json-value exports.
Its declared engine is Node >=24.2.0. Web must raise its current >=22.18 claim
to >=24.2.0 when receiving this direct dependency; it cannot claim the lower
engine while consuming an incompatible declared supplier.

Installed Data 0.2.0 and source d974d4ec are not byte-identical. The taxonomy
receiving receipt records their distinct blobs and verifies the installed
artifact against the existing pnpm integrity record. The same installed Data
artifact, not a reconstructed join, must be used throughout qualification.

## Web-owned wire assertion contract

Receive the proven wire shape and admission helpers in sync-guard, re-export
their public types there, and have ActivityPub/Micropub consume that owner.
The historical static Assertion declares e/a strings, v unknown, optional t,
source and signature.by. Runtime assertAssertion deliberately admits any truthy
object with string e/a and returns it unchanged. It does not require v/t,
enforce JSON, reject additional properties, or strip provenance metadata.
The Web validator additionally checks nonempty e/a, field/item/count bounds,
required provenance, authenticated expectedSource and recognition.

Provenance uses the first nonempty string from source, signature.by, then t.by.
Conflicting lower-precedence fields are ignored. Empty strings fall through;
whitespace is nonempty. There is no signature verification in this projection.

recognizerFrom preserves null/undefined as potential; callback coercion; live
Set/Map lookup; snapshotted array membership; and own-property record lookup.
Coercion maps true to potential, false to absurd; preserves all four knowledge
names; recursively reads a defined value before the truthiness of defined
settled; otherwise absurd. No stricter source-conflict or JSON policy is added.

All-or-nothing import remains mandatory: a validation fault prevents the app's
import callback, even if other assertions passed. Refusal is a reasoned Web
validation result, not denial evidence or institutional authority. The original
supplier's refused-admission contrary-claim test informs this distinction;
Web does not receive the supplier's world/admitLog machinery or invent its IDs.

## Theme, traversal and feed evidence

Create a checked supplier boundary with explicit Web carrier types matching
verified SignCell schemas. Load undeclared JavaScript as unknown, check callable
exports and returned carrier shapes, and test against the actual supplier
schemas/guards. Do not assert unknown as a carrier or add ambient declarations.

Theme admission keeps structural name/head/header/footer/wrap/css checks and
the existing potential/active summary classifications. A success articulates
satisfies-theme-contract; each failure articulates violates-theme-contract
with its path and reason. A violation is its own positively asserted contrary
predicate. Its SignCell evidence must not become the against side of a different
satisfaction cell merely because the Web summary reads active.
Replace the removed LessonSettlement with an explicitly Web-owned theme
assessment. Retain the public report fields where meaningful and document new
carrier shapes. Rendering, CSS, escaping and article passthrough are unchanged.

Traversal retains marked subject/predicate/object and optional opaque provenance
on a Web TraversalEvidence record. Genuine SignCell cells/utterances may be
exposed alongside the record; absent testimony stays absent and does not create
an attributed witness. The relay array remains ordered and multiplicity-bearing;
SignCell's set semantics apply only within an individual cell's evidence sides.
Identity relay yields an empty array. No memory, world induction, authority
assignment or charge seeding is performed by traversal.

Feed claims retain their complete/archive/subscription and contrary predicate
selection and their potential/active judgment data. Supplied witnesses remain
available unchanged in the Web record, outside the utterance identity.
The proposed shared boundary calls SignCell's genuine utterEvidence operation
and cell constructor. Each cell is witnessed by its own utterance: this records
the actual asserted predicate without attributing it to an actor. The opaque
caller witness remains unchanged on the Web evidence record; it is not forced
through JSON admission or inserted into canonical identity. A function-bearing
testimony object is therefore still retained. There is no automatic negative
side caused by the Web summary classification.
foldFeedHistoryClaims folds Data knowledgeJoinReading from absurd and retains
the original classifications. Empty folds, all four names, commutativity and
repetition must be covered explicitly.

## Public migration

This is not proof of absence of external consumers. The earlier repository
search found no other direct callers among 566 Web modules, but root and
subpath exports are public contracts.

Consumers importing Assertion/AssertionTrace/RecognitionInput from the removed
Animating path must use computing-with-the-web/sync-guard for Web wire traffic.
Do not replace this with strict EAVT: provenance and the permissive runtime
admission are part of the established contract.

Consumers of theming admission and topology traversal must migrate from
LessonEvidence/LessonSettlement/UtteranceCarrier supplier names to the explicit
Web report types and genuine SignCell carrier schemas described here. Opaque
provenance stays on the Web evidence record. Feed-history's value is judgment
data, distinct from a cell's evidence presence. No claim of source or runtime
consumer retirement is made by this source increment.

## Acceptance and qualification evidence

- Preserve every existing taxonomy test (15 cases including the URI correction),
  original SWARM fixture/provenance and all 19 theme cases.
- Enroll explicit traversal/feed, recognition/provenance edge cases, original
  sync refusal and no-import-on-failure cases in the native test command.
- Recover the historical IndieAuth fixture from emsenn/web-indieauth at
  c3d61b29e0688edab71c88b83f2308399e2b74b3 (test blob
  4dc262dd05b3bea3d1ceefb4ee689512a4fbef2d). Compare exact encoded token parts
  and HMAC bytes against the original implementation, not only a round trip.
- Historical IndieAuth canonicalization used localeCompare and omitted undefined
  object entries; the current receiving source already delegates to canonical
  JSON with requireJsonValue. Record any observed edge-case difference rather
  than claiming universal historical byte equivalence from one fixture.
  A material access/security change requires stopping that dependent repair.
- Freeze provider versions, paths, source/file hashes and installed artifacts
  before testing; do not change providers between gates to obtain a pass.
- Full native check, build, test and normal prepack must pass, followed by
  imports of every declared packed export and strict TypeScript consumption of
  every declared packed type export, with skipLibCheck=false.
- Do not omit exports, weaken test enrollment, use --ignore-scripts to claim a
  pack gate, or mask supplier errors with ambient stubs.
- Use the existing exclusive compute lease and dependencies. No package
  installation, spending, access change or install-policy override.
- Existing HTTP core source/build and partial HTML compilation from the earlier
  diagnostic graph need explicit reconciliation. Emitted output from a failed
  provider build is not evidence that this new complete graph is qualified.

Status at the first checkpoint: requirements/design committed before two
preparatory helper modules were added. The helpers pass strict compilation and
five focused contract tests. They are not yet wired to production entrypoints
or the package test command. All original production files, package metadata,
taxonomy tests and 19 theme cases remain unchanged. Full native qualification
is pending. See the separate checkpoint receipt for exact commands/providers.

