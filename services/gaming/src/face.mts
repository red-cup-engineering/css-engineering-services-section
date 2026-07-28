/**
 * face — gaming's OUTSIDE local section over an inter-agent membrane, read on
 * the EVIDENCE axis.
 *
 * In the bulk-over-faces relation (dev/docs/notes/2026-06-21-bulk-over-faces-
 * local-section-threading.md), organizing is a holographic *bulk* over three
 * boundary *faces*; gaming is the **outside** face. Each face is a local section
 * over its faculty's inter-agent membrane (a `readonly UtteranceCarrier[]` log),
 * read on one of the three transverse bilattice axes (the agentive triad,
 * Avron's twist-product representation). Gaming reads the **evidence** axis: the
 * paired ⟨a₊, a₋⟩ for/against record (content/_archive …/predication-categories/
 * concepts/evidence.md — "the value of an assertion is a *pair* of independently
 * tracked sides, never collapsed into a single signed scalar"; negation
 * interchanges the sides).
 *
 * Crucially this is **gaming's own reading**, not organizing's generic
 * descend-then-section-count. The for/against pair is precisely Player/Opponent
 * polarity (structuring/concurrent-game/with-symmetry/polarity: positive ↔ told-
 * true ↔ Player, negative ↔ told-false ↔ Opponent). So gaming builds its OWN
 * **arena** — a polarized prime event structure with causality and conflict — out
 * of the membrane, and reads the local section off the *arena's event geometry*:
 *
 *   - cover     = the arena's events (each settled cell is one polarized event)
 *   - held      = events committing a definite side (chargePolarity ≠ null) —
 *                 the for/against record the arena actually holds
 *   - contested = events in CONFLICT (a for-event and an against-event on the
 *                 same locus) OR carrying the told-both (⊤, stable) charge — the
 *                 held contradiction the twist product reads at ⟨a₊,a₋⟩ = ⟨1,1⟩
 *
 * The bulk (organizing) glues this against socializing (truth) and computing
 * (knowledge) by the three-replica Mayer–Vietoris in its `crossArena`. This
 * module never imports `@red-cup-engineering/organizing`; the dependency runs bulk → faces,
 * and gaming is a leaf over relating/animating/playing.
 */
import {
  cell,
  chargeValue,
  claim,
  cohomologyTerms,
  evaluateRunTerm,
  fourCensus,
  mark,
  predicateOfClaim,
  rankVanishing,
  sectionOf,
  token,
  type ChargeValue,
  type JsonRecord,
  type JsonValue,
  type SectionEntry,
  type UtteranceCarrier,
} from "@red-cup-engineering/relating";
import {
  descend,
} from "@red-cup-engineering/animating";
import {
  arena,
  arenaEvents,
  event,
  eventStructure,
  polarity,
  transposition,
  eventName,
  nominalActionJudgment,
  type Arena,
  type Bijection,
  type Event,
  type EventPair,
  type EventNameLabel,
} from "./structuring/index.mjs";

/** The agentive-triad bilattice axis gaming's face reads. */
export type EvidenceAxis = "evidence";

/** The evidence-axis FOUR census of the arena's events, one corner per cell, read as
 *  ADJUDICATION's disciplines (the receiving-dual reading the organizing bulk consolidates;
 *  content/_archive adjudication.md) on the evidence twist product ⟨a₊,a₋⟩: ⊥ told-nothing
 *  = ⟨0,0⟩ held OPEN (no committed side), t told-true = ⟨1,0⟩ a₊ (Player / for), f
 *  told-false = ⟨0,1⟩ a₋ (Opponent / against), ⊤ told-both = ⟨1,1⟩ held CONTESTED. This is
 *  the clean per-cell partition of the cover by charge value (`potential`+`active` = the
 *  committed `held`; `stable` = the per-cell told-both); the richer `contested` (also
 *  counting for/against CONFLICT edges across cells) and `forCount`/`againstCount` remain
 *  the arena's own evidence geometry. */
