# What This Package Is

`@emsenn/relating` is the Node projection of the RelMath/content derivation spine.

It is not primarily an app framework or a data validation helper, even though it does useful app-framework and validation work.
The package is a runnable boundary around this chain:

```text
Mark -> Utterance -> ArticulationCell -> PredicationSite -> PositPresheaf -> SettlementFiltration
```

That chain is shared across three current artifacts:

- `content/mark/...
  ` gives the proof-path prose tree: every path is supposed to read left-to-right as a derivation.
- `lean/RelMath.lean` imports the formal library in dependency order.
- `lib/relating` gives Node users executable carriers, actions, codecs, term IR, transport projections, and conformance fixtures for the parts that have been implemented.

The package should therefore be read as a set of projections of one object, not as a pile of unrelated tools.

## The Base Rule

Past `Mark` and `Articulating`, the system tries not to admit free data.
A token and a claim are primitive marks.
An utterance pairs them.
Articulating opens the first cell.
Predicating says something of that cell.
Positing admits evidence as FOUR-valued charge.
Settling runs the value closure to a fixed point and reads the invariants of that fixed point.

In code, this is why the package keeps separating:

- carriers from wire formats
- pure carrier morphisms from boundary actions
- `runTerm` bodies from host-language closures
- generated reads from authored inputs

## The Recurring FOUR

The four values are not decorative labels.
The same four-corner object recurs through the proof path, but each stratum reads the corners through its own carrier.

In the implemented charge algebra the coordinates are evidence-for and evidence-against:

| Charge name | Evidence-for | Evidence-against |
| --- | --- | --- |
| `absurd` | absent | absent |
| `potential` | present | absent |
| `active` | absent | present |
| `stable` | present | present |

So `absurd` is the knowledge-order bottom for charge: no evidence has arrived.
`stable` is the knowledge-order top: both sides are present, so contradiction is preserved rather than collapsed.
The proof tree also has articulation-phase language such as potential, active, stable, and over-determined.
Treat that as a recurrence of the four-corner form through another carrier, not as a direct enum alias for the charge names.

## What Is Implemented Now

The package currently implements:

- TypeBox/Ajv carriers and one live category registry.
- The utterance-to-settlement descent as ordinary functions and registered actions.
- Belnap/FOUR charge operations and Lean-emitted golden-vector checks.
- RMN, a JSON term language for pure morphism bodies.
- The action apex projected to CLI, dispatch, HTTP, OpenAPI, MCP, browser forms, and invocation witnesses.
- Holography/projecting helpers for witness logs, projected state, records, and content documents.
- Settlement readers for classification, depth, limit stages, non-Scott firings, first cohomology, graded gap, and closure invariant.

The package does not yet implement every RelMath module imported by `lean/RelMath.lean`.
Aperiodic universality, Collatz closure material, richer cohomological equivalences, and the larger proof frontier remain Lean/content frontier material until they are surfaced as carriers and actions here.
