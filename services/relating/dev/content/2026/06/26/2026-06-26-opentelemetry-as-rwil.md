---
title: "OpenTelemetry as RWIL: OTLP spans as witnessed invocations"
description: "Names the OpenTelemetry OTLP export wire for RWIL. An OTel span is an RWIL witnessed invocation: E = caller/resource, A = operation plus arguments/scope, V = result, T = time. The ledger remains the trace store; OTLP JSON is a channel-code of the log, exactly as WMAP's outbox is a channel-code of RWIL, not a second ontology. Records the lib/relating implementation in src/writing/otlp.mts and the green law test."
date: 2026-06-26
status: implemented
---

# OpenTelemetry as RWIL

**OpenTelemetry, through OTLP JSON, is the standard export wire of RWIL.** It does not introduce a second trace ontology.
It is a channel-code of the same source: the Relation-Witness Information Log.

The bridge is exact:

| RWIL / EAVT | OpenTelemetry span reading |
|---|---|
| `E` entity | caller/resource: the actor, transport, service, or process witnessing the play |
| `A` attribute | operation plus arguments: the verb and argument carrier, exposed through span name/scope |
| `V` value | result: the returned value of the invocation |
| `T` time | span start/end time and the preserved RWIL witness timestamp |

So an OTel span **is** a witnessed invocation when it carries E/A/V/T.
For the invocation ledger this is already the package's own header claim: `E = caller, A = morphism and arguments, V = return, T = timestamp`.
OTLP simply gives that row a standard observability envelope.

## Why the ledger already is the trace store

RWIL names the built `log -> state -> record -> content` substrate.
The log is the source; state, records, content, streams, outboxes, and now OTLP are projections of it.
The trace store is therefore not an external backend.
It is the append-only EAVT ledger itself:

- `src/writing/eavt.mts` is the atomic witness row codec.
- `src/ledger/` is the projection engine for log, state, record, content, and stream views.
- `src/running/invocation.mts` writes scripted boundary plays into the ledger.
- `src/writing/otlp.mts` is the OTLP channel-code over those rows.

This preserves the RWIL information order.
The source is the log.
The OTLP export may group rows by resource and scope, and consumers may later merge or sample them, but those are channel operations over a source.
They do not create more information than the log.
In the lossless package channel, decoding OTLP spans recovers the same E/A/V/T rows; at the bulk statistic, the time-forgotten cells agree and cannot exceed the witness count.

## The channel-code

The implementation lives in [`lib/relating/src/writing/otlp.mts`](../../../lib/relating/src/writing/otlp.mts).
Its carriers are authored as plain `as const` JSON-Schema literals through `carrierFrom` and `FromSchema`, with no TypeBox, Ajv, SDK, or codegen.
It emits literal OTLP JSON.

The public bridge is:

- `spanFromWitness(row)` encodes one `EAVT` / `EAVTRecord` as an OTLP span.
- `witnessFromSpan(span)` decodes that span back to the same RWIL row.
- `otlpFromWitnesses(rows)` emits an OTLP `ExportTraceServiceRequest`-shaped JSON object.
- `witnessesFromOtlp(traces)` decodes all RWIL witnesses carried by that OTLP object.
- `otlpBulkCells(traces)` reads the time-forgotten `(E,A,V)` bulk statistic used by the law test.

The resource/scope mapping is deliberate.
The OTLP `resource.attributes` carry the RWIL entity.
Each OTLP scope carries the RWIL attribute.
The span itself carries canonical `rwil.entity`, `rwil.attribute`, `rwil.value`, and `rwil.time` attributes so the channel is lossless.
Deterministic `traceId` and `spanId` values are derived from the entity and `eavtId`; they are identifiers of the export face, not the source identity.

## Relation to WMAP

This is the same move as WMAP's outbox:

```text
RWIL log --channel-code--> ActivityPub outbox
RWIL log --channel-code--> OTLP traces
```

Both are standard wires over the same source.
ActivityPub's outbox is the across-face agency channel; OTLP is the operational observability channel.
Neither owns the ontology.
The ontology is the witnessed relation row and its information order.

## Green proof

The law test landed in [`lib/relating/test/holography.test.mjs`](../../../lib/relating/test/holography.test.mjs) under **"OTLP is an RWIL channel-code"**:

- `witnessFromSpan(spanFromWitness(row)) = row` for invocation-shaped E/A/V/T witnesses.
- `witnessesFromOtlp(otlpFromWitnesses(feed)) = feed` for an RWIL feed.
- Projecting state from the decoded feed equals projecting state from the source feed.
- The OTLP bulk cells equal the source's time-forgotten `(E,A,V)` cells and their count is less than or equal to the witness count, the data-processing inequality made concrete.

Verified locally after implementation:

```text
pnpm --filter @emsenn/relating run check
pnpm --filter @emsenn/relating run build
pnpm --filter @emsenn/relating run test
```

The final test run was green: 252 tests, 85 suites, 0 failures.

## Open seams

The current OTLP face is the lossless JSON export/import law for traces.
It does not yet ship an HTTP OTLP collector route, metrics/logs projections, sampling policy, or a site-level binding that pushes to an external collector.
Those should stay downstream of the same source/channel split: RWIL remains the trace store; any collector transport is a delivery binding over this channel-code.

## Family placement

This is a named standard wire under RWIL, not a replacement for RWIL.
In the family:

- **RMN** is the relation notation substrate.
- **RWIL** projects relation witnesses through time.
- **RWIL/OTLP** exports those witnesses to the observability ecosystem as spans.
- **WMAP** projects relation witnesses across the web as agency.

## Provenance

This note follows the family registry recipe in [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md) and the RWIL source/channel law in [`2026-06-25-rwil-relation-witness-information-log.md`](2026-06-25-rwil-relation-witness-information-log.md).
It also uses the "codecs live on faces" placement rule from [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md): a standard wire is owned by the face whose math makes it lawful.
Here, the lawful owner is RWIL's witness log.