export interface EvidenceBelnap {
  /** ⊥ held OPEN — the event commits no side (absurd charge); no evidence either way. */
  readonly absurd: number;
  /** t a₊ — Player / for: positive (told-true) evidence the arena holds. */
  readonly potential: number;
  /** f a₋ — Opponent / against: negative (told-false) evidence the arena holds. */
  readonly active: number;
  /** ⊤ told-both = ⟨1,1⟩ — the per-cell held contradiction (stable charge). */
  readonly stable: number;
}

/**
 * The CONCURRENCY structure of gaming's arena — its REAL CGS work (the defining datum of a
 * concurrent game, now that the generic census/charge math is upstream). The arena is a prime
 * event structure (E, ≤, #) and the three relations PARTITION the distinct event pairs (they
 * are exhaustive and mutually exclusive): causality `≤` (one event ENABLES another — sequential
 * order), conflict `#` (two events EXCLUDE each other — cannot both stand), and CONCURRENCY `co`
 * (neither — genuinely INDEPENDENT / parallel moves). Concurrency is what makes a CONCURRENT
 * game concurrent (vs sequential Hyland–Ong play); `causal + conflict + concurrent = C(|E|,2)`.
 * Grounded in dev/docs/notes/2026-06-21-gaming-as-multi-agent-playing.md (the arena = prime
 * event structure with symmetry; CGS = Rideau–Winskel / Castellan–Clairambault–Winskel).
 */
export interface ArenaConcurrency {
  /** ≤ — CAUSAL pairs: one event enables/precedes the other (the sequential order). */
  readonly causal: number;
  /** # — CONFLICT pairs: two events exclude each other (= the gluing `obstruction`). */
  readonly conflict: number;
  /** co — CONCURRENT pairs: neither causal nor conflicting — genuinely independent / parallel
   *  moves. The CGS-defining structure; 0 ⟺ the arena is sequential-or-fully-conflicted. */
  readonly concurrent: number;
}

/**
 * The SYMMETRY of gaming's arena — the datum `Ẽ` that promotes a plain concurrent game to
 * CGS proper (`(E,≤,#,Ẽ)`, the "WITH symmetry" of Castellan–Clairambault–Winskel). A
 * symmetry is a bijection on events preserving polarity, causality, and conflict; the groupoid
 * of such bijections is FSym(𝔸) — finite permutations of the agent/name set — and "symmetry IS
 * the multi-agent structure" (the nominalizing layer playing leaves un-surfaced, gaming's core;
 * 2026-06-21-gaming-as-multi-agent-playing.md). Two events are interchangeable when transposing
 * just them is a valid arena symmetry (decided by the REAL `nominalActionJudgment` law over
 * per-event AGMOS names) — structurally identical independent plays by interchangeable agents.
 * This is organizing's `nameMobility` (entity-mobility, FSym(𝔸)-equivariance) read at arena
 * scale: 0 symmetric pairs ⟺ a RIGID arena (every play a distinct role, no permutation symmetry);
 * `symmetric > 0` ⟺ genuinely "with symmetry" — the arena admits non-trivial agent permutations.
 */
export interface ArenaSymmetry {
  /** |𝔸| — the AGMOS name set: one fresh name per arena event (move). */
  readonly names: number;
  /** unordered event pairs related by a non-trivial transposition symmetry (FSym generators). */
  readonly symmetric: number;
  /** the symmetry ORBITS: events partitioned into interchangeable classes (components of the
   *  symmetric relation). `orbits === names` ⟺ rigid (every event its own orbit). */
  readonly orbits: number;
  /** events lying in an orbit of size ≥ 2 — the FSym-MOBILE moves (those with a symmetric
   *  partner). The arena-scale analog of organizing's `nameMobility`. */
  readonly interchangeable: number;
  /** whether the arena admits ANY non-trivial symmetry (`symmetric > 0`) — genuinely a CGS
   *  "concurrent game WITH symmetry" rather than a rigid (discrete-symmetry) concurrent game. */
  readonly uniform: boolean;
}

/**
 * Gaming's outside local section over a membrane, read on the evidence axis. The
 * thin trio `{ cover, held, contested }` is what the bulk consumes; the
 * axis-thick fields expose the arena geometry the trio is read from — the
 * Player/Opponent split (`forCount`/`againstCount`) and the conflict obstruction
 * (`conflicts`) that make this an *evidence* reading rather than a flat count.
 */
