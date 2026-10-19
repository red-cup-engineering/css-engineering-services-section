# MOOSE — Semioverse social application

MOOSE is an application package in the Web Engineering corpus. It is not a
renamed generic ActivityPub Server, FeltOS, Living Web Server, or an alternative
database. The original Fedify ActivityPub provider owns WebFinger, signed actor
identity, outbox publication, inbox verification, Follow/Accept/Undo, per-actor
bearer credentials, public audience, custody and delivery retries. The existing
Living Web Server owns live TUFTE HTML/JSON, and the existing ActivityPub Server
owns the one HTTP listener and one worker for the original durable queue.

The MOOSE application joins those actual existing components. It supplies one
source-backed public social timeline, an actor listing, a provisioned multi-actor
social site, and access to the provider's actual authenticated ActivityPub
publishing and follow capabilities. There is no MOOSE-side persistence duplicate.

## Provision and run

This is **unpublished source**, not a deployed or Mastodon-equivalent site.
The Living Web Server package is still private upstream. A qualified installer
must supply the exact original packages before native execution.

Provide distinct actor identifiers and private signing-key paths. Set these
environment variables, substituting actual authorized values:

    MOOSE_ORIGIN=https://social.example
    MOOSE_STATE_DIR=/private/moose/state
    MOOSE_ACTORS_JSON=[{"identifier":"alice","actorName":"Alice","summary":"Local actor","keyPath":"/private/moose/keys/alice.json"}]
    MOOSE_PUBLIC_READ=true
    TRUST_PROXY=true
    HOST=127.0.0.1
    PORT=8000

Launch the package's serve-moose command from the installed package. Signing
keys, bearer tokens, the inbox and outbox journal, Fedify cache and pending
delivery spool are all retained by the upstream persistent ActivityPub source.
Keys are never supplied as environment content. Do not put two actors' signing
keys at one path; the provider rejects it. The original operator credentials
are stored in the provider's actor-bearer paths; they are not displayed in MOOSE.

Outside loopback development, the canonical origin must be HTTPS through an
explicitly trusted TLS terminator. The actual HTTP listener stays on loopback.

To publish, authenticate as the chosen local actor with the original per-actor
bearer token, then POST a complete, author-signed-origin ActivityStreams
Create{Note} or Create{Article} with a stable activity ID to
/actors/{identifier}/outbox. The original provider admits only the selected
actor, durably retains the outbox record, signs recipient delivery and reports
an incomplete handoff as HTTP 503. Retrying the same activity ID resumes the
handoff without inventing a second publication. Federation peers follow
/actors/{identifier} through the original Fedify Follow/Accept/Undo handlers.
An authenticated local actor may also initiate a Follow by posting one
ActivityStreams Follow (actor = its own /actors/{identifier}, object = the
remote actor, and to = an array containing exactly that remote actor) to its
original actor-scoped outbox. The upstream provider refuses a public or
misaddressed Follow before custody; neither an outbox receipt nor a signed
inbound Accept automatically grants local institutional standing.

GET / and GET /timeline show only original outbox Create{Note,Article} objects
with locally matching actor/attribution, the explicit Public audience and a
local post permalink. The page source is freshly read on every request.
GET /about displays provisioned actor descriptions; each actor links to its
own /people/{identifier} public profile. FeltOS embedding instead mounts
/social, /social/timeline, /social/actors, and /social/people/{identifier}
on the existing instance origin, still using the ONE signed provider and
web listener. Removed original identities return no profile and do not
bring down unrelated actors' timelines. HTML/JSON content negotiation remains
with Living Web Server. Public readers cannot access the
private incoming inbox or publish through MOOSE's website.

A signed inbox arrival is only a social event. It is not a MetroPlat Work
approval, qualified enterprise command, payment authorization or office
credential. The baseline CLI accepts declared ordinary social activity kinds
into original signed custody and rejects unknown kinds; it does not execute
business Work on arrivals.

## Scope and tests

Run the selected MOOSE test suite from an actually installed source/package
closure:

    node --test test/*.test.mjs

The timeline now consumes ActivityPub Services' public-post projection at
version 0.9.5-dev.0, including Update/Delete visibility. Tests therefore
require that original package too. Source-isolated tests with substituted
dependencies are strictly lower evidence than a native Fedify run. The
package's host additionally requires installed original Fedify,
Living Web Server and ActivityPub Server packages. A pure timeline
test cannot establish a real federation, native host, external Mastodon
compatibility, customer receipt, public deployment or published registry
artifact. A real native startup/restart, signed two-node federation, moderation,
remote replies, reporting, defederation, account migration and FeltOS import
remain unreceived. MOOSE must eventually have its independent repository,
registry artifact and FeltOS consumer, not remain merely this Web Engineering
source-directory package.
