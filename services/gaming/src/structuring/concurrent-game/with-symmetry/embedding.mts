/**
 * The CGS embeddings realized as gaming OBJECT-MAPS into real arenas.
 *
 * `@red-cup-engineering/playing/ludics` owns the SOURCE-side algebra of the four embeddings
 * (the Dialectica object `(U, X, α)` with its `*`-autonomous dual/tensor, the
 * Caires–Pfenning `session → CLL proposition` map, and the named embedding
 * catalog). What playing deliberately does NOT realize is the codomain: the
 * arena-with-symmetry that each source object lands on, because that is the
 * multi-agent (CGS) face. As the playing embeddings module says of the Dialectica
 * map, "the realized object-map into a CGS arena … belongs to
 * @red-cup-engineering/gaming-experimental." This module is that realization — it consumes the
 * imported source algebra and produces gaming `Arena`s (and, for the CLL reading,
 * the proposition naming a behaviour), reusing playing's source maps verbatim.
 *
 * The transformer realized here is the object component of
 *   F : Dial(Eff) → CGS
 * (content/_archive …/computing/code/transformers/f-dial-to-cgs.md): an object
 * `(U, X, α)` maps to the concurrent game arena with P-events `U`, O-events `X`,
 * TRIVIAL causality (all events concurrent), intra-polarity conflict
 * (`u # u'` for `u ≠ u'`, `x # x'` for `x ≠ x'`), NO cross P–O conflict, and the
 * TRIVIAL symmetry groupoid (`discreteArena`). The functor preserves the
 * `*`-autonomous structure on the nose: `F(A^⊥) = (FA)^⊥` (the polarity swap of
 * the Dialectica dual) and `F(A ⊗ B) = FA ‖ FB` (the Dialectica tensor maps to
 * parallel composition), both of which fall out of the source algebra
 * (`dualDialectica`/`tensorDialectica`) composed with this object-map.
 */
import {
  type DialecticaObject,
  type Proposition,
  type SessionType,
  type EmbeddingName,
  dialecticaUnit,
  dualDialectica,
  tensorDialectica,
  propositionOfSession,
  // event/eventStructure/polarity substrate (re-exported by gaming from playing/ludics)
  type Event,
  type EventPair,
  event,
  eventStructure,
  positive,
  negative,
} from "@red-cup-engineering/playing/ludics";
import { type Arena, discreteArena } from "./arena.mjs";
import {
  type FinitePermutation,
} from "./nominalizing/permutation.mjs";
import {
  type EventNameLabel,
} from "./nominalizing/action.mjs";
import {
  type NominalArenaJudgment,
  nominalArenaJudgment,
} from "./nominalizing/arena.mjs";

// ── 1. The Dialectica object-map  F : Dial(Eff) → CGS  (the f-dial-to-cgs functor) ──

/**
 * Event-id namespaces keep a witness `u ∈ U` and a challenge `x ∈ X` that happen
 * to share a name from colliding on the same arena event. The polarity already
 * distinguishes them; the prefix only guarantees distinct event ids. The map is
 * still "P-events = U, O-events = X" — the names are recoverable by stripping the
 * one-character prefix.
 */
const witnessEventId = (witness: string): string => `P:${witness}`;
const challengeEventId = (challenge: string): string => `O:${challenge}`;

/** All distinct unordered pairs over a list of ids — the all-pairs conflict relation. */
function allPairsConflict(ids: readonly string[]): EventPair[] {
  const pairs: EventPair[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      pairs.push(Object.freeze([ids[i]!, ids[j]!] as const));
    }
  }
  return pairs;
}