export interface GamingFace {
  readonly kind: "gaming.face";
  /** the sibling faculty supplying this face of organizing's social boundary. */
  readonly faculty: "gaming";
  /** where gaming acts relative to the organization's boundary. */
  readonly direction: "outside";
  /** the agentive-triad axis: the ⟨a₊, a₋⟩ for/against twist product. */
  readonly axis: EvidenceAxis;
  /** cells of the local section = the arena's polarized events. */
  readonly cover: number;
  /** events committing a definite side (a for-record or an against-record). */
  readonly held: number;
  /** held contradictions: events in for/against conflict, or told-both (⊤). */
  readonly contested: number;
  /** a₊: events the arena holds with positive (Player / for) polarity. */
  readonly forCount: number;
  /** a₋: events the arena holds with negative (Opponent / against) polarity. */
  readonly againstCount: number;
  /** the evidence-axis FOUR census of the arena's events (adjudication's disciplines, one
   *  corner per cell) — the thick reading the organizing bulk consolidates onto its Face. */
  readonly belnap: EvidenceBelnap;
  /** the within-face gluing obstruction H¹: the count of for/against CONFLICT edges in the
   *  arena (a positive event and a negative event on the same locus that cannot both stand —
   *  a Čech 1-cochain that fails to glue). 0 ⟺ the outside face's local section coheres
   *  coordination-free (CRDT/CALM convergence; content/…/settling-cohomology.md: H¹=0 is
   *  vanishing/settling). Distinct from `contested` (which also counts told-both ⊤ cells):
   *  `obstruction` is the cross-cell gluing failure, not the per-cell contradiction. */
  readonly obstruction: number;
  /** normalized first-cohomology receipt whose generators are the arena conflict edges. */
  readonly cohomology: JsonRecord;
  /** gaming's REAL CGS work: the CONCURRENCY structure of the arena — the causal/conflict/
   *  concurrent partition of its event pairs (the defining datum of a concurrent game). */
  readonly concurrency: ArenaConcurrency;
  /** the arena's SYMMETRY `Ẽ` — the FSym(𝔸) datum that makes this CGS "with symmetry" (the
   *  multi-agent structure), decided by the real `nominalActionJudgment` symmetry law. */
  readonly symmetry: ArenaSymmetry;
  /** the arena gaming built from the membrane (its own outside reading), CARRYING the
   *  discovered symmetry groupoid `Ẽ` (no longer the discrete identity-only arena). */
  readonly arena: Arena;
}

/** A leading-negation prefix on a claim — the evidence-side split (∼⟨a₊,a₋⟩ = ⟨a₋,a₊⟩). */
const NEGATION = /^\s*(?:!|¬|-|not\s+|no\s+|never\s+)/i;

/** The EVIDENCE SIDE a membrane claim commits: an assertion the FOR side a₊ (Player /
 *  positive), a denial the AGAINST side a₋ (Opponent / negative). gaming reads the arena's
 *  Player/Opponent polarity from the claim ITSELF (the established evidence pattern playing's
 *  face uses), NOT from the relating descent — which applies no negation ~ and so charges every
 *  cell positive, making every play look Player-side and an against-record (a₋) unreachable. */
const claimAgainst = (claimValue: unknown): boolean => {
  if (claimValue === false) return true;
  const text = typeof claimValue === "string" ? claimValue.trim() : String(claimValue);
  return NEGATION.test(text);
};

/** A settled cell's `subject|predicate` key — its locus identity in the arena. */
const cellKey = (cell: SectionEntry["cell"]): string =>
  `${String(cell.subject.mark.value)}|${String(cell.predicate.mark.value)}`;

/** A settled cell's subject — its locus (the agent/assertion the events sit on). */
const subjectKey = (cell: SectionEntry["cell"]): string =>
  String(cell.subject.mark.value);

/**
 * Build gaming's OWN arena from a settled membrane: each settled cell is one
 * polarized event. The charge's committed side IS the Player/Opponent polarity
 * (positive ↔ potential/told-true ↔ Player; negative ↔ active/told-false ↔
 * Opponent); cells whose charge commits no side (absurd ⊥ / told-both ⊤) get the
 * positive polarity by default but are *not* counted as held (see `gamingFace`).
 *
 * Causality chains events on the same locus by their settlement order — an
 * earlier for/against record on a locus causally precedes a later one (the
 * accumulation the knowledge order tracks, here read as the prefix order of the
 * arena's plays). Conflict joins an opposed pair on the same locus — a for-event
 * and an against-event on one assertion cannot both stand: the held
 * contradiction.
 */
