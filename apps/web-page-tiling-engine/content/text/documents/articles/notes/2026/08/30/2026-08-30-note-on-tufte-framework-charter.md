---
title: "TUFTE framework charter"
description: "The product boundary for TUFTE as the Tiling User Form Topology Engine: the house web application framework must meet and beat current rendering frameworks while composing upstream engineering services and serving VICTOR downstream."
date-created: 2026-08-30
type: note
---


TUFTE is the **Tiling User Form
Topology Engine** and must meet and beat current web rendering frameworks.
Each word was chosen with care and is load-bearing. Earlier choices to keep
TUFTE a small document renderer, or to reject capability merely because React,
Vue, Svelte, Solid, Astro, Lit, HTMX, or gridstack already provide it, are
superseded.

This is a product mandate, not a claim about the 0.4.1 artifact. The current
package has a strong server-first renderer, typed semantic tiles and native
forms, deterministic projection diffing, efficient keyed patches, structured
receipt/refusal events, document navigation, and a zero-JavaScript floor. It
does not yet meet the full mandate.

## The name is the architecture

- [Tiling](../../../../../../glossary/terms/tufte-tiling.md) means that users and
  applications can compose, partition, move, resize, nest, and persist useful
  surfaces. A responsive CSS grid is one renderer of a tiling, not the whole
  capability.
- [User](../../../../../../glossary/terms/tufte-user.md) means the human is an agent
  in the interface, not merely the recipient of a server-rendered document.
  Accessibility, direct manipulation, keyboard equivalence, preferences,
  undo, and durable personal arrangement belong to the framework contract.
- [Form](../../../../../../glossary/terms/tufte-form.md) means more than the HTML
  `form` element. It is the visible, typed shape through which state is
  perceived, edited, validated, submitted, refused, and reconciled, while
  native HTML forms remain the progressive-enhancement floor.
- [Topology](../../../../../../glossary/terms/tufte-topology.md) means the
  inspectable and transformable relations among surfaces, forms, focus,
  routes, data, actions, and responsive placements. Flat array order is one
  topology, not the final model.
- [Engine](../../../../../../glossary/terms/tufte-engine.md) means TUFTE supplies a
  coherent application runtime and engineering toolchain: rendering,
  scheduling, updates, resources, effects, transitions, debugging, testing,
  and build-time and server-time cooperation.

## Dependency direction

TUFTE is an engineering application framework. It uses browser platform
primitives and shared upstream engineering services when they provide the
best implementation. Dependency count, bundle minimalism, and avoidance of
framework-shaped machinery are constraints to measure, not reasons to refuse
capability.

VICTOR is downstream: it uses TUFTE to meet and beat website frameworks,
adding website routing, production build and serve behavior, assets,
publication, and operations. A website application such as Opal is downstream
of VICTOR. It should not acquire a parallel HTTP or website runtime because
TUFTE is incomplete.

Domain ontologies remain outside the TUFTE kernel unless they are truly common
web-interface concepts. That boundary prevents application vocabulary from
becoming framework policy; it does not justify omitting framework capability.

## Current correction

The package now exposes `describeTufteTopology` and
`reduceTufteTopology` from `./topology`. The former makes authored membership,
semantic placement, form ownership, and reading-order adjacency inspectable.
The latter deterministically accepts or refuses one move or resize operation
and returns a new normalized projection. This makes tiling topology an actual
runtime contract rather than only a CSS effect.

The same export now carries the workspace: nested tilings as a normalized
split tree, flattened onto one flat CSS grid (DOM reading order untouched),
rendered server-first with `role="separator"` splitters per interior edge,
and directly manipulable in the browser -- pointer drag, keyboard resize on
focused splitters, Alt+Shift+Arrow neighbor swap -- with every gesture a
`reduceTufteWorkspace` receipt or refusal and opt-in localStorage
persistence.

On 2026-09-16 the workspace gained the two operations the tiling arena's
MEET ledger still marked absent, both as consequences of the arrangement
being a value: `fullscreen`/`restore` (an overlay on the value, so restore
reproduces the prior arrangement exactly; covered tiles keep DOM order and
carry `hidden`; Alt+F) and undo/redo (`createTufteWorkspaceHistory`, a
bounded history of values replayed through the same apply path; Alt+Z and
Alt+Shift+Z; a pointer drag is one step). Persistence and pointer drag moved
from source-only to tested. Floating panes are now a named
refusal-with-alternative (native `<dialog>`/popover own that job), not a
silent absence. Tabbed/stacked containers, constraint solving beyond the
minimum-share floor, min-content-aware sizing, and gap-aware measured
geometry remain open.

## Capability floor still to earn

TUFTE is not world-class until representative applications can choose it
without rebuilding familiar framework machinery themselves. The current gap
ledger includes:

- composable views, nested tilings, slots, and application-owned reusable
  modules without losing semantic order or progressive enhancement;
- reactive state and derived computation with deterministic scheduling,
  cancellation, resources, effects, and observable failure;
- user-driven tiling with constraints, focus continuity, and responsive
  topology (pointer and keyboard parity, persistence, fullscreen, and undo
  are now in place and tested);
- form state that survives unrelated patches, with typed validation,
  optimistic and concurrent submissions, admission, refusal, and recovery;
- streaming server rendering, selective client activation, async boundaries,
  resumable navigation, and explicit client/server ownership;
- a development server, fast refresh where state can be preserved, source
  diagnostics, topology and update inspection, profiling, and browser-level
  conformance tests;
- an upstream-service integration policy and adapters that keep VICTOR and
  applications from hand-building missing framework layers.

Performance, accessibility, security, portability, developer experience, and
operability are dimensions of every capability above. A low byte count or a
passing local fake-DOM suite cannot substitute for them.
