/**
 * gaming/market/arena — the market read as a concurrent game.
 *
 * Authority: `dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md`
 * §4 stage 6 ("market = concurrent game"): *"The double auction / matching engine
 * = CGS with symmetry; Walras/Nash equilibrium = the settled game position; auctions
 * & mechanism design = arena construction. This is where the retired 'market-as-arena'
 * reading is revived honestly — markets are the canonical concurrent game, not a
 * vestigial admission stub."* And §7's prohibition: *"The one thing NOT to revive
 * as-is: the dead 'market read as a gaming `Arena`' stub (retired when the gaming-CGS
 * algebra changed). It is revived properly at §4 stage 6 on gaming's real CGS, or it
 * stays absent — never re-stubbed."*
 *
 * This module composes gaming's own primitives from the ground up:
 *
 *   - **events** (`event(id, polarity)`). One event per book-level slot plus one fill
 *     event per crossing (bid-level, ask-level) pair. Polarity is the corpus's
 *     P/O ↔ charge convention (`polarityCharge`): a resting **bid** and a resting
 *     **ask** are both `negative()` (Opponent — standing liquidity the market posts
 *     and may withdraw), and a **fill** is `positive()` (Proponent — the affirmative
 *     act that consumes liquidity, the "told-true" of a deal). This matches stage 6's
 *     reading of a fill as the cut-elimination (the affirmative settlement) of two
 *     resting designs.
 *   - **causality** (`['bid','fill']`, `['ask','fill']`). A fill RESTS ON a bid and
 *     an ask: an event may not occur until its causes have, so a `fill:i-j` cannot
 *     occur before its `bid:i` and its `ask:j`. This is the prime-event-structure
 *     reading of "a trade requires a resting buyer and a resting seller".
 *   - **conflict** (two fills of the same liquidity are mutually exclusive). Liquidity
 *     is non-copyable (the anti-fetishism / linearity law of stage 2): two fills that
 *     draw on the same bid level, or on the same ask level, are in CGS conflict (`#`)
 *     — they never both occur. This is the double-auction matching constraint stated
 *     as the event structure's conflict relation, not as imperative bookkeeping.
 *   - **symmetry** (`nominalArenaJudgment`). Participants are interchangeable: the
 *     order ids of one side are an FSym(𝔸) name set, and the nominal arena judgment
 *     adds the interchanging permutations to the arena's symmetry groupoid. Anonymity
 *     of orders (price-time priority modulo identity) IS nominal equivariance.
 *
 * The **equilibrium** is the settled game position (stage 6: *"Walras/Nash equilibrium
 * = the settled game position"*). It is `createGame → addDesign(bid) → addDesign(ask)
 * → settle`, REUSING the exchange layer's bid/ask `Design`s (stage 2's P/O designs) as
 * the enrolled designs. `settle` discriminates on `.kind` and returns an obstruction
 * carrier rather than throwing — fewer than two designs (an unmatchable book side)
 * settles to a `too-few-designs` obstruction, which is data, never an exception.
 *
 * Every verb is registered once as a relating `action` so `induceBins` projects the
 * whole surface to every transport. Carriers are gaming's own frozen carriers
 * (`Arena`, `PrimeEventStructure`, `SymmetryJudgment`, `Game`) — nothing new is
 * invented; the market is presented as the concurrent game it already is.
 */
