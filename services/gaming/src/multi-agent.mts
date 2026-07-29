/**
 * multi-agent — gaming's scale-2 (multi-agent / full-CGS) action surface.
 *
 * Where `actions.mts` exposed the running game, the play-anthropology readings,
 * and the animating→P/O bridge, this file exposes the **multi-agent core of
 * CGS**: the arena-with-symmetry (the agent-sheaf made concrete), the concurrent
 * strategy σ:S→A^⊥‖B and its four-condition well-formedness judgment, the
 * parallel-composition ‖ cut (the n-party generalization of playing's cut), and
 * the nominal FSym(𝔸) equivariance layer — the symmetry datum that promotes
 * single-agent playing to concurrent multi-player gaming. See
 * dev/docs/notes/2026-06-21-gaming-as-multi-agent-playing.md.
 *
 * Every leg is a carrier-parameterized `action` over the existing tested body functions:
 * request carriers name the boundary bags, and output carriers reuse
 * `gaming/…` (gaming/arena, gaming/strategy, gaming/parallel, gaming/symmetry).
 * json in, json out; carrier outputs are projected with gaming's own encoders.
 */
import {
  carrierFrom,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@red-cup-engineering/relating";
import { action } from "./action.mjs";
import {
  decodeArena,
  decodeDesign,
  encodeArena,
  encodeDesign,
  encodeLocus,
  encodeInteractionReport,
} from "./encoding/index.mjs";
import {
  dialecticaObjectToArena,
  nominalArenaOf,
  cairesPfenningArena,
} from "./structuring/concurrent-game/with-symmetry/embedding.mjs";
import {
  dialecticaObject,
  isSessionType,
  type SessionType,
  type Proposition,
  type Polarity,
} from "@red-cup-engineering/playing/ludics";
import { decodeEventStructure } from "./encoding/event-structure.mjs";
import {
  createPool,
  decodePool,
  demoArena,
  encodeMatchmakingResult,
  encodePool,
  encodeTicketAdmission,
  formMatches,
  matchAll,
  queueTicket,
  restore,
} from "./running/index.mjs";
import { verificationTournamentAction } from "./verification-tournament.mjs";
export { verificationTournamentAction, verificationTournament } from "./verification-tournament.mjs";
import {
  arenaCarrier,
  compositeCarrier,
  embeddingImageCarrier,
  libp2pPubsubCarrier,
  libp2pStreamCarrier,
  libp2pSwarmCarrier,
  matchCarrier,
  matchmakingResultCarrier,
  parallelCarrier,
  poolCarrier,
  strategyCarrier,
  symmetryCarrier,
  ticketAdmissionCarrier,
} from "./carriers/index.mjs";
import {
  arena,
  strategy,
  strategyReport,
  strategyFromDesign,
  designsOfStrategy,
  designOfStrategy,
  interactionReport,
  nominalEquivarianceJudgment,
  finitePermutation,
  eventName,
  libp2pDialStream,
  libp2pJoin,
  libp2pLeave,
  libp2pPeerIds,
  libp2pPublish,
  libp2pSwarm,
  play,
  cut,
  cutInterface,
  support,
  locusKey,
  type Arena,
  type Design,
  type EventNameLabel,
  type FinitePermutation,
  type Libp2pPubsub,
  type Libp2pStream,
  type Libp2pSwarm,
  type NamePair,
} from "./structuring/concurrent-game/with-symmetry/index.mjs";

// ── carrier $id vocabulary (the multi-agent carriers) ──

const CARRIER = Object.freeze({
  arena: "gaming/arena",
  strategy: "gaming/strategy",
  parallel: "gaming/parallel",
  composite: "gaming/composite",
  symmetry: "gaming/symmetry",
  embeddingImage: "gaming/embedding-image",
  game: "gaming/game",
  match: "gaming/match",
  pool: "gaming/pool",
  ticketAdmission: "gaming/ticket-admission",
  matchmakingResult: "gaming/matchmaking-result",
  libp2pSwarm: "gaming/libp2p-swarm",
  libp2pStream: "gaming/libp2p-stream",
  libp2pPubsub: "gaming/libp2p-pubsub",
});

const ref = (id: string): JsonRecord => Object.freeze({ $ref: id });

const requestCarrier = (id: string, title: string, properties: JsonRecord, required: readonly string[] = []) =>
  carrierFrom(Object.freeze({
    $id: id,
    title,
    type: "object" as const,
    properties,
    required: Object.freeze([...required]),
  }));

export const arenaRequestCarrier = requestCarrier("gaming/request/arena", "GamingArenaRequest", Object.freeze({
  demo: Object.freeze({ type: "string" }),
  arena: ref(CARRIER.arena),
  structure: Object.freeze({ type: "object" }),
}));

export const strategyRequestCarrier = requestCarrier("gaming/request/strategy", "GamingStrategyRequest", Object.freeze({
  demo: Object.freeze({ type: "string" }),
  arena: ref(CARRIER.arena),
  structure: Object.freeze({ type: "object" }),
  plays: Object.freeze({ type: "array" }),
}), ["plays"]);

export const liftRequestCarrier = requestCarrier("gaming/request/lift", "GamingLiftRequest", Object.freeze({
  design: Object.freeze({ type: "object" }),
  demo: Object.freeze({ type: "string" }),
  arena: ref(CARRIER.arena),
}), ["design"]);

export const parallelRequestCarrier = requestCarrier("gaming/request/parallel", "GamingParallelRequest", Object.freeze({
  designA: Object.freeze({ type: "object" }),
  designB: Object.freeze({ type: "object" }),
}), ["designA", "designB"]);

export const matchRequestCarrier = requestCarrier("gaming/request/match", "GamingMatchRequest", Object.freeze({
  game: ref(CARRIER.game),
  designs: Object.freeze({ type: "array" }),
  demo: Object.freeze({ type: "string" }),
  arena: ref(CARRIER.arena),
}));

export const poolRequestCarrier = requestCarrier("gaming/request/pool", "GamingPoolRequest", Object.freeze({
  id: Object.freeze({ type: "string" }),
  demo: Object.freeze({ type: "string" }),
  arena: ref(CARRIER.arena),
  structure: Object.freeze({ type: "object" }),
  matchSize: Object.freeze({ type: "integer", minimum: 2 }),
}), ["id"]);

export const ticketRequestCarrier = requestCarrier("gaming/request/ticket", "GamingTicketRequest", Object.freeze({
  pool: ref(CARRIER.pool),
  player: Object.freeze({ type: "string" }),
  design: Object.freeze({ type: "object" }),
}), ["pool", "player"]);

export const matchmakeRequestCarrier = requestCarrier("gaming/request/matchmake", "GamingMatchmakeRequest", Object.freeze({
  pool: ref(CARRIER.pool),
}), ["pool"]);

export const libp2pSwarmRequestCarrier = requestCarrier("gaming/request/libp2p-swarm", "GamingLibp2pSwarmRequest", Object.freeze({
  id: Object.freeze({ type: "string" }),
  peers: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }),
  swarm: ref(CARRIER.libp2pSwarm),
  join: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }),
  leave: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }),
}));

