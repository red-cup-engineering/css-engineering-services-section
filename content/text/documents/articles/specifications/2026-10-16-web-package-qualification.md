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

## Integrated production checkpoint, 10:47 UTC

The production entrypoints now consume the received wire/evidence boundaries.
ActivityPub and Micropub import Web's wire types; sync re-exports the Web wire
contract; theming uses ThemeJudgment/ThemeAssessment and genuine evidence;
traversal returns TraversalEvidence without altering hop order or multiplicity;
feed history exposes the supplied witness and evidence beside its utterance.
Webmention's test log types now derive from FetchLike's parameter contract.
The manifest directly declares SignCell 0.4.2 and JSON 0.4.0, removes the unused
Animating/Relating dependencies and declares Node >=24.2.0.

The two reviewed helper modules remain byte-identical to checkpoint 9b09e89.
Native check/build pass (the previous 13/11 diagnostics are cleared). The
directly enrolled native suite passes 89 of 90 cases, including all 15 taxonomy
and all 19 original theme cases. The added boundary tests substitute supplier
results only in disposable child test processes; production has no injection
hook. Missing/noncallable exports and malformed carriers are refused.

The historical auth-report test now checks the actual HTTP owner's utterances
for the same request judgment instead of its removed datoms representation.
No auth decision is changed. The remaining sync HTTP case fails at initial GET
(500 versus 200), before its refusal/no-import assertions execute: its Node App
Context contract was incorrectly passed to the portable Fetch engine. The
candidate private response helper now returns Response with the same body,
status and headers, but this does not resolve the incompatible context. A
genuine existing Node-context pipeline or established adapter must be selected.
No test-only transport or auth-policy adaptation is acceptable.

### Token bytes and compatibility

The original source fixture from web-indieauth c3d61b29 and a supplemental
well-formed Unicode-value fixture produce identical token bytes and HMAC with
JSON 0.4.0. The mixed-case extension-key fixture (a/Z) differs: historical
localeCompare ordering and RFC8785 UTF-16 ordering are not equivalent. Both
exact strings are recorded in test/fixtures/indieauth-byte-fixtures.json.
Every historical fixture remains accepted by the unchanged raw-signing-input
verifier. Expiry, wrong-key refusal, claims, scope and token extraction pass.

The immediately preceding Web receiving source already delegated serialization
to canonical(requireJsonValue(...)) from a now-removed Relating export. Its
resolved Relating 0.10.8 has no executable codecs contract; therefore it cannot
establish a currently working byte oracle. We do not infer a new auth policy or
claim universal legacy byte equivalence. The source-level change is to the real
canonical owner, with the above older wire-byte difference explicit. Historical
fixture acceptance is preserved; exact-byte consumers using noncanonical
extension ordering must not assume newly minted strings remain identical.

### Composition still pending

The diagnostic graph still contains partial legacy HTML compilation and emitted
output from a failed HTTP-core build. Native Web results on that graph are
useful receiving evidence, not a complete-provider qualification claim. Complete
installed canonical HTML/HTTP providers are being compared before any upstream
repair. Normal prepack and every packed runtime/declaration export remain open.

## Complete provider selection

The installed Computer Web Server 0.6.2 `/native-application` export supplies
`nativeHttpHandler(app)`, the genuine Node Context transport required by sync.
Its installed module SHA-256 is
`07d5aab47461b416625f85b66e0b29277e6f976a1132ca3d50f537cfae66e716`.
The corresponding source owner is computer-web-server at
`b70b7a6c73ba58af3fe4c00b90f0789338f23417`. Artifact and source identities are
recorded separately; a version number alone is not a byte-equality assertion.
The original HTTP case passes through this adapter, including its refused and
rate-limited POST requests and explicit unchanged import count.
The private response helper is restored byte-for-byte to its original `Repr`
contract. The temporary Response workaround from the diagnostic checkpoint is
removed. A direct handler case uses the genuine provider's `contextFor` and
asserts the original representation object, including cache control and body.
An additional HTTP case posts one valid plus one invalid assertion: although
the pure validator retains accepted entries beside faults, the transport
refuses the entire batch and never calls `importAssertions`.