function arenaOfMembrane(entries: readonly SectionEntry[]): {
  readonly arena: Arena;
  readonly committed: ReadonlyMap<string, "positive" | "negative">;
} {
  const events: Event[] = [];
  const causality: EventPair[] = [];
  const conflict: EventPair[] = [];
  const committed = new Map<string, "positive" | "negative">();
  // last seen event id per locus, and the for/against event ids per locus.
  const lastOnLocus = new Map<string, string>();
  const forOnLocus = new Map<string, string[]>();
  const againstOnLocus = new Map<string, string[]>();

  for (const entry of entries) {
    const id = cellKey(entry.cell);
    if (committed.has(id) || events.some((e) => e.id === id)) continue; // one event per cell
    // the Player/Opponent polarity IS the claim's evidence side — assertion ↦ positive (a₊),
    // denial ↦ negative (a₋) — read negation-aware off the claim, not the all-positive descent.
    const name: "positive" | "negative" = claimAgainst(entry.cell.predicate.mark.value) ? "negative" : "positive";
    events.push(event(id, polarity(name)));
    committed.set(id, name);

    const locus = subjectKey(entry.cell);
    const prev = lastOnLocus.get(locus);
    if (prev !== undefined) causality.push(Object.freeze([prev, id] as const));
    lastOnLocus.set(locus, id);

    if (name === "positive") {
      for (const opp of againstOnLocus.get(locus) ?? []) conflict.push(Object.freeze([opp, id] as const));
      forOnLocus.set(locus, [...(forOnLocus.get(locus) ?? []), id]);
    } else if (name === "negative") {
      for (const f of forOnLocus.get(locus) ?? []) conflict.push(Object.freeze([f, id] as const));
      againstOnLocus.set(locus, [...(againstOnLocus.get(locus) ?? []), id]);
    }
  }

  return {
    arena: arena(eventStructure(events, causality, conflict)),
    committed,
  };
}

/** The CONCURRENCY partition of an arena's event pairs: causal (≤), conflict (#), and
 *  concurrent (co — neither). Exhaustive and mutually exclusive over distinct pairs, so
 *  `causal + conflict + concurrent = C(|E|,2)`. Concurrency is the CGS-defining structure. */
function concurrencyOf(a: Arena, eventCount: number): ArenaConcurrency {
  const pairKey = (x: string, y: string): string => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const causalSet = new Set(a.structure.causality.map(([x, y]) => pairKey(x, y)));
  const conflictSet = new Set(a.structure.conflict.map(([x, y]) => pairKey(x, y)));
  const causal = causalSet.size;
  const conflict = conflictSet.size;
  const total = (eventCount * (eventCount - 1)) / 2;
  const concurrent = Math.max(0, total - causal - conflict);
  return Object.freeze({ causal, conflict, concurrent });
}

/**
 * Discover the arena's SYMMETRY groupoid `Ẽ` from the membrane, using the REAL CGS symmetry
 * law (`nominalActionJudgment` over per-event AGMOS names): two events are interchangeable iff
 * transposing JUST them (fixing the rest) is a valid arena symmetry — total, bijective, and
 * preserving polarity/causality/conflict. Returns both the FSym-generator bijections (to install
 * into the arena as `Ẽ`) and the `ArenaSymmetry` reading (orbits/interchangeable/uniform), with
 * orbits computed as the connected components of the symmetric relation (union–find). */