export const libp2pStreamRequestCarrier = requestCarrier("gaming/request/libp2p-stream", "GamingLibp2pStreamRequest", Object.freeze({
  swarm: ref(CARRIER.libp2pSwarm),
  streamId: Object.freeze({ type: "string" }),
  protocol: Object.freeze({ type: "string" }),
  source: Object.freeze({ type: "string" }),
  target: Object.freeze({ type: "string" }),
}), ["swarm", "streamId", "protocol", "source", "target"]);

export const libp2pPubsubRequestCarrier = requestCarrier("gaming/request/libp2p-pubsub", "GamingLibp2pPubsubRequest", Object.freeze({
  swarm: ref(CARRIER.libp2pSwarm),
  topic: Object.freeze({ type: "string" }),
  messageId: Object.freeze({ type: "string" }),
  from: Object.freeze({ type: "string" }),
}), ["swarm", "topic", "messageId", "from"]);

export const symmetryRequestCarrier = requestCarrier("gaming/request/symmetry", "GamingSymmetryRequest", Object.freeze({
  demo: Object.freeze({ type: "string" }),
  arena: ref(CARRIER.arena),
  structure: Object.freeze({ type: "object" }),
  plays: Object.freeze({ type: "array" }),
  labels: Object.freeze({ type: "array" }),
  permutations: Object.freeze({ type: "array" }),
}), ["plays", "labels", "permutations"]);

export const dialecticaEmbeddingRequestCarrier = requestCarrier("gaming/request/embed-dialectica", "GamingDialecticaEmbeddingRequest", Object.freeze({
  object: Object.freeze({
    type: "object",
    properties: Object.freeze({ witnesses: Object.freeze({ type: "array" }), challenges: Object.freeze({ type: "array" }) }),
    required: Object.freeze(["witnesses", "challenges"]),
  }),
}), ["object"]);

export const nominalEmbeddingRequestCarrier = requestCarrier("gaming/request/embed-nominal", "GamingNominalEmbeddingRequest", Object.freeze({
  demo: Object.freeze({ type: "string" }),
  arena: ref(CARRIER.arena),
  structure: Object.freeze({ type: "object" }),
  labels: Object.freeze({ type: "array" }),
  permutations: Object.freeze({ type: "array" }),
  names: Object.freeze({ type: "array" }),
}), ["labels", "permutations"]);

export const sessionEmbeddingRequestCarrier = requestCarrier("gaming/request/embed-session", "GamingSessionEmbeddingRequest", Object.freeze({
  session: Object.freeze({ type: "object" }),
}), ["session"]);

// ── boundary admission helpers (at the edge only) ──

function asRecord(input: unknown, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object`);
  }
  return input as JsonRecord;
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function requiredString(record: JsonRecord, key: string, verb: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${verb}: requires string "${key}"`);
  return value;
}

function optionalPositiveInteger(record: JsonRecord, key: string, fallback: number): number {
  const value = record[key];
  return Number.isInteger(value) && typeof value === "number" && value >= 2 ? value : fallback;
}

function stringArray(record: JsonRecord, key: string): readonly string[] {
  const value = record[key];
  return Array.isArray(value) ? Object.freeze(value.filter((item): item is string => typeof item === "string")) : [];
}

/**
 * An arena from input: a named demo (`{demo}`), an encoded arena (`{arena}`), or
 * a bare encoded event structure (`{structure}`, discrete symmetry added by the
 * `arena` constructor). One door for every arena-with-symmetry-taking action.
 */
function arenaFromInput(record: JsonRecord, verb: string): Arena {
  const demo = optionalString(record, "demo");
  if (demo !== undefined) {
    const found = demoArena(demo);
    if (found === undefined) throw new TypeError(`${verb}: unknown demo arena ${JSON.stringify(demo)}`);
    return found.arena;
  }
  if (record["arena"] !== undefined) return decodeArena(record["arena"]);
  if (record["structure"] !== undefined) return arena(decodeEventStructure(record["structure"]));
  throw new TypeError(`${verb}: requires "demo", "arena", or "structure"`);
}