Web's only use of legacy HTTP core was `getSignedCookie`. HTTP 0.6.2 publishes
that same Node transport contract at `/cookies`; Web now checks its JavaScript
export and string-or-null return without an ambient type stub. Signing remains
in the unchanged HTTP primitive codec. Cross-provider fixtures compare exact
HMAC bytes, Unicode/dotted/empty values, missing cookies, malformed input,
wrong key, wrong name/salt, duplicate names and tampering. Empty signed values
remain refused by both implementations. No cookie/auth policy is introduced.

HTML Structural Projection 0.3.3 publishes all three rendering operations Web
uses at `/string-rendering`. Web delegates through a checked JavaScript
boundary, preserving the existing public parameter types. The complete
installed package replaces the partial legacy HTML compilation. Canonical
HTML preserves quote/ampersand/bracket escaping, boolean attributes, trusted
children and XHTML void spelling. There is an explicit lexical migration:
carriage return becomes `&#13;` and NUL becomes U+FFFD, whereas legacy HTML
emitted these characters raw. These two cases are now fixtures; universal
historical HTML byte equivalence is not claimed. No local escaping algorithm
or synthetic HTML implementation is substituted for the owner.
The normalization applies to escaped shell values, not trusted article markup:
both reference themes retain an article containing literal CR/NUL byte-for-byte
while its page title takes the canonical escaping. The original 19 reference
theme cases, including article-rewriting refusal, remain enrolled.

Direct runtime providers are pinned to the versions selected for this graph:
Web Server 0.6.2, HTTP 0.6.2, HTML Structural Projection 0.3.3, Serialized
Content 0.1.0, URI 0.1.1, Triplet 0.1.0, Data 0.2.0, JSON 0.4.0 and SignCell
0.4.2. The unchanged workspace HTTP primitives are fully checked, built and
normally packed first; Web consumes their complete extracted package. Neither
legacy HTTP core's failed output nor partial HTML output remains in the graph.
Installed providers are read from the existing immutable registry runtime.
No package installation, service activation, access change or retirement occurs.

The token fixtures now also exercise Unicode extension keys (z/ä): as with
mixed-case keys, the historical localeCompare order differs from canonical
JSON. The existing raw-byte verifier accepts both recorded historical tokens.

## Final acceptance

The final composition passed native check/build/test (95/95), normal prepack,
all 20 declared packed runtime imports and all 19 declared packed type imports
with strict TypeScript and skipLibCheck=false, 11:09:35–11:10:05 UTC. Node was
24.19.0, TypeScript 5.9.3 and @types/node 22.7.5. The unchanged HTTP primitive
provider had already passed check/build and normal prepack at 11:03:25–11:03:32
UTC; its extracted package remained byte-identical throughout Web qualification.

The receipt compares all 69 package source/test/config files to the tested
snapshot, records exact provider paths/content hashes and verifies that all
ten direct provider trees remained unchanged. The reviewed evidence and wire
helpers remain byte-identical. The full original sync source now differs only
in the wire import and public re-exports; its validator, authentication,
limiting and Repr behavior are unchanged. All original taxonomy/theme cases
remain enrolled. The genuine native HTTP mixed-batch case observes zero import
calls, and article-byte preservation covers CR/NUL explicitly.

See `data/records/receiving/web-package-qualification-2026-10-16/final-*` for
actual commands, timestamps, outputs, packed artifact SHA-256 and source hashes.
There is no remaining failing package acceptance. This establishes qualification
of the recorded composition; it does not merge, release or activate it, retire
source/consumers, or alter the three unrelated held effects.


## Source prerequisite gate and current Webmention retirement receiving

