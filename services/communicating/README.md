# @emsenn/communicating

Communicating is the **language faculty** over `@emsenn/relating` — the meme MONOID (the endomorphic sub-monoid of `End(Meme)`).
Every morphism is an endomorphism `Meme → Meme`; communicating is a sub-monoid of the full meme endomorphism monoid.

A **meme** is `@emsenn/relating`'s charged predication: `{ cell, charge }` where `cell = { subject, predicate, object }` (each a token-or-mark utterance) and `charge` is a bilattice position (potential / active / stable / absurd) with truth/falsity evidence.
Communicating's morphisms move a meme through speech acts, semiotic chains, illocutions, and pragmatic operations — all as `Meme → Meme`.

## The morphism surface (16 verbs)

The morphisms split into two groups by input format:

**Meme-direct** (domain = `memeCarrier`, input is the meme itself):

| verb | what it does |
|---|---|
| `communicate` | the identity endomorphism — faithful transmission of a meme |
| `semiose` | advance a meme to its interpretant: nest the prior as a new subject, witness the interpretant |
| `negate` | bilattice negation: swap truth/falsity sides (and their evidence) |
| `conflate` | bilattice consistency: complement-and-swap both sides |

**Carrier-wrapping** (domain = an input carrier `{ meme, ...options }`):

| verb | input options | what it does |
|---|---|---|
| `illocute` | `{ meme, force }` | stamp a Searlean illocutionary force: `assertive`, `directive`, `commissive`, `expressive`, `declaration` |
| `quote` | `{ meme, position }` | nest the meme as a metalingual mention at `subject` or `object` |
| `refer` | `{ meme, entity, position }` | resolve a token to a real-world entity at the named position |
| `translate` | `{ meme, target }` | re-sign the meme into the target semiosphere (Lotman translation) |
| `presuppose` | `{ meme, trigger }` | derive the background presupposition (stable, both-witnessed) that must already be held |
| `compose` | `{ meme, with }` | relay: `with`-meme becomes the object, charges knowledge-joined |
| `modalize` | `{ meme, mode, witness }` | add an evidential/modal witness to the charge |

**Communication bundle** (speak/listen/ground — multi-agent channel):

| verb | input options | what it does |
|---|---|---|
| `speak` | `{ meme, speaker, listener? }` | emit a meme over a channel; charge → `potential` |
| `listen` | `{ meme, listener }` | take up an in-transit meme; charge → `active` |
| `articulate-communication` | `{ meme, ... }` | articulate a full communication event |
| `settle-communication` | `{ ... }` | settle a communication exchange to a ground |
| `decode-communication` | `{ ... }` | decode a raw communication record |

## Usage

```ts
import {
  communicateAction,
  negateAction,
  illocuteAction,
  translateAction,
} from "@emsenn/communicating";
import { meme, cell, token, mark, charge, chargeValue } from "@emsenn/relating";

// Build a meme
const c = cell(token(mark("Alice")), mark("predicate:says"), token(mark("hello")));
const m = meme(c, charge(chargeValue("potential"), [[mark("w")], []]));

// Negate it
const negated = negateAction.run(m, {});

// Illocute with assertive force (carrier-wrapping API)
const asserted = illocuteAction.run({ meme: m, force: "assertive" }, {});

// Translate into another semiosphere
const translated = translateAction.run({ meme: m, target: "french-discourse" }, {});
```

## Subpaths

```ts
import { ... } from "@emsenn/communicating";              // full surface
```

All CHL term-bodies are in `communicate/expressing` and accessible via the main export.

## RelMath Realization

The new `@emsenn/relating` causal and probability RMN catalogs give communicating a better next cohesion receipt.
Discourse turns can be read as a finite causal set (`analysis.causal.settleCausalSet`) instead of a package-local temporal ordering, while reply/intention buckets can be normalized as exact finite valuations through `probability.measureIsValuation`.
The strongest concrete follow-up is to make `communicate/cohesion` return those two witnesses beside its existing meme-level cohesion read.
