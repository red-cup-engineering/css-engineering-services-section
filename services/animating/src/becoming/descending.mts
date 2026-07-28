/**
 * descending — the agency descent engine: ONE traversal of relating's
 * `articulate → predicate → posit → settle`, read four ways.
 *
 * This is the load-bearing claim of the package made executable: animating is
 * not a new morphism but the AGENCY READING of the relating descent. So the
 * engine runs the relating descent exactly once over a membrane log and holds the
 * carrier at each of the four closure regimes — the articulation cells (aperiodic),
 * the predication site (transfinite), the posited presheaf (Scott-continuous), and
 * the settlement filtration with its fixed-point readings (finite). The four stage
 * morphisms (`animate`/`enact`/`labor`/`individuate`) and the interior agent are
 * READINGS of this one `DescentState`: "one structure, several readings — this is
 * not analogy." The substrate is reused wholesale from relating-experimental; this
 * engine derives nothing the substrate already provides.
 */
import {
  articulate,
  fixedPoints,
  fixedPointReadings,
  mark,
  posit,
  predicate,
  predicationSite,
  settle,
  utterance,
  type JsonValue,
  type MemeTopologyFixedPointReadings,
  type PositPresheaf,
  type PredicationSite,
  type SettlementFiltration,
  type UtteranceCarrier,
} from "@red-cup-engineering/relating";

/** The carrier the descent holds at each of the four closure regimes — the one
 *  structure the stage readings and the agent all read. */
export interface DescentState {
  /** the membrane log the descent settles (the agency seed). */
  readonly utterances: readonly UtteranceCarrier[];
  /** transfinite: the predication base Φ = E × Π × E the seed generates. */
  readonly site: PredicationSite;
  /** Scott-continuous: the charged presheaf, bottom-seeded over Φ. */
  readonly posited: PositPresheaf;
  /** finite: the settlement filtration to the fixed point. */
  readonly filtration: SettlementFiltration;
  /** the four fixed-point readings of the settled meme topology. */
  readonly readings: MemeTopologyFixedPointReadings;
}

/**
 * Admit a seed from the wire into a membrane log. A seed is either newline-
 * separated `token|claim` lines (the string wire) or a JSON array whose items are
 * `[token, claim]`, `{ token, claim }`, or `{ subject, predicate }`. Each item
 * becomes one utterance `[token, claim]` — the aperiodic articulation pairing.
 */
export function admitSeed(input: JsonValue): readonly UtteranceCarrier[] {
  if (typeof input === "string") {
    const lines = input.split("\n").map((line) => line.trim()).filter((line) => line !== "");
    if (lines.length === 0) throw new TypeError("admitSeed: a seed requires at least one `token|claim` line");
    return Object.freeze(lines.map((line) => {
      const bar = line.indexOf("|");
      if (bar < 0) throw new TypeError(`admitSeed: seed line ${JSON.stringify(line)} must be \`token|claim\``);
      return utterance(mark(line.slice(0, bar).trim()), mark(line.slice(bar + 1).trim()));
    }));
  }
  if (Array.isArray(input) && input.length > 0) {
    return Object.freeze(input.map((item, index) => admitSeedItem(item, index)));
  }
  throw new TypeError("admitSeed: expected a `token|claim` string or a non-empty JSON array of seed items");
}

function admitSeedItem(item: JsonValue, index: number): UtteranceCarrier {
  if (Array.isArray(item) && item.length === 2) return utterance(mark(item[0] as JsonValue), mark(item[1] as JsonValue));
  if (item !== null && typeof item === "object" && !Array.isArray(item)) {
    const record = item as Record<string, JsonValue>;
    const token = record["token"] ?? record["subject"];
    const claim = record["claim"] ?? record["predicate"];
    if (token !== undefined && claim !== undefined) return utterance(mark(token), mark(claim));
  }
  throw new TypeError(`admitSeed: seed item ${index} must be [token, claim], { token, claim }, or { subject, predicate }`);
}

/** Run the relating descent once over a membrane log, holding every regime's carrier. */
export function descend(utterances: readonly UtteranceCarrier[]): DescentState {
  if (utterances.length === 0) throw new TypeError("descend: an empty seed founds no agent");
  const generated = utterances.map((carrier) => predicate(articulate(carrier)));
  const site = predicationSite(generated.flatMap((s) => [...s.cells.cells, ...s.specializations]));
  const posited = posit(site);
  const filtration = settle(posited);
  const readings = fixedPointReadings(fixedPoints(posited));
  return Object.freeze({ utterances: Object.freeze([...utterances]), site, posited, filtration, readings });
}

/** Render one membrane utterance as a `token|claim` label (for the becoming seed reading). */
export function utteranceLabel(carrier: UtteranceCarrier): string {
  return `${String(carrier.token.mark.value)}|${String(carrier.claim.mark.value)}`;
}