The original Work's 2026-10-18 receiving inquiry reproduced 49 diagnostics on
Web Engineering `e82ddbebd42328a4f4107a9741845a4684e77579` before building
its existing, source-private HTTP prerequisite. Every diagnostic disappeared
when that unchanged prerequisite passed its own `check` and `build`. These
were unresolved package export targets and their derived contextual-type
errors, not evidence of 49 independent Web source defects.

For each later source qualification, the receiving operator must:

1. Bind the exact consumer source, declared provider versions and native tools.
   Resolve every advertised runtime and declaration export used by that consumer.
   An absent source-only supplier artifact makes the graph incomplete; do not
   rename imports, add ambient declarations or diagnose derived `any` errors
   as consumer defects before qualifying the original supplier.
2. Check and build the exact `computing-with-http` source through its existing
   package commands, then run its normal `npm pack` including `prepack`.
   Receive the complete packed supplier in the qualification composition.
   Do not reuse emitted output from a failed build or treat an empty/missing
   `dist` as an unavailable protocol implementation.
3. On the same fixed provider graph, run Web's declared `check`, `build` and
   complete `test`, followed by normal `npm pack`. Derive runtime/declaration
   consumption from the **current manifest**, fail on either consumer's nonzero
   exit, and exercise the existing native HTTP consumer and its refusals.
   Preserve every enrolled test. Historical test/export counts are not current
   completion criteria after a separately accepted API retirement.
4. Keep source qualification separate from registry publication and deployment.
   Both private manifests remain private and unchanged in version. A local
   qualification composition or tarball does not authorize a production lock,
   broader package audience, publication or installed-consumer upgrade.

Actual current receiving used Node 24.19.0, TypeScript 5.9.3 and @types/node
22.7.5 with the ten exact manifest dependencies. The unchanged HTTP supplier's
native check/build and normal prepack passed. The Web consumer then passed
check/build and all 83 currently enrolled tests, including native HTTP sync
admission/refusal and taxonomy negotiation. Its normal prepack passed; the
separately extracted packed consumer loaded all 19 current runtime exports and
strictly checked all 18 current declaration exports with `skipLibCheck=false`.
The retired Webmention subpath was absent as accepted in PR131; its dedicated
protocol owner's separate receiving remains authoritative.

The HTTP tarball SHA-256 was
`efafa1ce99f3fb8804d0e90535d87af059c56bd78eb40cab50301d8fc5cf57b0`;
the Web tarball SHA-256 was
`76c17a7c3261dd904eee267c1df2b8217c2bdaada90566e10c660481273f0029`.
No source implementation, test enrollment, dependency version, visibility or
registry state changed to clear the 49 diagnostics. This closes that original
source-package receiving gap; it does not claim public deployment, registry
availability of either private package, or a newly fabricated supplier API.


## Finite taxonomy identity receiving (2026-10-18)

A finite Web relation has one row per subject in first-seen order. Every repeated
record still contributes its potential/active/stable evidence through the real
Data knowledge join; repeated testimony MUST NOT duplicate membership, related
subjects or serialized relation rows. A predicate/object pair has structural tuple
identity: separator characters inside either string MUST NOT make distinct terms
coincide or create a false stable reading. Internal identity encoding is separate
from the established displayed term order; public types and ordinary ordering
remain unchanged. The original source's unused separator-splitting helper has no
consumer and is removed with the ambiguous identity encoding.

The existing taxonomy receiving suite covers all sixteen joins and repeated
inputs, unique-subject membership, genuine contested membership, distinct
separator-bearing pairs, unrelated terms and invalid empty subjects. The existing
SWARM projection fixture is the genuine original serialized `relationDocument`
consumer: repeating a source entry yields the same document, not an extra subject
row. This is native serialized-document receiving, not a running SWARM route or a
new HTTP endpoint. Existing taxonomy index/archive HTTP behavior stays enrolled.
Offset-date chronological ordering is a separate observed inquiry; this identity
increment does not claim to repair it.