/** Decode `plays: string[][]` into the strategy's `Play` carriers. */
function playsOf(record: JsonRecord, verb: string): ReturnType<typeof play>[] {
  const raw = record["plays"];
  if (!Array.isArray(raw)) throw new TypeError(`${verb}: requires array "plays"`);
  return raw.map((entry) => {
    if (!Array.isArray(entry)) throw new TypeError(`${verb}: each play must be an array of move ids`);
    return play(entry.filter((m): m is string => typeof m === "string"));
  });
}

/** Decode `labels: [{event,name}]` into FSym event-name labels (the agent-sheaf labelling). */
function labelsOf(record: JsonRecord): readonly EventNameLabel[] {
  const raw = record["labels"];
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const obj = asRecord(entry as JsonValue, "labels");
    const ev = obj["event"];
    const nm = obj["name"];
    if (typeof ev !== "string" || typeof nm !== "string") {
      throw new TypeError(`symmetry: each label needs string "event" and "name"`);
    }
    return eventName(ev, nm);
  });
}

/** Decode `permutations: [[[from,to],…]]` into FSym(𝔸) finite name permutations. */
function permutationsOf(record: JsonRecord): readonly FinitePermutation[] {
  const raw = record["permutations"];
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (!Array.isArray(entry)) throw new TypeError(`symmetry: each permutation is an array of [from,to] name pairs`);
    const mappings = entry.map((pair) => {
      if (!Array.isArray(pair) || typeof pair[0] !== "string" || typeof pair[1] !== "string") {
        throw new TypeError(`symmetry: each mapping is a [from,to] pair of names`);
      }
      return Object.freeze([pair[0], pair[1]] as const) as NamePair;
    });
    return finitePermutation(mappings);
  });
}

function swarmFromInput(record: JsonRecord, verb: string): Libp2pSwarm {
  const value = record["swarm"];
  if (value === undefined) {
    return libp2pSwarm(requiredString(record, "id", verb), stringArray(record, "peers"));
  }
  const swarm = asRecord(value, verb);
  const id = requiredString(swarm, "id", verb);
  const peerRecords = swarm["peers"];
  const peers = Array.isArray(peerRecords)
    ? peerRecords.map((entry) => asRecord(entry as JsonValue, verb)["peerId"]).filter((peerId): peerId is string => typeof peerId === "string")
    : [];
  return libp2pSwarm(id, peers);
}

// ── the multi-agent CGS surface: arena, strategy, parallel ‖ cut, equivariance ──

/** arena — build/encode an arena-with-symmetry from a demo, encoded arena, or bare ES. */
export const arenaAction: Action = action({
  verb: "arena",
  inputFormat: "json",
  outputFormat: "json",
  domain: arenaRequestCarrier,
  codomain: arenaCarrier,
  summary: "Build/encode an arena-with-symmetry — the polarized prime event structure (E,≤,#,Ṽ), the scale-2 object of CGS.",
  description: "Domain: { demo } | { arena: <gaming/arena> } | { structure: <encoded event structure> }. Codomain: the arena (gaming/arena): its encoded { structure, symmetry } (the symmetry groupoid is the agent-sheaf).",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "arena");
    return jsonResource(encodeArena(arenaFromInput(record, "arena")) as JsonValue, "gaming arena");
  },
});

/** strategy — build a concurrent strategy σ:S→A^⊥‖B over an arena and judge its CGS well-formedness. */
export const strategyAction: Action = action({
  verb: "strategy",
  inputFormat: "json",
  outputFormat: "json",
  domain: strategyRequestCarrier,
  codomain: strategyCarrier,
  summary: "Build a concurrent strategy over an arena-with-symmetry and judge its CGS well-formedness (the four conditions).",
  description: "Domain: { demo|arena|structure, plays: string[][] }. Codomain: the strategy (gaming/strategy): { arena, plays } plus the four-condition report (valid plays, prefix-closure, receptivity, innocence, symmetry-invariance, wellFormed).",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "strategy");
    const a = arenaFromInput(record, "strategy");
    const s = strategy(a, playsOf(record, "strategy"));
    const report = strategyReport(s);
    return jsonResource({
      arena: encodeArena(s.arena),
      plays: s.plays.map((p) => [...p.moves]),
      report: {
        kind: report.kind,
        validPlays: report.validPlays,
        prefixClosed: { kind: report.prefixClosed.kind },
        receptivity: { kind: report.receptivity.kind },
        innocence: { kind: report.innocence.kind },
        symmetryInvariance: { kind: report.symmetryInvariance.kind },
        wellFormed: report.wellFormed,
      },
    } as JsonValue, "gaming strategy");
  },
});

/**
 * lift — playing's Design LIFTED to a concurrent strategy along the symmetry
 * groupoid: the strategy whose plays are the Design's chronicles (each chronicle
 * is one HO play; a design is the union of its chronicles), closed under the
 * arena symmetry groupoid. With no `arena`/`demo`, the design's own trivial-
 * symmetry arena is used and the result coincides with the playing Design — the
 * trivial-symmetry inclusion playing ↪ gaming — so `designs` round-trips back to
 * the input design. This is the EXPLICIT realization of "gaming = playing lifted
 * along the agent-sheaf": not a reimplementation, the Design's own chronicles.
 */
