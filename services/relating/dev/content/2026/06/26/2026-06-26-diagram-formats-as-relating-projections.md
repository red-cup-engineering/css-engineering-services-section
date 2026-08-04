---
title: "Diagram formats as relating projections"
description: "SVG, Mermaid, and UML are three projectors of one presented-category diagram carrier, not three independent diagram ontologies."
date: 2026-06-26
status: design
---

# Diagram formats as relating projections

SVG, Mermaid, and UML are not three diagram systems in this corpus.
They are three readings of one carrier:

> a **presented category** whose objects are carriers/nodes with `id`, `kind`, and `label`, and whose morphisms are edges with `from`, `to`, `kind`, and `label`.

The corpus already had this carrier without naming it.
`@emsenn/computing/diagramming` renders `DiagramGraph { nodes, edges }` to SVG, and the JSNode package-bin WebUX derives a carrier-category document and renders it to SVG.
Both are the same object: a finite presentation of objects and arrows, viewed through a geometric projector.

## The carrier

The carrier belongs in `relating/writing` because it is a representation boundary over the category kernel.
It is not a new ontology.
It names the common carrier already present in two renderers:

- `objects`: category objects / graph nodes / UML classifiers or states.
- `morphisms`: category morphisms / graph edges / UML associations or transitions.
- `diagramKind`: the selected UML reading when the carrier is viewed through UML.

This is **Built+green** only once the carrier compiles and round-trips through the projector tests.
The broader claim, that every useful diagram in the workspace is a projection of this carrier, is **Research-grade** until more renderers are migrated.

## Projectors

| format | projector | Corner | Rung | math joint | status |
|---|---|---:|---:|---|---|
| SVG | geometric realization | assertion | identity | the presented category is laid out as boxes and arrows; self-describing SVG carries node/edge data attributes | Built+green target |
| Mermaid | textual presentation | assertion | identity | Markdown-of-diagrams: a graph text whose comments carry the exact presented-category rows | Built+green target |
| UML class diagram | typed metamodel | assertion | identity | the carrier-category itself: objects are carriers/classes, morphisms are typed dependencies/operations | Built+green target |
| UML state machine | typed metamodel | assertion | identity | settlement filtration: states are settlement stages, transitions are `read-firings-of-settlement-filtration` | load-bearing Built+green target |
| UML sequence diagram | typed metamodel | assertion | identity | witness ledger dispatch trace: actors exchange messages over time, each message is an EAVT row | Built+green target |

The Corner is `assertion` for all three because a diagram here is not an opaque picture.
It is an addressable truth-apt presentation of objects and morphisms.
The Rung is `identity`: every read must be structural parsing of the surface text/XML into the same node/edge tier.
No projector may require layout solving, rendering engines, scripts, or host execution to read the carrier.

## Why UML state machines matter

The state-machine joint is the load-bearing one.
If UML were only "class boxes for carriers," it would be a documentation skin.
The settlement filtration makes it a relating projector:

- a settlement filtration already is a staged fixed-point process;
- each stage is a state;
- `read-firings-of-settlement-filtration` identifies the transitions that add cells;
- therefore the UML state-machine view is a typed metamodel reading of the same settlement math.

That is the difference between a bolted-on renderer and a discovered projection.
The UML state-machine view is faithful exactly when its transitions are the firing read, not hand-authored arrows.

## Negotiation discipline

Adding a diagram format is safe only along the projector lattice:

- the value must already carry the `assertion` corner;
- negotiation may settle downward but may not fabricate assertivity upward;
- format reads remain at the identity rung;
- SVG, Mermaid, PlantUML, and XMI are surface choices over the same carrier.

Once the projectors are registered in relating, the ICK does not need diagram-specific routing.
It already negotiates representation faces by media type and corner.

## Proof obligations

The green proof for this note is concrete:

1. the package-bin carrier-category renders byte-identically through the SVG codec path;
2. `graph -> Mermaid -> graph` is identity on objects and morphisms;
3. the carrier-category round-trips through XMI;
4. a settlement filtration emits a UML state-machine carrier whose states are stages and whose transitions are the firing read.
5. an EAVT witness log emits a UML sequence carrier whose messages are time-ordered witness rows.

Until those tests pass, the note is a derivation.
After they pass, the carrier and projectors are **Built+green** in the narrow package sense, while the broader corpus-wide migration remains **Research-grade**.