/**
 * `dialecticaObjectToArena(obj)` — the EXACT object component of
 * `F : Dial(Eff) → CGS`. The witness type `U` becomes the P-events (`positive`),
 * the challenge type `X` becomes the O-events (`negative`); causality is trivial
 * (no edges — all events concurrent, the defining concurrency of Dialectica
 * interaction); conflict is intra-polarity all-pairs (`u # u'`, `x # x'`,
 * encoding "exactly one witness / exactly one challenge is committed") with NO
 * cross P–O conflict (every `(u, x)` pair is a valid play); and the symmetry
 * groupoid is trivial (`discreteArena`). The acceptance `α` is NOT arena data —
 * it scores complete plays and is preserved as the source object, not folded into
 * the event structure — so this is faithfully the object-map, no more.
 *
 * Reuses gaming's `event` / `eventStructure` / `discreteArena` and playing's
 * `positive` / `negative` verbatim — no new arena machinery.
 */
export function dialecticaObjectToArena(obj: DialecticaObject): Arena {
  const witnessEvents: Event[] = obj.witnesses.map((w) => event(witnessEventId(w), positive()));
  const challengeEvents: Event[] = obj.challenges.map((x) => event(challengeEventId(x), negative()));
  const events: readonly Event[] = [...witnessEvents, ...challengeEvents];

  const causality: readonly EventPair[] = []; // trivial — all events concurrent

  const conflict: readonly EventPair[] = [
    ...allPairsConflict(witnessEvents.map((e) => e.id)), // u # u' for u ≠ u'
    ...allPairsConflict(challengeEvents.map((e) => e.id)), // x # x' for x ≠ x'
    // no cross P–O conflict: every (u, x) is a valid play
  ];

  return discreteArena(eventStructure(events, causality, conflict));
}

/**
 * The image of the Dialectica unit `I = (1, 1, ⊤)` under `F`: one P-event, one
 * O-event, no conflict (singletons), trivial symmetry — `F(I)`. (The corpus also
 * notes `F(1,1,⊤)` is the CGS unit/empty arena up to this degenerate reading; we
 * realize the literal one-witness/one-challenge object's arena.)
 */
export const dialecticaUnitArena = (): Arena => dialecticaObjectToArena(dialecticaUnit());

/**
 * `F(A^⊥) = (FA)^⊥` realized on the SOURCE side: the Dialectica dual swaps
 * witnesses/challenges (`dualDialectica`), and applying `F` to the dual yields the
 * arena whose P/O events are swapped relative to `FA` — exactly the CGS dual
 * (polarity swap). We realize the LHS via the source-algebra dual composed with
 * the object-map; the equality is the functor's dual-preservation law.
 */
export const dualDialecticaArena = (obj: DialecticaObject): Arena =>
  dialecticaObjectToArena(dualDialectica(obj));

/**
 * `F(A ⊗ B) = FA ‖ FB` realized on the SOURCE side: the Dialectica tensor
 * (`tensorDialectica`, the `l:`/`r:` namespaced disjoint union) maps under `F` to
 * the parallel composition of the two factor arenas. We realize `F(A ⊗ B)` by the
 * source-algebra tensor composed with the object-map; the resulting arena is the
 * concurrent (parallel) product, the `‖`-image the corpus names.
 */
export const tensorDialecticaArena = (left: DialecticaObject, right: DialecticaObject): Arena =>
  dialecticaObjectToArena(tensorDialectica(left, right));

// ── 2. The AGMOS nominal arena: FSym(𝔸) inside the symmetry groupoid ──

/**
 * `nominalArena(structure-or-arena, labels, permutations)` — an FSym(𝔸)-symmetric
 * arena: the base arena enriched so its symmetry groupoid contains the supplied
 * finite name-permutations, realizing the AGMOS nominal embedding's defining
 * content (the NON-TRIVIAL symmetry groupoid). Each `FinitePermutation` is turned
 * into an event bijection via the `labels` (the event↦name labelling) and admitted
 * into `Arena.symmetry` exactly when it acts as a valid CGS symmetry — this is
 * `nominalizing`'s `nominalArenaJudgment`, reused verbatim. On success the witness
 * carries the enriched `Arena`; on failure it carries the obstruction (the
 * permutation that is not a symmetry of the arena). Use `nominalArenaOf` for the
 * arena directly (throws on obstruction).
 */