export const liftAction: Action = action({
  verb: "lift",
  inputFormat: "json",
  outputFormat: "json",
  domain: liftRequestCarrier,
  codomain: strategyCarrier,
  summary: "Lift a playing Design to its symmetry-invariant concurrent strategy (plays = the Design's chronicles, closed under the arena symmetry groupoid).",
  description: "Domain: { design: <encoded playing Design>, demo?|arena? }. Codomain: the strategy (gaming/strategy): { arena, plays, report } where plays are the Design's chronicles lifted onto the arena and closed under symmetry, plus `designs` reading the plays back as Designs (the round-trip). At trivial symmetry (no demo/arena) the strategy coincides with the input Design and `designs` recovers it — the playing ↪ gaming inclusion.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "lift");
    if (record["design"] === undefined) throw new TypeError(`lift: requires "design"`);
    const d = decodeDesign(record["design"]);
    const a = record["demo"] !== undefined || record["arena"] !== undefined
      ? arenaFromInput(record, "lift")
      : undefined;
    const s = a === undefined ? strategyFromDesign(d) : strategyFromDesign(d, a);
    const report = strategyReport(s);
    return jsonResource({
      arena: encodeArena(s.arena),
      plays: s.plays.map((p) => [...p.moves]),
      report: {
        kind: report.kind,
        validPlays: report.validPlays,
        prefixClosed: { kind: report.prefixClosed.kind },
        receptivity: { kind: report.receptivity.kind },
        innocence: { kind: report.innocence.kind },
        symmetryInvariance: { kind: report.symmetryInvariance.kind },
        wellFormed: report.wellFormed,
      },
      designs: designsOfStrategy(s).map((dd) => encodeDesign(dd)),
      design: encodeDesign(designOfStrategy(s)),
    } as JsonValue, "gaming lift");
  },
});

/** The shared { designA, designB } domain of the ‖ cut (parallel and its compose alias). */
/** Project an FSym(𝔸) finite permutation to its plain-JSON wire shape. */
function encodePermutation(permutation: FinitePermutation): JsonValue {
  return { kind: permutation.kind, mappings: permutation.mappings.map((pair) => [pair[0], pair[1]]) };
}

/** parallel — the ‖ interaction report: the multi-agent cut of two dual designs (interaction + the give-up loci). */
export const parallelAction: Action = action({
  verb: "parallel",
  inputFormat: "json",
  outputFormat: "json",
  domain: parallelRequestCarrier,
  codomain: parallelCarrier,
  summary: "The ‖ parallel-composition report of two dual designs — the multi-agent cut (interaction normal form + Daimon collision loci).",
  description: "Domain: { designA: <encoded design>, designB: <encoded design> }. Codomain: the parallel report (gaming/parallel): { normalForm, meetings, daimonLoci } — the knowledge-join normal form, the per-locus meetings, and the ⊤-collision loci of the n-party cut.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "parallel");
    if (record["designA"] === undefined || record["designB"] === undefined) {
      throw new TypeError(`parallel: requires "designA" and "designB"`);
    }
    const report = interactionReport(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    return jsonResource(encodeInteractionReport(report) as JsonValue, "gaming parallel report");
  },
});

/**
 * The cut-interface locus keys hidden by composing `f:A⊸B` with `g:B⊸C`: f's
 * codomain-side B loci and g's domain-side B loci, in their full side-prefixed
 * (`1·1·…` / `0·…`) addresses — the exact loci `cut` deletes from the composite.
 * `cutInterface` returns the side-LESS B sub-designs; we re-prefix to recover the
 * addresses the composite is asserted NOT to carry.
 */
function hiddenInterfaceKeys(f: Design, g: Design): readonly string[] {
  const { fB, gB } = cutInterface(f, g);
  const keys = new Set<string>();
  for (const xi of support(fB)) keys.add(`1.1${xi.address.length === 0 ? "" : `.${locusKey(xi)}`}`);
  for (const xi of support(gB)) keys.add(`0${xi.address.length === 0 ? "" : `.${locusKey(xi)}`}`);
  return Object.freeze([...keys]);
}

/**
 * compose — the REAL categorical composition σ;τ of two composable designs
 * `f:A⊸B`, `g:B⊸C`, via playing's Hyland–Ong cut LIFTED to gaming (the agent
 * sheaf is carried through the with-symmetry barrel). Unlike `parallel`, this is
 * NOT the union knowledge-join: `interactionReport` keeps the UNION of both
 * supports, whereas `cut` runs the dispute on the shared interface B
 * chronicle-by-chronicle, discards the non-dual / non-converging pairs, and
 * transports the settled play — so the composite DROPS each design's private
 * far-side content and is never the union of supports. The B interface is hidden
 * into the transported play, leaving the composite morphism `A⊸C`.
 */
export const composeAction: Action = action({
  verb: "compose",
  inputFormat: "json",
  outputFormat: "json",
  domain: parallelRequestCarrier,
  codomain: compositeCarrier,
  summary: "Compose two composable designs by playing's HO/ludics cut LIFTED (σ;τ) — the real categorical composition of CGS: dispute on the shared interface B, transport the settled play, NOT the union knowledge-join.",
  description: "Domain: { designA: <f:A⊸B encoded design>, designB: <g:B⊸C encoded design> }. Codomain: the composite (gaming/composite): { composite: <design A⊸C>, interface: <cut-interface B-locus keys>, converged }. This is @red-cup-engineering/playing/ludics::cut lifted, NOT interactionReport: the cut runs the B-dispute and transports the settled play, so the composite is NOT the union of supports — it omits each design's private far-side content the union-join shadow would keep. This is what distinguishes the real cut from the union-of-supports join.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "compose");
    if (record["designA"] === undefined || record["designB"] === undefined) {
      throw new TypeError(`compose: requires "designA" and "designB"`);
    }
    const f = decodeDesign(record["designA"]);
    const g = decodeDesign(record["designB"]);
    const composite = cut(f, g);
    return jsonResource({
      composite: encodeDesign(composite),
      interface: [...hiddenInterfaceKeys(f, g)],
      converged: support(composite).length > 0,
    } as JsonValue, "gaming composite");
  },
});

