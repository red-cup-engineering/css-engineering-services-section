# addressing

JSON serialization and content-addressing: given a JSON-shaped
value, produce a deterministic string for it, hash that string, and derive
a stable identity for a record whether or not it declares its own id.

Zero dependencies. Web APIs only (`crypto.subtle`, `TextEncoder`) — runs
unmodified on Node 24 and on Cloudflare Workers.

## Why this exists

Two independent parts of a system (a client and a server, two runs of the
same job, two different sites in a network) frequently need to agree on
"is this the same thing?" without a shared database key. The answer used
across this network is: canonicalize, then hash. `JSON.stringify` is *not*
— key order follows insertion order, so `{a:1,b:2}` and
`{b:2,a:1}` serialize differently even though they're the same value. This
module fixes that by always emitting object keys sorted by UTF-16 code
unit (the same ordering RFC 8785's JSON Canonicalization Scheme uses), so
structurally-equal values always produce byte-identical output — and
therefore identical hashes.

## API

### `canonicalJson(value) -> string`

Deterministic JSON serialization. Object keys sorted; array order
preserved. Accepts only JSON-representable shapes: `null`, `boolean`,
finite `number`, `string`, array, and plain object (an object literal, or
`Object.create(null)`). Throws `TypeError` — naming the offending path,
e.g. `$.meta.count` — for anything else: `undefined`, `NaN`,
`Infinity`/`-Infinity`, functions, symbols, bigints, and non-plain object
instances (`Date`, `Map`, `Set`, class instances, typed arrays). This is
deliberate: `JSON.stringify` silently drops `undefined` object values and
turns `NaN`/`Infinity` into `null`; `canonicalJson` never guesses on your
behalf, in keeping with this network's "no silent coercion" convention.
Callers who want a `Date` or similar hashed need to convert it to a plain
JSON shape themselves first (e.g. `date.toISOString()`), which also makes
the intended representation an explicit, reviewable choice rather than
whatever a particular class's `toJSON` happens to produce.

### `async sha256Hex(text) -> string`

SHA-256 of a string, lowercase hex, via `crypto.subtle.digest`. Throws
`TypeError` if `text` is not a string.

### `async contentId(value) -> string`

`"urn:sha256:" + sha256Hex(canonicalJson(value))`. A content-derived
identifier: any two calls on structurally-equal values (any object key
order) return the same id; any change to the value's content changes it.
Use this whenever you need to name a value by what it *is* rather than by
where it came from — deduplicating cached responses, naming a derived
artifact, etc.

### `recordIdentity(record) -> string | null`

Synchronous. `record.id != null ? \`id:${record.id}\` : null`. Never
hashes, never throws for a record with no id — it returns `null` so the
caller can decide what to do next. Throws `TypeError` if `record` itself
isn't a non-null object.

### `async recordIdentityOrHash(record) -> string`

`recordIdentity(record)`, falling back to `` `rmn:${sha256Hex(canonicalJson(record))}` ``
when the record declares no id. A total function: every record — API
response, derived observation, player-authored note — gets a stable
identity string, `id:`-prefixed when the source system assigned one,
`rmn:`-prefixed (content hash) when it didn't. The two prefixes stay
visibly distinct on purpose: an `id:` string is only as trustworthy as
whatever system minted that id (could collide across sources, could be
reused after deletion); an `rmn:` string is self-certifying (it *is* a
hash of the content) but changes if the content changes even slightly, so
the two shouldn't be treated as interchangeable "the record's identity" —
callers that need to know which kind they got can check the prefix.

## The network journal-identity convention

This module is a from-scratch, generic implementation of a pattern this
network already uses ad hoc in several places: durable records get a
`type` + version + provenance envelope (see this package's `src/records/`
for EVE Assist's version of that envelope), and records that don't carry
their own natural key get one derived from their own content instead of a
counter or a random UUID — so that re-recording the *same* observation
twice (e.g. re-fetching an unchanged ESI endpoint, replaying a journal
export) produces the *same* identity both times, making de-duplication a
pure function of content rather than a side table of "have I seen this
before". `recordIdentityOrHash`'s `id:` vs `rmn:` split is this module's
answer to that: prefer the source's own key when it has one, otherwise
derive one that's stable for as long as the content doesn't change.

`src/ledgering/`'s `dedupeAgainst` (append-only ledger, skip-on-replay) and
`src/records/envelope.mjs`'s `withIdentity` (attach an id to a freshly
minted record) both build directly on this convention: `withIdentity` is
expected to call `recordIdentityOrHash` under the hood, and any consumer
comparing two records for "are these the same fact" should compare their
`recordIdentityOrHash` output, not attempt a deep-equality check on the
whole record (whose non-identity fields — like `recordedAt` — may
legitimately differ between two recordings of the same fact).

## Extraction note

This module imports nothing from the rest of this package and nothing
EVE-specific — no character names, item types, or domain vocabulary
anywhere in it. It is written to be lifted out verbatim as a standalone
`@red-cup-engineering/addressing` package: move `addressing.mjs` (and this
README) into a new package directory, add a `package.json`, done. Nothing
in `src/ledgering/`, `src/cataloging/`, or `src/graphing/` imports this
module directly at v1 (each is independently generic per the wave-2
extraction rule), but any of them may in the future — this is the one
generic module the roadmap explicitly allows the others to depend on as a
shared base.
