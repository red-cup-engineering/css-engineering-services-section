---
title: "CloudEvents as communicating"
description: "Places CloudEvents as communicating's standard structured JSON across-envelope for membrane utterances. A CloudEvent is a charged meme with a standard envelope: source is the token/who, type is the Searle illocutionary force, time is T, and data is the claim. Records the carrier mapping, utterance bridge, green law test, and open seams."
date: 2026-06-26
status: landed
---

# CloudEvents as communicating

CloudEvents belongs to **communicating's across face**.
It is not a second event ontology beside relating's utterances.
It is the CNCF standard envelope for the same membrane act already carried as `UtteranceCarrier`: someone says something, with a force, at a time, and the structured JSON envelope makes that act portable across event routers.

The implemented brick is in [`lib/communicating/src/messaging/cloudevents.mts`](../../../lib/communicating/src/messaging/cloudevents.mts).

## The derivation

A CloudEvent is a charged meme with a standard envelope:

- `source` is the utterance token, the who.
- `type` is the Searle illocutionary force.
- `time` is the witness time `T`.
- `data` is the claim.

So the bridge is:

```ts
source / type / time / data
  =
token / force / T / claim
```

The CloudEvents JSON Event Format supplies the structured envelope.
The package uses the literal constants it needs:

- `specversion = "1.0"`
- structured JSON media type `application/cloudevents+json`
- claim content type `application/json`

No SDK, JSON-LD processor, or eventing framework is introduced.
The carrier is an `as const` JSON-Schema literal admitted through relating's `carrierFrom`, and the TypeScript type is derived with `FromSchema`.

## What landed

- `cloudEventCarrier`: structured JSON CloudEvent carrier for one membrane utterance.
- `cloudEventFromUtterance`: `UtteranceCarrier -> CloudEvent`, with caller-supplied force and `T`.
- `utteranceFromCloudEvent`: `CloudEvent -> UtteranceCarrier`, preserving `source/data` as `token/claim`.
- `cloudEventIllocutionaryForce`: reads `type` as the same Searle force vocabulary used by the ActivityPub codec.
- Literal constants for `specversion`, structured JSON media type, and JSON data content type.

The implementation requires JSON claims because structured CloudEvents JSON stores `data` directly as JSON.
Non-JSON claims should be encoded by a separate content codec before entering this envelope.

## Proof

The law test is [`lib/communicating/test/cloudevents.test.mjs`](../../../lib/communicating/test/cloudevents.test.mjs).
It checks:

- `source/type/time/data` round-trip losslessly with `token/force/T/claim`.
- `CloudEvent -> utterance -> CloudEvent` returns the same canonical envelope when the required CloudEvents `id` is preserved.
- CloudEvents `type` maps to the same Searle force that the ActivityPub codec reads for `Create`, `Question`, `Accept`, `Like`, and `Undo`.

That proves the intended joint: CloudEvents is a functorial view of the existing utterance carrier plus speech-act force.
It adds a standard envelope, not a second ontology.

## Cross-links

- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md) — product-plane registry, now including CloudEvents
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md) — second-wave protocol map where CloudEvents was identified as communicating
- [`2026-06-26-didcomm-as-communicating.md`](2026-06-26-didcomm-as-communicating.md) — private across-channel sibling over the same utterance law
- [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md) — ActivityPub/WMAP exemplar whose force reading this codec preserves

## Machine-readable handoff

```yaml
handoff:
  product: "CloudEvents"
  status: "landed"
  package: "@emsenn/communicating"
  files:
    implementation:
      - "lib/communicating/src/messaging/cloudevents.mts"
      - "lib/communicating/src/messaging/index.mts"
      - "lib/communicating/src/index.mts"
    tests:
      - "lib/communicating/test/cloudevents.test.mjs"
    docs:
      - "dev/docs/notes/2026-06-25-relating-family-of-named-systems.md"
      - "dev/docs/notes/2026-06-25-protocols-as-faculty-projections.md"
      - "dev/docs/notes/2026-06-26-cloudevents-as-communicating.md"
  mapping:
    source: "utterance token"
    type: "Searle illocutionary force"
    time: "T"
    data: "utterance claim"
    specversion: "1.0"
    structured_json_media_type: "application/cloudevents+json"
  proof:
    law_test: "CloudEvent <-> UtteranceCarrier preserves source/type/time/data as token/force/T/claim"
    force_test: "CloudEvents type agrees with ActivityPub illocutionOf for representative AS2 types"
    gates:
      - "pnpm --filter @emsenn/communicating run check"
      - "pnpm --filter @emsenn/communicating run test"
  open_seams:
    - "Binary CloudEvents data and data_base64 are not implemented; this brick is structured JSON only."
    - "CloudEvents protocol bindings such as HTTP binary mode are not implemented here."
    - "The carrier narrows type to the communicating Searle force vocabulary; arbitrary vendor event-type taxonomies should project through a separate vocabulary bridge."
    - "CloudEvents extensions are intentionally excluded until a communicating law for each extension is derived."
```

## Provenance

This brick derives from the family registry's product-plane recipe and the protocols map's second-wave CloudEvents entry.
The CloudEvents spec supplies the standard structured JSON envelope; the package supplies the mathematical reading: `source/type/time/data` is exactly `token/force/T/claim`.