/** Project a `MatchAll` carrier to its `gaming/match` wire shape (the joint verdict). */
function encodeMatch(m: ReturnType<typeof matchAll>): JsonValue {
  return {
    kind: m.kind,
    jointForm: encodeDesign(m.jointForm) as JsonValue,
    converged: m.converged,
    daimonLoci: m.daimonLoci.map((locus) => encodeLocus(locus) as JsonValue),
    players: m.participants,
  };
}

/** The roster of designs a `match` folds over: a whole game's enrolled designs, or a bare `designs` list. */
function rosterOf(record: JsonRecord, verb: string): readonly Design[] {
  if (record["game"] !== undefined) {
    return restore(record["game"]).designs.map((d) => d.design);
  }
  const raw = record["designs"];
  if (!Array.isArray(raw)) throw new TypeError(`${verb}: requires "game" or array "designs"`);
  return raw.map((d) => decodeDesign(d));
}

/**
 * match — the genuine multi-agent verdict: the JOINT N-player interaction of a
 * WHOLE roster of designs over one shared arena. Per
 * `federation-is-parallel-composition.md`, CGS's monoidal product ‖ IS parallel
 * composition of arenas = concurrent multi-player, and "the cellwise ∨_k-join
 * followed by closure is the action induced by ‖ at the fiber level"; so the
 * joint interaction of N players is the ‖-combine = the iterated knowledge-join
 * ⊔_k = `superpose` over the ENTIRE roster, NOT a privileged pair. The domain is
 * either a whole running game (`{ game }`, whose enrolled designs are folded —
 * the `matchGame` reading) or a bare roster (`{ designs, demo?|arena? }`). The
 * fold is symmetry-invariant: permuting the players does not change the verdict.
 */
export const matchAction: Action = action({
  verb: "match",
  inputFormat: "json",
  outputFormat: "json",
  domain: matchRequestCarrier,
  codomain: matchCarrier,
  summary: "The joint N-player match — the ‖-combine (superpose) over the WHOLE roster of designs, with the multi-agent convergence verdict (NOT a privileged first-two pair).",
  description: "Domain: { game: <gaming/game> } (fold the game's enrolled designs) OR { designs: <encoded design>[], demo?|arena? } (a bare roster). Codomain: the match (gaming/match): { kind, jointForm: <design> (superpose over the whole roster — the ‖-combine), converged (some Daimon top collision in the joint form; needs ≥ 2 players), daimonLoci: <locus>[] (the joint give-up loci), players (the roster size) }. Folds over ALL participants via matchAll; the verdict is symmetry-invariant under any permutation of the players.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "match");
    // Fold matchAll over the WHOLE roster — the game's enrolled designs, or the
    // bare `designs` list — never a privileged pair.
    return jsonResource(encodeMatch(matchAll(rosterOf(record, "match"))), "gaming match verdict");
  },
});

/** pool — create the OpenMatch-class pool: an arena view plus a once-only ticket ledger. */
export const poolAction: Action = action({
  verb: "pool",
  inputFormat: "json",
  outputFormat: "json",
  domain: poolRequestCarrier,
  codomain: poolCarrier,
  summary: "Create a matchmaking pool: an existing arena carrier plus a once-only ticket ledger.",
  description: "Domain: { id, demo|arena|structure, matchSize? }. Codomain: gaming/pool. A pool is not a second game ontology; it is the admission view over an arena where player tickets wait to instantiate matches.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "pool");
    const id = requiredString(record, "id", "pool");
    const matchSize = optionalPositiveInteger(record, "matchSize", 2);
    const p = createPool({ id, arena: arenaFromInput(record, "pool"), matchSize });
    return jsonResource(encodePool(p) as JsonValue, "gaming pool");
  },
});

/** ticket — admit one player into a pool once; repeats return the same ticket and unchanged pool. */
export const ticketAction: Action = action({
  verb: "ticket",
  inputFormat: "json",
  outputFormat: "json",
  domain: ticketRequestCarrier,
  codomain: ticketAdmissionCarrier,
  summary: "Admit one player ticket into a matchmaking pool, once-only.",
  description: "Domain: { pool: <gaming/pool>, player: string, design? }. Codomain: gaming/ticket-admission. A repeated player returns the existing queued/matched ticket and does not add another pool member, so a player cannot be double-matched.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "ticket");
    const poolValue = decodePool(record["pool"]);
    const player = requiredString(record, "player", "ticket");
    const design = record["design"] === undefined ? undefined : decodeDesign(record["design"]);
    const admission = design === undefined
      ? queueTicket(poolValue, player)
      : queueTicket(poolValue, player, { design });
    return jsonResource(encodeTicketAdmission(admission) as JsonValue, "gaming ticket admission");
  },
});

