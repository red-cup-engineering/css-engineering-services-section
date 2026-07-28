---
title: "CALM as organizing coordination"
description: "A first green brick reading CALM through organizing federation: coordination-free iff monotone, with ActivityPub federation as the external-theorem-backed carrier path."
date: 2026-06-25
status: implemented
---

# CALM as organizing coordination

CALM says: **a computation is coordination-free iff it is monotone**.
The organizing reading lands without a second ontology:

```text
coordination-free <=> H1 = 0 <=> monotone-in-<=k
```

The package already has the witness.
`federate` decomposes a federation into:

- `shared`: overlap content that lifts through the federation without coordination.
- `contested`: overlap disagreement held as top, not discarded.
- `federationOnly`: the non-Scott H1 obstruction introduced by the federation.

The CALM brick in `lib/organizing/src/writing/calm/` reads that existing witness as a monotonicity classifier:

```text
monotone := contested = 0 and federationOnly = 0
coordination := monotone ? coordination-free : consensus-required
```

That makes CALM an external-theorem-backed reading of the existing federation operation, not a new coordination system.
`readCalmCovers` calls organizing's `federate` directly; `readCalmFederation` classifies any already-built `Federation`; and `readCalmActivities` deliberately reuses `federateActivities`, so ActivityPub S2S remains a path from protocol surface to organizing math.

## The implemented joint

Agreement-only ActivityPub federation:

```text
camp A: mara Create treaty|signed
camp B: mara Create treaty|signed
```

The shared witness is `shared = 1`, `contested = 0`, `federationOnly = 0`, so CALM reads the operation as monotone and therefore coordination-free.

Top-introducing / non-Scott federation witness:

```text
shared = 0
contested = 1
federationOnly = 1
```

This still carries the federation decomposition faithfully, but CALM reads the top introduction and federation-only H1 step as non-monotone for the agreement-only operation and labels it consensus-required.

## Surface

- `calmReadingCarrier`
- `readCalmFederation(federation)`
- `readCalmCovers(covers)`
- `readCalmActivities(campActivities)`

The carrier is single-source through `carrierFrom(calmReadingSchema)` and `FromSchema<typeof calmReadingSchema>`.
The public barrel exports the carrier, reading type, and two reader functions from `@emsenn/organizing`.