function symmetryOf(a: Arena, events: readonly Event[]): { readonly reading: ArenaSymmetry; readonly groupoid: readonly Bijection[] } {
  const n = events.length;
  // each event named by its own id (unique cellKeys) — the AGMOS one-name-per-move labelling.
  const labels: readonly EventNameLabel[] = events.map((e) => eventName(e.id, e.id));
  // union–find over event indices for the orbit partition.
  const parent = events.map((_, i) => i);
  const find = (i: number): number => { let r = i; while (parent[r] !== r) { parent[r] = parent[parent[r] as number] as number; r = parent[r] as number; } return r; };
  const union = (i: number, j: number): void => { const ri = find(i), rj = find(j); if (ri !== rj) parent[ri] = rj; };

  const groupoid: Bijection[] = [];
  let symmetric = 0;
  for (let i = 0; i < n; i += 1) {
    const ei = events[i] as Event;
    for (let j = i + 1; j < n; j += 1) {
      const ej = events[j] as Event;
      const judgment = nominalActionJudgment(a, labels, transposition(ei.id, ej.id));
      if (judgment.kind === "game.nominal.action:witness") {
        symmetric += 1;
        groupoid.push(judgment.bijection);
        union(i, j);
      }
    }
  }
  const roots = new Set<number>();
  for (let i = 0; i < n; i += 1) roots.add(find(i));
  let interchangeable = 0;
  const orbitSize = new Map<number, number>();
  for (let i = 0; i < n; i += 1) { const r = find(i); orbitSize.set(r, (orbitSize.get(r) ?? 0) + 1); }
  for (let i = 0; i < n; i += 1) if ((orbitSize.get(find(i)) ?? 0) >= 2) interchangeable += 1;

  return {
    reading: Object.freeze({ names: n, symmetric, orbits: roots.size, interchangeable, uniform: symmetric > 0 }),
    groupoid,
  };
}

/** The ids that appear in any conflict edge of the arena. */
function conflictedIds(a: Arena): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const [from, to] of a.structure.conflict) {
    ids.add(from);
    ids.add(to);
  }
  return ids;
}

type NaturalCarrier = {
  readonly kind: "exactNumber.natural";
  readonly members: readonly NaturalCarrier[];
};

const natZeroCarrier: NaturalCarrier = Object.freeze({ kind: "exactNumber.natural" as const, members: Object.freeze([]) });
const successorCarrier = (value: NaturalCarrier): NaturalCarrier =>
  Object.freeze({ kind: "exactNumber.natural" as const, members: Object.freeze([...value.members, value]) });
function naturalOfSize(size: number): NaturalCarrier {
  let value = natZeroCarrier;
  for (let index = 0; index < size; index += 1) value = successorCarrier(value);
  return value;
}

const conflictPredicate = predicateOfClaim(claim(mark("gaming-conflict")));
const eventToken = (id: string) => token(mark(id));
const stageOfGenerator = (index: number): JsonRecord => {
  const ordinal = index === 0
    ? Object.freeze({ kind: "ordinal.closure.ordinal.zero" as const })
    : Object.freeze({ kind: "ordinal.closure.ordinal.successor" as const, predecessor: Object.freeze({ kind: "ordinal.closure.ordinal.zero" as const }) });
  const stageOrdinal = Object.freeze({ kind: "predication.settling.stageOrdinal" as const, ordinal });
  return Object.freeze({
    kind: index === 0 ? "predication.settling.stage.initial" as const : "predication.settling.stage.successor" as const,
    ordinal: stageOrdinal,
  }) as JsonRecord;
};

function conflictCohomologyReceipt(a: Arena): JsonRecord {
  const conflictCells = a.structure.conflict.map(([from, to]) => cell(eventToken(from), conflictPredicate, eventToken(to)));
  const rank = naturalOfSize(conflictCells.length);
  const firstCohomology = Object.freeze({
    kind: "predication.settling.firstCohomology" as const,
    generators: Object.freeze(conflictCells.map((conflictCell, index) => Object.freeze({
      kind: "predication.settling.firstCohomologyGenerator" as const,
      stage: stageOfGenerator(index),
      cell: conflictCell,
    }))),
    rank,
    degree: 1 as const,
    vanishing: rankVanishing(rank),
  });
  return Object.freeze({
    kind: "gaming.face.conflict-cohomology" as const,
    obstruction: conflictCells.length,
    first: evaluateRunTerm(cohomologyTerms.settlingFirst, firstCohomology as unknown as JsonValue),
    vanishing: evaluateRunTerm(cohomologyTerms.rankVanishing, firstCohomology.vanishing as unknown as JsonValue),
  }) as JsonRecord;
}