/** matchmake — deterministically form matches from queued tickets, consuming each ticket once. */
export const matchmakeAction: Action = action({
  verb: "matchmake",
  inputFormat: "json",
  outputFormat: "json",
  domain: matchmakeRequestCarrier,
  codomain: matchmakingResultCarrier,
  summary: "Form OpenMatch-class matches from a pool: pool -> ticket -> match, consuming each ticket once.",
  description: "Domain: { pool: <gaming/pool> }. Codomain: gaming/matchmaking-result, whose matches are gaming/match carriers extended with the arena instantiated over admitted players. The matcher sorts by player name, so commuting the pool order gives the same brackets up to FSym name permutation.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "matchmake");
    return jsonResource(encodeMatchmakingResult(formMatches(decodePool(record["pool"]))) as JsonValue, "gaming matchmaking");
  },
});

/** libp2p-swarm — peerstore/DHT roster as an FSym arena of peer names. */
export const libp2pSwarmAction: Action = action({
  verb: "libp2p-swarm",
  inputFormat: "json",
  outputFormat: "json",
  domain: libp2pSwarmRequestCarrier,
  codomain: libp2pSwarmCarrier,
  summary: "Project libp2p's peerstore/DHT as a gaming arena roster: peer ids are FSym locus names.",
  description: "Domain: { id, peers? } or { swarm, join?, leave? }. Codomain: gaming/libp2p-swarm. This is a structural protocol algebra, not a real libp2p runtime: peer ids are locus names, the peerstore/DHT are derived roster views, and the arena installs FSym peer-name symmetries.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "libp2p-swarm");
    let swarm = swarmFromInput(record, "libp2p-swarm");
    for (const peer of stringArray(record, "join")) swarm = libp2pJoin(swarm, peer);
    for (const peer of stringArray(record, "leave")) swarm = libp2pLeave(swarm, peer);
    return jsonResource(projectLibp2pSwarm(swarm), "gaming libp2p swarm");
  },
});

/** libp2p-stream — dialing/multiplexing as name-passing into a stream sub-arena. */
export const libp2pStreamAction: Action = action({
  verb: "libp2p-stream",
  inputFormat: "json",
  outputFormat: "json",
  domain: libp2pStreamRequestCarrier,
  codomain: libp2pStreamCarrier,
  summary: "Dial a multiplexed libp2p stream as FSym name-passing into a source/target sub-arena.",
  description: "Domain: { swarm, streamId, protocol, source, target }. Codomain: gaming/libp2p-stream. The stream is a sub-arena whose non-trivial symmetry is the source/target peer-name transposition; this models dialing/multiplexing only, not a live libp2p stream.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "libp2p-stream");
    const stream = libp2pDialStream(swarmFromInput(record, "libp2p-stream"), {
      streamId: requiredString(record, "streamId", "libp2p-stream"),
      protocol: requiredString(record, "protocol", "libp2p-stream"),
      source: requiredString(record, "source", "libp2p-stream"),
      target: requiredString(record, "target", "libp2p-stream"),
    });
    return jsonResource(projectLibp2pStream(stream), "gaming libp2p stream");
  },
});

/** libp2p-pubsub — concurrent broadcast over the peer roster. */
export const libp2pPubsubAction: Action = action({
  verb: "libp2p-pubsub",
  inputFormat: "json",
  outputFormat: "json",
  domain: libp2pPubsubRequestCarrier,
  codomain: libp2pPubsubCarrier,
  summary: "Publish to a libp2p topic as order-independent concurrent broadcast over the swarm arena.",
  description: "Domain: { swarm, topic, messageId, from }. Codomain: gaming/libp2p-pubsub. Deliveries are sorted by peer id, so permuting join order under arena symmetry yields the same broadcast set.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "libp2p-pubsub");
    const pubsub = libp2pPublish(swarmFromInput(record, "libp2p-pubsub"), {
      topic: requiredString(record, "topic", "libp2p-pubsub"),
      messageId: requiredString(record, "messageId", "libp2p-pubsub"),
      from: requiredString(record, "from", "libp2p-pubsub"),
    });
    return jsonResource(projectLibp2pPubsub(pubsub), "gaming libp2p pubsub");
  },
});

/** symmetry — judge strategy equivariance under FSym(𝔸) name permutations (the AGMOS nominal cut). */
export const symmetryAction: Action = action({
  verb: "symmetry",
  inputFormat: "json",
  outputFormat: "json",
  domain: symmetryRequestCarrier,
  codomain: symmetryCarrier,
  summary: "Judge a strategy's FSym(𝔸) equivariance — the nominal symmetry layer (which agents are interchangeable; name-passing among players).",
  description: "Domain: { demo|arena|structure, plays: string[][], labels: [{event,name}], permutations: [[[from,to],…]] }. Codomain: the symmetry judgment (gaming/symmetry): the permutation(s) and the equivariance witness/obstruction once the generated FSym actions are installed into the arena symmetry groupoid.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "symmetry");
    const a = arenaFromInput(record, "symmetry");
    const s = strategy(a, playsOf(record, "symmetry"));
    const labels = labelsOf(record);
    const permutations = permutationsOf(record);
    const judgment = nominalEquivarianceJudgment(s, labels, permutations);
    return jsonResource({
      permutation: encodePermutation(permutations[0] ?? finitePermutation()),
      equivariance: projectEquivariance(judgment),
    } as JsonValue, "gaming symmetry");
  },
});