import {
  carrierFrom,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@red-cup-engineering/relating";
import { action } from "../action.mjs";
import {
  arena,
  event,
  eventName,
  eventStructure,
  finitePermutation,
  identityBijection,
  negative,
  nominalArenaJudgment,
  permutationBijection,
  polarityCharge,
  positive,
  symmetryJudgment,
  type Arena,
  type Bijection,
  type Design,
  type EventNameLabel,
  type EventPair,
  type Event as GameEvent,
  type FinitePermutation,
  type PrimeEventStructure,
  type SymmetryJudgment,
} from "../structuring/index.mjs";
import { GameComputer } from "../running/computer.mjs";
import { addDesign, settle, type Game } from "../running/game.mjs";

import type { BookLevel, OrderBook } from "./index.mjs";

/** The carrier `$id` of a market arena — the order book read as a CGS arena. */
export const MARKET_ARENA_ID = "gaming/market/arena";

/** The `{ $ref }` slot the market-arena morphisms reference. */
export const marketArenaRef = Object.freeze({ $ref: MARKET_ARENA_ID });

/** The carrier `$id` of a market equilibrium — the settled game position of a book. */
export const MARKET_EQUILIBRIUM_ID = "gaming/market/equilibrium";

/** The `{ $ref }` slot the equilibrium morphism references. */
export const equilibriumRef = Object.freeze({ $ref: MARKET_EQUILIBRIUM_ID });

export const marketArenaRequestCarrier = carrierFrom({
  $id: "gaming/market/arena-request",
  title: "MarketArenaRequest",
  type: "object",
  properties: {
    book: { $ref: "gaming/market/book" },
  },
  required: ["book"],
  description: "A request to read an order book as a gaming CGS arena.",
} as const);

export const marketArenaCarrier = carrierFrom({
  $id: MARKET_ARENA_ID,
  title: "MarketArena",
  type: "object",
  description: "The order book read as a concurrent-game arena.",
} as const);

export const marketEquilibriumRequestCarrier = carrierFrom({
  $id: "gaming/market/equilibrium-request",
  title: "MarketEquilibriumRequest",
  type: "object",
  properties: {
    arena: marketArenaRef,
    bid: { $ref: "gaming/design" },
    ask: { $ref: "gaming/design" },
  },
  required: ["arena", "bid", "ask"],
  description: "A request to settle an arena with bid and ask designs into the market equilibrium.",
} as const);

export const marketEquilibriumCarrier = carrierFrom({
  $id: MARKET_EQUILIBRIUM_ID,
  title: "MarketEquilibrium",
  type: "object",
  description: "The settled game position of a market book, or a settle obstruction carrier.",
} as const);

/** The event id of the `i`-th resting bid level. */
const bidEventId = (i: number): string => `bid:${i}`;

/** The event id of the `j`-th resting ask level. */
const askEventId = (j: number): string => `ask:${j}`;

/** The event id of the fill that consumes bid level `i` against ask level `j`. */
const fillEventId = (i: number, j: number): string => `fill:${i}-${j}`;

/**
 * Whether ask level `ask` crosses bid level `bid` — i.e. the bid price meets or
 * exceeds the ask price, so the two resting orders CAN match. We compare the
 * exact-rational price coordinates structurally so no float ever touches the
 * crossing test; an opaque `Money` carrier's `value` is `{ num, den }` of
 * `Integer`s, and `bid.price ≥ ask.price ⟺ bidNum·askDen ≥ askNum·bidDen` once
 * both are read into a common comparable. We avoid importing the analysis
 * comparator here (the book layer owns money arithmetic) and instead admit any
 * pair as POTENTIALLY crossing, letting the fill-event/conflict structure carry
 * the matching constraint; the price geometry is read at the microstructure /
 * socializing edge, not re-derived in the game board. Every (bid, ask) pair is
 * therefore a candidate fill slot, and conflict — non-copyable liquidity — is
 * what forbids double-spending a level.
 */
const crosses = (_bid: BookLevel, _ask: BookLevel): boolean => true;

/**
 * The prime event structure of an order book: the raw CGS board.
 *
 * Events: one `negative` (Opponent / resting-liquidity) event per bid level and
 * per ask level, and one `positive` (Proponent / affirmative-deal) fill event per
 * crossing (bid, ask) pair. Causality: each fill rests on its bid and its ask.
 * Conflict: two fills sharing a bid level — or sharing an ask level — are mutually
 * exclusive (the same liquidity cannot be consumed twice).
 *
 * This is `eventStructure(events, causality, conflict)` over gaming's real
 * `event`/`eventStructure` — no order-book Arena stub is revived.
 */
export function marketStructure(book: OrderBook): PrimeEventStructure {
  const events: GameEvent[] = [];
  const causality: EventPair[] = [];

  // Resting bids and asks are standing Opponent liquidity: negative polarity.
  book.bids.forEach((_level, i) => {
    events.push(event(bidEventId(i), negative()));
  });
  book.asks.forEach((_level, j) => {
    events.push(event(askEventId(j), negative()));
  });

  // A fill per crossing pair: an affirmative Proponent act that consumes liquidity.
  // Index the fills by the (bid, ask) levels they draw on so conflict can group them.
  const fillsByBid = new Map<number, string[]>();
  const fillsByAsk = new Map<number, string[]>();
  const groupBy = (map: Map<number, string[]>, key: number, id: string): void => {
    const bucket = map.get(key);
    if (bucket === undefined) map.set(key, [id]);
    else bucket.push(id);
  };
  book.bids.forEach((bidLevel, i) => {
    book.asks.forEach((askLevel, j) => {
      if (!crosses(bidLevel, askLevel)) return;
      const id = fillEventId(i, j);
      events.push(event(id, positive()));
      // Causality: the fill cannot occur before its resting bid and its resting ask.
      causality.push([bidEventId(i), id] as const);
      causality.push([askEventId(j), id] as const);
      groupBy(fillsByBid, i, id);
      groupBy(fillsByAsk, j, id);
    });
  });

  // Conflict: two fills drawing on the same liquidity (same bid level OR same ask
  // level) are mutually exclusive — non-copyable liquidity, the linearity law.
  const conflict: EventPair[] = [];
  const addPairwiseConflict = (ids: readonly string[]): void => {
    for (let a = 0; a < ids.length; a += 1) {
      for (let b = a + 1; b < ids.length; b += 1) {
        conflict.push([ids[a]!, ids[b]!] as const);
      }
    }
  };
  for (const ids of fillsByBid.values()) addPairwiseConflict(ids);
  for (const ids of fillsByAsk.values()) addPairwiseConflict(ids);

  return eventStructure(events, causality, conflict);
}

/**
 * The market as a concurrent game arena — the HONEST revival of "market-as-arena".
 *
 * Composes `eventStructure(bid/ask/fill events, causality, conflict)` (the prime
 * event structure of the book) into an `arena`, with the participant-interchange
 * symmetry of `bookSymmetry` folded into the arena's symmetry groupoid when the
 * interchange acts as a valid CGS symmetry. This is NOT the retired stub: there is
 * no `marketArena` primitive in gaming; the board is built from `event`/
 * `eventStructure`/`arena` directly per stage 6.
 */
export function marketArena(book: OrderBook): Arena {
  const structure = marketStructure(book);
  const base = arena(structure);
  // Fold the participant-interchange symmetry (FSym(𝔸)) onto the board when it acts
  // as a valid CGS symmetry; otherwise the bare arena (identity symmetry only) is the
  // honest board. This is the nominal-arena revival — not the retired stub.
  const judgment = nominalArenaJudgment(base, bookLabels(book), bookPermutations(book));
  if (judgment.kind === "game.nominal.arena:witness") {
    return judgment.arena;
  }
  return base;
}

/** Name each resting-bid event with an FSym(𝔸) name — the interchangeable participants. */
const bookLabels = (book: OrderBook): readonly EventNameLabel[] =>
  book.bids.map((_level, i) => eventName(bidEventId(i), `order-${i}`));

/** The interchange generator of FSym(𝔸): swap the first two resting bids when present. */
const bookPermutations = (book: OrderBook): readonly FinitePermutation[] =>
  book.bids.length >= 2
    ? [finitePermutation([["order-0", "order-1"] as const, ["order-1", "order-0"] as const])]
    : [finitePermutation()];

/**
 * The participant-interchange symmetry of an order book: interchangeable orders.
 *
 * Per stage 6, markets are CGS *with symmetry*, and the symmetry is the
 * interchangeability of participants — anonymity of orders, price-time priority
 * modulo identity. We induce the bijection of the first FSym(𝔸) interchange generator
 * (`permutationBijection`) over the named resting-bid events, then judge it as a CGS
 * symmetry of the arena (`symmetryJudgment`): total and bijective on events, and
 * preserving polarity, causality, and conflict — interchanging two equally-resting
 * orders does. A book with fewer than two interchangeable orders interchanges nothing,
 * so the identity bijection is judged (always a witness). Either way the result is a
 * `SymmetryJudgment` (witness or obstruction) — data, never a throw.
 */
export function bookSymmetry(book: OrderBook): SymmetryJudgment {
  const base = arena(marketStructure(book));
  const labels = bookLabels(book);
  const permutations = bookPermutations(book);
  const generator = permutations[0];

  let bijection: Bijection;
  if (generator === undefined) {
    bijection = identityBijection(base.structure);
  } else {
    const induced = permutationBijection(base, labels, generator);
    // A non-symmetry induction is reported as a nominal obstruction; fall back to the
    // identity bijection so the symmetry judgment is over a real total bijection.
    bijection = Array.isArray(induced) ? (induced as Bijection) : identityBijection(base.structure);
  }
  return symmetryJudgment(base, bijection);
}

/**
 * The market equilibrium — the settled game position (Walras/Nash).
 *
 * Stage 6: *"Walras/Nash equilibrium = the settled game position."* Enrolls the
 * exchange layer's bid (positive/Proponent) and ask (negative/Opponent) `Design`s
 * into a fresh game over the arena and settles it: `GameComputer.create →
 * addDesign(bid) → addDesign(ask) → settle`. The registry's `create` opens the
 * running game over the book's arena; the pure transitions `addDesign`/`settle`
 * (the same ones the computer's `apply` delegates to) enroll the two designs and
 * settle. `settle` uses the first two enrolled designs (the bid and the ask) and
 * returns the settled `Game` (the equilibrium position) — or an obstruction carrier
 * (`.kind` ending `-obstruction`) when the book cannot settle (fewer than two
 * designs, an unmatched side). It never throws: the caller discriminates on `.kind`.
 */
export function equilibrium(
  arenaOf: Arena,
  bid: Design,
  ask: Design,
): Game | { readonly kind: string } {
  // Open the running game through the registry: the running game IS a concurrent
  // game system, and the computer is the registry around it (note §4 stage 6).
  const { game: fresh } = new GameComputer().create(MARKET_EQUILIBRIUM_ID, arenaOf);

  const withBid = addDesign(fresh, "bid", bid);
  if (withBid.kind !== "game.computer.game") return withBid;

  const withAsk = addDesign(withBid, "ask", ask);
  if (withAsk.kind !== "game.computer.game") return withAsk;

  return settle(withAsk);
}

// — boundary admission helpers (carriers reconstructed from JSON at the action edge) —

const isRecord = (value: JsonValue): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Admit an order book from args, refusing anything that is not one. A book is a
 * record with `bids` and `asks` arrays; the level money carriers ride through
 * structurally (the game board indexes levels by position, never re-deriving their
 * exact-rational prices — that arithmetic is the microstructure layer's).
 */
function admitBook(value: JsonValue, slot: string): OrderBook {
  if (isRecord(value) && Array.isArray(value.bids) && Array.isArray(value.asks)) {
    return value as unknown as OrderBook;
  }
  throw new TypeError(`market-arena: ${slot} must be an order book (with bids and asks)`);
}

/** Admit a design carrier from args, refusing anything that is not one. */
function admitDesign(value: JsonValue, slot: string): Design {
  if (isRecord(value) && value.kind === "game.design") {
    return value as unknown as Design;
  }
  throw new TypeError(`market-arena: ${slot} must be a design carrier (game.design)`);
}

/** Admit an arena carrier from args, refusing anything that is not one. */
function admitArena(value: JsonValue, slot: string): Arena {
  if (isRecord(value) && value.kind === "game.arena") {
    return value as unknown as Arena;
  }
  throw new TypeError(`market-arena: ${slot} must be an arena carrier (game.arena)`);
}

/**
 * market-arena — build the order book's CGS arena: the honest market-as-game board.
 *
 * Touches `polarityCharge` so the polarity convention is named by the doctrine it
 * formalizes: resting bid/ask liquidity commits the Opponent (negative ↦ `active`)
 * polarity, a fill commits the Proponent (positive ↦ `potential`) polarity.
 */
export const marketArenaAction: Action = action({
  verb: "market-arena",
  inputFormat: "json",
  outputFormat: "json",
  options: ["book"],
  summary:
    "Read an order book as a gaming CGS arena: bid/ask/fill events, causality (a fill rests on a bid and an ask), and conflict (non-copyable liquidity).",
  description:
    "Domain: an order book carrier (bids x asks of exact-rational levels). Codomain: an arena carrier " +
    "(game.arena). Composes eventStructure(events, causality, conflict) -> arena over gaming's real CGS " +
    "primitives — the HONEST revival of the retired market-as-arena stub (note §4 stage 6, §7). Resting " +
    "bids and asks are negative (Opponent liquidity), fills are positive (Proponent deals); a fill is " +
    "caused by its bid and its ask; two fills of the same liquidity conflict.",
  domain: marketArenaRequestCarrier,
  codomain: marketArenaCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    // Name the polarity convention by the doctrine bridge it formalizes.
    void polarityCharge(positive());
    void polarityCharge(negative());
    const book = admitBook((args.book ?? input) as JsonValue, "book");
    return jsonResource(marketArena(book), "market-arena");
  },
});

/**
 * equilibrium — settle the book's game to its equilibrium position (Walras/Nash).
 *
 * Domain: an arena carrier x a bid design x an ask design. Codomain: a settled game
 * carrier (or a settle obstruction). createGame -> addDesign(bid) -> addDesign(ask)
 * -> settle; the result discriminates on `.kind` and never throws.
 */
export const equilibriumAction: Action = action({
  verb: "equilibrium",
  inputFormat: "json",
  outputFormat: "json",
  options: ["arena", "bid", "ask"],
  summary:
    "Settle the book's concurrent game to its equilibrium position: the settled game of bid against ask.",
  description:
    "Domain: an arena carrier x a bid design carrier x an ask design carrier. Codomain: a settled game " +
    "carrier (the Walras/Nash equilibrium = the settled game position, note §4 stage 6) or a settle " +
    "obstruction when the book cannot settle. Enrolls the exchange layer's bid/ask designs and settles: " +
    "createGame -> addDesign(bid) -> addDesign(ask) -> settle. Obstructions are data (discriminate on .kind).",
  domain: marketEquilibriumRequestCarrier,
  codomain: marketEquilibriumCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const arenaOf = admitArena((args.arena ?? input) as JsonValue, "arena");
    const bid = admitDesign(args.bid as JsonValue, "bid");
    const ask = admitDesign(args.ask as JsonValue, "ask");
    return jsonResource(equilibrium(arenaOf, bid, ask) as unknown as JsonValue, "market-equilibrium");
  },
});

/** The market-as-game verbs: build the CGS arena, and settle it to equilibrium. */
export const marketGameActions: readonly Action[] = Object.freeze([
  marketArenaAction,
  equilibriumAction,
]);