/**
 * Gaming's outside face: read the membrane as gaming's own arena and project the
 * evidence-axis local section.
 *
 * Domain: an inter-agent membrane (a `readonly UtteranceCarrier[]` log).
 * Codomain: `GamingFace` — `{ cover, held, contested }` (the trio the bulk
 * glues) plus the arena and the ⟨for, against⟩ split it was read from.
 *
 * Law: `cover` = |arena events|; `held` = events committing a definite side
 * (for + against); `contested` = events in a for/against conflict OR carrying
 * the told-both (⊤, stable) charge. An empty membrane yields the empty arena and
 * the zero section. This is gaming's reading — the arena's event geometry — not
 * a relabelled generic descend.
 */
export function gamingFace(membrane: readonly UtteranceCarrier[]): GamingFace {
  if (membrane.length === 0) {
    const emptyArena = arena(eventStructure([]));
    return Object.freeze({
      kind: "gaming.face" as const,
      faculty: "gaming" as const,
      direction: "outside" as const,
      axis: "evidence" as const,
      cover: 0,
      held: 0,
      contested: 0,
      forCount: 0,
      againstCount: 0,
      belnap: Object.freeze({ absurd: 0, potential: 0, active: 0, stable: 0 }),
      obstruction: 0,
      cohomology: conflictCohomologyReceipt(emptyArena),
      concurrency: Object.freeze({ causal: 0, conflict: 0, concurrent: 0 }),
      symmetry: Object.freeze({ names: 0, symmetric: 0, orbits: 0, interchangeable: 0, uniform: false }),
      arena: emptyArena,
    });
  }

  const state = descend(membrane);
  const entries = sectionOf(state.readings.knowledgeLeast).entries;
  const { arena: discrete, committed } = arenaOfMembrane(entries);
  const events = arenaEvents(discrete);
  // discover the FSym(𝔸) symmetry groupoid Ẽ and install it: the arena is now "with symmetry".
  const { reading: symmetry, groupoid } = symmetryOf(discrete, events);
  const built = arena(discrete.structure, groupoid);
  const conflicted = conflictedIds(built);

  let forCount = 0;
  let againstCount = 0;
  // The evidence-axis FOUR census is PARAMETERIZED from relating's `fourCensus` over the distinct
  // cells' COMMITTED evidence side (the negation-aware Player/Opponent polarity, not the
  // all-positive descent charge): positive→a₊ potential, negative→a₋ active. A per-cell ⊤
  // (told-both) does not arise — each present claim commits ONE side; the held contradiction ⊤
  // surfaces instead as a for/against CONFLICT edge across cells on a locus (gaming's event-
  // structure model of told-both), counted in `contested`/`obstruction`.
  const distinctCharges: ChargeValue[] = [];
  const censused = new Set<string>();
  for (const entry of entries) {
    const id = cellKey(entry.cell);
    const side = committed.get(id);
    if (side === "positive") forCount += 1;
    else if (side === "negative") againstCount += 1;
    if (!censused.has(id)) {
      censused.add(id);
      distinctCharges.push(chargeValue(side === "negative" ? "active" : "potential"));
    }
  }
  const belnap = fourCensus(distinctCharges);

  const held = forCount + againstCount;
  // contested = held contradictions: for/against CONFLICT events on a shared locus (the ⊤
  // told-both the evidence twist product reads as ⟨1,1⟩, here a conflict edge in the arena).
  const contested = conflicted.size;

  return Object.freeze({
    kind: "gaming.face" as const,
    faculty: "gaming" as const,
    direction: "outside" as const,
    axis: "evidence" as const,
    cover: events.length,
    held,
    contested,
    forCount,
    againstCount,
    belnap: Object.freeze(belnap),
    // H¹: the for/against conflict edges — the arena's gluing obstruction (≠ contested).
    obstruction: built.structure.conflict.length,
    cohomology: conflictCohomologyReceipt(built),
    // gaming's CGS-defining reading: the causal/conflict/concurrent partition of the arena.
    concurrency: concurrencyOf(built, events.length),
    // the FSym(𝔸) symmetry Ẽ the membrane's interchangeable plays exhibit (the "with symmetry").
    symmetry,
    arena: built,
  });
}