/** Alias: `equivariant` reads the same nominal-equivariance judgment. */
export const equivariantAction: Action = action({
  verb: "equivariant",
  inputFormat: "json",
  outputFormat: "json",
  domain: symmetryRequestCarrier,
  codomain: symmetryCarrier,
  summary: "Read whether a strategy is FSym(𝔸)-equivariant — the agent-sheaf invariance of the strategy.",
  description: "Domain: { demo|arena|structure, plays, labels, permutations }. Codomain: the symmetry judgment (gaming/symmetry) — equivariance witness or obstruction.",
  run: symmetryAction.run,
});

/**
 * Project a nominal-equivariance judgment to its flat wire carrier. Witness and
 * obstruction are discriminated by `kind`; the nested nominal-arena/symmetry
 * carriers are kept by their `kind` rather than re-serialized in full.
 */
function projectEquivariance(judgment: ReturnType<typeof nominalEquivarianceJudgment>): JsonValue {
  if (judgment.kind === "game.nominal.equivariance:witness") {
    return {
      kind: judgment.kind,
      nominalArena: {
        kind: judgment.nominalArena.kind,
        arena: encodeArena(judgment.nominalArena.arena),
        labels: judgment.nominalArena.labels.map((l) => ({ kind: l.kind, event: l.event, name: l.name })),
        actions: judgment.nominalArena.actions.map((act) => ({
          kind: act.kind,
          permutation: encodePermutation(act.permutation),
          bijection: act.bijection.map((pair) => [pair[0], pair[1]]),
          symmetry: { kind: act.symmetry.kind },
        })),
      },
      symmetryInvariance: { kind: judgment.symmetryInvariance.kind },
    };
  }
  const out: Record<string, JsonValue> = { kind: judgment.kind };
  if (judgment.nominalArena !== undefined) {
    out["nominalArena"] = {
      kind: judgment.nominalArena.kind,
      arena: encodeArena(judgment.nominalArena.arena),
      labels: judgment.nominalArena.labels.map((l) => ({ kind: l.kind, event: l.event, name: l.name })),
      obstruction: {
        kind: judgment.nominalArena.obstruction.kind,
        permutation: encodePermutation(judgment.nominalArena.obstruction.permutation),
        reason: judgment.nominalArena.obstruction.reason,
        ...(judgment.nominalArena.obstruction.event === undefined
          ? {}
          : { event: judgment.nominalArena.obstruction.event }),
        ...(judgment.nominalArena.obstruction.name === undefined
          ? {}
          : { name: judgment.nominalArena.obstruction.name }),
        ...(judgment.nominalArena.obstruction.symmetry === undefined
          ? {}
          : { symmetry: { kind: judgment.nominalArena.obstruction.symmetry.kind } }),
      },
    };
  }
  if (judgment.symmetryInvariance !== undefined) {
    out["symmetryInvariance"] = { kind: judgment.symmetryInvariance.kind };
  }
  return out;
}

function projectLibp2pSwarm(swarm: Libp2pSwarm): JsonValue {
  return {
    kind: swarm.kind,
    id: swarm.id,
    peers: swarm.peers.map((peer) => ({ kind: peer.kind, peerId: peer.peerId, locus: peer.locus })),
    peerstore: swarm.peerstore.map((entry) => ({ kind: entry.kind, peerId: entry.peerId, event: entry.event })),
    dht: swarm.dht.map((entry) => ({ kind: entry.kind, peerId: entry.peerId, event: entry.event })),
    arena: encodeArena(swarm.arena),
  };
}

function projectLibp2pStream(stream: Libp2pStream): JsonValue {
  return {
    kind: stream.kind,
    streamId: stream.streamId,
    protocol: stream.protocol,
    source: stream.source,
    target: stream.target,
    multiplexed: stream.multiplexed,
    namePassing: encodePermutation(stream.namePassing),
    subArena: encodeArena(stream.subArena),
  };
}

function projectLibp2pPubsub(pubsub: Libp2pPubsub): JsonValue {
  return {
    kind: pubsub.kind,
    topic: pubsub.topic,
    messageId: pubsub.messageId,
    from: pubsub.from,
    deliveries: pubsub.deliveries.map((delivery) => ({
      kind: delivery.kind,
      topic: delivery.topic,
      messageId: delivery.messageId,
      from: delivery.from,
      to: delivery.to,
    })),
    broadcast: pubsub.broadcast,
    symmetryInvariant: pubsub.symmetryInvariant,
  };
}

// ── the CGS concurrency-paradigm embeddings, realized as gaming object-maps ──

/** Project a `Polarity` to its name (the embedding-image schema's enum). */
function polarityNameOf(p: Polarity): "positive" | "negative" {
  return p.name;
}

/** Encode a CLL `Proposition` recursively to plain JSON (mirrors playing's own encodeProp). */
function encodeProposition(p: Proposition): JsonValue {
  const out: Record<string, JsonValue> = {
    kind: p.kind,
    connective: p.connective,
    operands: p.operands.map(encodeProposition),
  };
  if (p.polarity !== undefined) out["polarity"] = polarityNameOf(p.polarity);
  if (p.label !== undefined) out["label"] = p.label;
  return out;
}

/** Read a string array off a record key (the witness/challenge name lists). */
function nameList(record: JsonRecord, key: string, verb: string): readonly string[] {
  const raw = record[key];
  if (!Array.isArray(raw)) throw new TypeError(`${verb}: requires array "${key}" of names`);
  return raw.filter((item): item is string => typeof item === "string");
}