export function nominalArena(
  base: Arena,
  labels: readonly EventNameLabel[],
  permutations: readonly FinitePermutation[],
): NominalArenaJudgment {
  return nominalArenaJudgment(base, labels, permutations);
}

/**
 * The enriched FSym(𝔸)-symmetric `Arena` directly — the realized AGMOS nominal
 * object. Throws a `TypeError` when a supplied permutation does not act as a CGS
 * symmetry of the arena (the obstruction is the embedding's well-formedness
 * failure). When no permutations are supplied the base arena is returned as-is.
 */
export function nominalArenaOf(
  base: Arena,
  labels: readonly EventNameLabel[],
  permutations: readonly FinitePermutation[],
): Arena {
  const judgment = nominalArena(base, labels, permutations);
  if (judgment.kind !== "game.nominal.arena:witness") {
    throw new TypeError(
      `nominalArena: permutation does not act as a CGS symmetry of the arena (${judgment.obstruction.kind}, reason ${judgment.obstruction.reason})`,
    );
  }
  return judgment.arena;
}

// The FSym(𝔸) primitives this nominal object-map is built from
// (`finitePermutation`, `transposition`, `applyPermutation`, `eventName`, and the
// `FinitePermutation`/`NominalName`/`EventNameLabel` types) are already on the
// with-symmetry barrel via `nominalizing/index.mjs`; we do not re-export them
// again here to avoid an ambiguous duplicate star-export.

// ── 3. The Caires–Pfenning object-map: session → CLL proposition (the CGS_CLL reading) ──

/**
 * `cairesPfenningArena(session)` — the Caires–Pfenning object-map: a session type
 * to the CLL `Proposition` naming its `CGS_CLL` behaviour. This is the existing
 * `propositionOfSession` (Caires-Pfenning 2010 / Wadler 2012), REUSED verbatim —
 * the proposition is the syntactic name of the concurrent strategy/behaviour the
 * session embeds to. (playing also re-exports the identical map as
 * `cairesPfenningEmbed`; we keep this gaming-side name distinct to avoid a
 * duplicate star-export through the barrel.) Distinct from the arena-producing
 * maps: the CLL reading lands on a proposition (the behaviour's type), not
 * directly on an event-structure arena, which is why its gaming codomain is the
 * embedding-image carrier rather than `gaming/arena`.
 */
export const cairesPfenningArena = (session: SessionType): Proposition =>
  propositionOfSession(session);

// ── 4. Hyland–Ong: named-only (no PCF-type arena-former) ──

/**
 * The Hyland–Ong embedding stays NAMED-ONLY. Its object-map is "PCF type ↦
 * sequential alternating well-bracketed arena", which needs a full PCF-type arena
 * former (a recursive game-type interpreter for `→`, `×`, base types) — machinery
 * the corpus does not give as a primitive and that this object-map task does not
 * scope. The catalog entry (`hylandOng()` in playing's embeddings) names the
 * sequential fragment and its full-abstraction theorem; that remains its sole
 * realization. We expose the name so the catalog and the realized maps share one
 * vocabulary.
 *
 * (If a single base-type arena were wanted as a trivial witness it would be a
 * one-positive-event arena — but that is not the HO object-map, only a degenerate
 * point of it, so we do not pass it off as the embedding.)
 */
export const hylandOngName: EmbeddingName = "hylandOng";

/**
 * The embeddings whose object-map is REALIZED here as a gaming object-map, by
 * name: `dialectica` (→ arena, the f-dial-to-cgs functor), `nominal` (→ FSym(𝔸)-
 * symmetric arena, AGMOS), and `cairesPfenning` (→ CLL proposition naming a
 * behaviour). `hylandOng` is absent — it stays named-only in the catalog.
 */
export const realizedEmbeddingNames = (): readonly EmbeddingName[] =>
  Object.freeze(["dialectica", "nominal", "cairesPfenning"] as const satisfies readonly EmbeddingName[]);