/**
 * embed-dialectica — the Dialectica object-map F: Dial(Eff) → CGS realized as a
 * gaming arena. The source-side Dialectica object `(U, X, α)` is built with
 * playing's `dialecticaObject` (REUSED, not reimplemented); the object-map
 * `dialecticaObjectToArena` (gaming) sends it to the arena with P-events = U,
 * O-events = X, trivial causality, intra-polarity conflict, no cross conflict,
 * trivial symmetry. Acceptance α is not arena data, so the boundary takes only the
 * witness/challenge name lists.
 */
export const embedDialecticaAction: Action = action({
  verb: "embed-dialectica",
  inputFormat: "json",
  outputFormat: "json",
  domain: dialecticaEmbeddingRequestCarrier,
  codomain: arenaCarrier,
  summary: "The Dialectica object-map F: Dial(Eff) → CGS — a Dialectica object (U,X,α) to its concurrent-game arena (P-events U, O-events X, trivial causality, intra-polarity conflict, trivial symmetry).",
  description: "Domain: { object: { witnesses: string[] (U), challenges: string[] (X) } }. Codomain: the arena (gaming/arena) image under F — P-events = U (positive), O-events = X (negative), trivial causality (all concurrent), all-pairs P-P and O-O conflict, no cross P-O conflict, discrete (trivial) symmetry. Reuses playing's dialecticaObject for the source object and gaming's dialecticaObjectToArena for the object-map.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "embed-dialectica");
    const obj = asRecord(record["object"] ?? null, "embed-dialectica");
    const witnesses = nameList(obj, "witnesses", "embed-dialectica");
    const challenges = nameList(obj, "challenges", "embed-dialectica");
    const dialObject = dialecticaObject(witnesses, challenges);
    return jsonResource(encodeArena(dialecticaObjectToArena(dialObject)) as JsonValue, "gaming dialectica arena");
  },
});

/**
 * embed-nominal — the AGMOS nominal object-map: an arena enriched so its symmetry
 * groupoid contains the supplied FSym(𝔸) name-permutations (the embedding's
 * defining NON-TRIVIAL symmetry). Reuses gaming's `nominalArenaOf` (which is
 * nominalizing's `nominalArenaJudgment`): each permutation is admitted into
 * `Arena.symmetry` exactly when it acts as a valid CGS symmetry.
 */
export const embedNominalAction: Action = action({
  verb: "embed-nominal",
  inputFormat: "json",
  outputFormat: "json",
  domain: nominalEmbeddingRequestCarrier,
  codomain: arenaCarrier,
  summary: "The AGMOS nominal object-map — an arena whose symmetry groupoid contains FSym(𝔸) name-permutations (the non-trivial symmetry that is the embedding's defining content).",
  description: "Domain: { demo|arena|structure, labels: [{event,name}] (the event↦name labelling), permutations: [[[from,to],…]] (FSym(𝔸) generators) }. Codomain: the enriched arena (gaming/arena) with the FSym(𝔸) actions installed into its symmetry groupoid; obstructs (throws) if a permutation does not act as a CGS symmetry. Reuses gaming's nominalArenaOf / nominalizing's nominalArenaJudgment.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "embed-nominal");
    const base = arenaFromInput(record, "embed-nominal");
    const labels = labelsOf(record);
    const permutations = permutationsOf(record);
    return jsonResource(encodeArena(nominalArenaOf(base, labels, permutations)) as JsonValue, "gaming nominal arena");
  },
});

/**
 * embed-session — the Caires–Pfenning object-map: a session type to the CLL
 * proposition naming its CGS_CLL behaviour. Reuses gaming's `cairesPfenningArena`
 * (= playing's `propositionOfSession`, REUSED verbatim). The realized image is a
 * proposition (not an event-structure arena), so the codomain is the
 * gaming/embedding-image carrier.
 */
export const embedSessionAction: Action = action({
  verb: "embed-session",
  inputFormat: "json",
  outputFormat: "json",
  domain: sessionEmbeddingRequestCarrier,
  codomain: embeddingImageCarrier,
  summary: "The Caires–Pfenning object-map — a session type to the CLL proposition naming its CGS_CLL concurrent behaviour (session-types-as-propositions).",
  description: "Domain: { session: <a session type: kind game.logic.session.* (send/recv/select/offer/server/client/end/wait)> }. Codomain: the embedding image (gaming/embedding-image): { kind, embedding: 'cairesPfenning', subcategory: 'CGS_CLL', session, proposition: <CLL proposition tree> }. Reuses playing's propositionOfSession (via gaming's cairesPfenningArena); the image is the proposition naming the behaviour, not an arena.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "embed-session");
    const raw = record["session"];
    if (!isSessionType(raw)) {
      throw new TypeError(`embed-session: "session" must be a session type (kind game.logic.session.*)`);
    }
    const session: SessionType = raw;
    const proposition = cairesPfenningArena(session);
    return jsonResource({
      kind: "gaming.embedding-image",
      embedding: "cairesPfenning",
      subcategory: "CGS_CLL",
      session: session as unknown as JsonValue,
      proposition: encodeProposition(proposition),
    } as JsonValue, "gaming session embedding image");
  },
});

/** The multi-agent (scale-2 CGS) actions — aggregated into the package surface by actions.mts. */
export const gamingActions: readonly Action[] = Object.freeze([
  arenaAction,
  strategyAction,
  liftAction,
  parallelAction,
  composeAction,
  matchAction,
  poolAction,
  ticketAction,
  matchmakeAction,
  libp2pSwarmAction,
  libp2pStreamAction,
  libp2pPubsubAction,
  symmetryAction,
  equivariantAction,
  embedDialecticaAction,
  embedNominalAction,
  embedSessionAction,
  verificationTournamentAction,
]);
