/**
 * actions — gaming's concurrent-game operations as cocone legs on the
 * @red-cup-engineering/relating `acting` boundary.
 *
 * Each operation is registered once as an `action`; `induceBins` over this list
 * assembles the discovery apex from which the `gaming` dispatcher (CLI) and
 * boundary transports are projected from the induced apex, and one `dispatch`
 * witnesses every play as EAVT in gaming's own ledger.
 *
 * The wire is `json` in, `json` out: data is data. EAVT is the shape of the LOG,
 * not the data boundary — so these morphisms take and return the operation's
 * natural JSON object, never an EAVT document. Carrier outputs are projected
 * with gaming's own encoders; judgment carriers are projected to flat JSON
 * (kinds, scalars, charge-value names, and rationals via `rat`).
 *
 * Output projection law: a `Rational` carries nested exact-number carriers
 * (Naturals built from members) and is NOT cleanly JSON-serializable, so every
 * rational in an output is projected to a JSON-safe `{ num, den, decimal }` via
 * the relating codecs (`toInt`, `ratToExactString`). No carrier reaches
 * `JSON.stringify`.
 */
import {
  carrierFrom,
  jsonResource,
  chargeValue,
  chargeValueName,
  codecs,
  type Action,
  type ChargeValue,
  type JsonValue,
  type JsonRecord,
} from "@red-cup-engineering/relating";
import { action } from "./action.mjs";
import { type Rational } from "@lenticule-science/articulating/predicating/positing/settling/analysis";

import type { Arena } from "./structuring/index.mjs";
import {
  decodeArena,
  decodeDesign,
  decodeLocus,
  encodeInteractionReport,
} from "./encoding/index.mjs";
import {
  createGame,
  playMove,
  settle,
  restore,
  snapshot,
  demoArena,
  analyzeGame,
} from "./running/index.mjs";

const { toInt, ratToExactString, fromRatio } = codecs.host.javascript.numbers;
import {
  play,
  strategy,
  strategyReport,
  interactionReport,
  regimeScores,
  classifyRegime,
  regimeConditions,
  flow,
  deepPlayJudgment,
  ambiguousPlay,
  constitutiveAmbiguityJudgment,
  prelusoryGoal,
  suitsianGame,
  lusoryAttitudeJudgment,
  culturalStructure,
  ludicallyStructuredJudgment,
  mask,
  sides,
  type Mask,
  type RhetoricName,
} from "./structuring/concurrent-game/with-symmetry/index.mjs";
import type { Handedness } from "@red-cup-engineering/animating/becoming/doing/embodying";
import { gamingActions } from "./multi-agent.mjs";
import { reachability } from "./reachability.mjs";
import { marketGameActions } from "./market/index.mjs";
import {
  culturalEmbeddingCarrier,
  deepPlayCarrier,
  flowCarrier,
  gameAnalysisCarrier,
  gameCarrier,
  lusoryCarrier,
  maskCarrier,
  maskSidesCarrier,
  parallelCarrier,
  regimeCarrier,
  rhetoricsCarrier,
  strategyReportCarrier,
} from "./carriers/index.mjs";
export { reachability, reachabilityOf, type Reachability } from "./reachability.mjs";

// ── the carrier $id vocabulary (bare descent paths; see src/carriers/*.schema.json) ──

const CARRIER = Object.freeze({
  mask: "gaming/mask",
  maskSides: "gaming/mask-sides",
  game: "gaming/game",
  parallel: "gaming/parallel",
  gameAnalysis: "gaming/game-analysis",
  strategyReport: "gaming/strategy-report",
  regime: "gaming/regime",
  flow: "gaming/flow",
  deepPlay: "gaming/deep-play",
  rhetorics: "gaming/rhetorics",
  lusory: "gaming/lusory",
  culturalEmbedding: "gaming/cultural-embedding",
  reachability: "gaming/reachability",
});

/** A carrier `$ref` schema slot — the cross-carrier identity that carrier-node mounting reads. */
const ref = (id: string): JsonRecord => Object.freeze({ $ref: id });

const requestCarrier = (id: string, title: string, properties: JsonRecord, required: readonly string[] = []) =>
  carrierFrom(Object.freeze({
    $id: id,
    title,
    type: "object" as const,
    properties,
    required: Object.freeze([...required]),
  }));

export const maskRequestCarrier = requestCarrier("gaming/request/mask", "GamingMaskRequest", Object.freeze({
  recv: Object.freeze({ type: "object" }),
  send: Object.freeze({ type: "object" }),
  actuate: Object.freeze({ type: "object" }),
  observe: Object.freeze({ type: "object" }),
}));

export const gameRequestCarrier = requestCarrier("gaming/request/game", "GamingGameRequest", Object.freeze({
  id: Object.freeze({ type: "string" }),
  demo: Object.freeze({ type: "string" }),
  arena: Object.freeze({ type: "object" }),
}));
export const playRequestCarrier = requestCarrier("gaming/request/play", "GamingPlayRequest", Object.freeze({
  game: ref(CARRIER.game),
  move: Object.freeze({ type: "string" }),
}), ["game", "move"]);
export const settleRequestCarrier = requestCarrier("gaming/request/settle", "GamingSettleRequest", Object.freeze({
  game: ref(CARRIER.game),
}), ["game"]);
export const interactionRequestCarrier = requestCarrier("gaming/request/interaction", "GamingInteractionRequest", Object.freeze({
  designA: Object.freeze({ type: "object" }),
  designB: Object.freeze({ type: "object" }),
}), ["designA", "designB"]);
export const analysisRequestCarrier = requestCarrier("gaming/request/analysis", "GamingAnalysisRequest", Object.freeze({
  game: ref(CARRIER.game),
  demo: Object.freeze({ type: "string" }),
  arena: Object.freeze({ type: "object" }),
  id: Object.freeze({ type: "string" }),
}));
export const strategyReadRequestCarrier = requestCarrier("gaming/request/read-strategy", "GamingReadStrategyRequest", Object.freeze({
  demo: Object.freeze({ type: "string" }),
  arena: Object.freeze({ type: "object" }),
  plays: Object.freeze({ type: "array" }),
}), ["plays"]);
export const arenaReadRequestCarrier = requestCarrier("gaming/request/read-arena", "GamingReadArenaRequest", Object.freeze({
  demo: Object.freeze({ type: "string" }),
  arena: Object.freeze({ type: "object" }),
}));
export const flowRequestCarrier = requestCarrier("gaming/request/read-flow", "GamingReadFlowRequest", Object.freeze({
  demo: Object.freeze({ type: "string" }),
  arena: Object.freeze({ type: "object" }),
  plays: Object.freeze({ type: "array" }),
}), ["plays"]);
export const deepPlayRequestCarrier = requestCarrier("gaming/request/deep-play", "GamingDeepPlayRequest", Object.freeze({
  stakes: Object.freeze({ type: "number" }),
  instrumentalValue: Object.freeze({ type: "number" }),
}), ["stakes", "instrumentalValue"]);
export const rhetoricsRequestCarrier = requestCarrier("gaming/request/rhetorics", "GamingRhetoricsRequest", Object.freeze({
  rhetorics: Object.freeze({ type: "array" }),
}), ["rhetorics"]);
export const lusoryRequestCarrier = requestCarrier("gaming/request/lusory", "GamingLusoryRequest", Object.freeze({
  goal: Object.freeze({ type: "object" }),
  chosen: Object.freeze({ type: "object" }),
  alternatives: Object.freeze({ type: "array" }),
}), ["goal", "chosen"]);
export const culturalEmbeddingRequestCarrier = requestCarrier("gaming/request/cultural-embedding", "GamingCulturalEmbeddingRequest", Object.freeze({
  demo: Object.freeze({ type: "string" }),
  arena: Object.freeze({ type: "object" }),
  plays: Object.freeze({ type: "array" }),
  goal: Object.freeze({ type: "object" }),
  chosen: Object.freeze({ type: "object" }),
  alternatives: Object.freeze({ type: "array" }),
  rhetorics: Object.freeze({ type: "array" }),
  hasMagicCircle: Object.freeze({ type: "boolean" }),
}), ["goal", "chosen"]);
export const reachabilitySeedCarrier = carrierFrom({
  $id: "gaming/request/reachability-seed",
  title: "GamingReachabilitySeed",
  type: ["string", "array"],
  description:
    "A dominance membrane seed accepted by animating descend: newline winner|loser claims or JSON utterance-like rows.",
} as const);
export const reachabilityCarrier = carrierFrom({
  $id: CARRIER.reachability,
  title: "GamingReachability",
  type: "object",
  description:
    "Gaming's equilibrium-reachability verdict over a dominance structure.",
} as const);

// ── boundary admission helpers (at the edge only) ──

function asRecord(input: unknown, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object`);
  }
  return input as JsonRecord;
}

function requireString(record: JsonRecord, key: string, verb: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${verb}: requires "${key}"`);
  return value;
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function requireNumber(record: JsonRecord, key: string, verb: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${verb}: requires numeric "${key}"`);
  return value;
}

function requireArray(record: JsonRecord, key: string, verb: string): readonly JsonValue[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new TypeError(`${verb}: requires array "${key}"`);
  return value;
}

function stringList(record: JsonRecord, key: string): readonly string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Decode `plays: string[][]` into game-algebra `Play` carriers. */
function playsOf(record: JsonRecord, verb: string): ReturnType<typeof play>[] {
  const raw = requireArray(record, "plays", verb);
  return raw.map((entry) => {
    if (!Array.isArray(entry)) throw new TypeError(`${verb}: each play must be an array of move ids`);
    const moves = entry.filter((m): m is string => typeof m === "string");
    return play(moves);
  });
}

/**
 * An arena from input: either a named demo (`{demo: "..."}`) or an encoded arena
 * (`{arena: <encoded>}`). One door for every arena-taking action.
 */
function arenaFromInput(record: JsonRecord, verb: string): Arena {
  const demo = optionalString(record, "demo");
  if (demo !== undefined) {
    const found = demoArena(demo);
    if (found === undefined) throw new TypeError(`${verb}: unknown demo arena ${JSON.stringify(demo)}`);
    return found.arena;
  }
  if (record["arena"] !== undefined) return decodeArena(record["arena"]);
  throw new TypeError(`${verb}: requires "demo" or "arena"`);
}

// ── output projection: rationals and charges to JSON-safe shapes ──

/** Project an exact `Rational` to a JSON-safe `{ num, den, decimal }`. */
function rat(q: Rational): JsonValue {
  return { num: toInt(q.num), den: toInt(q.den), decimal: ratToExactString(q) };
}

/** Project a `ChargeValue` to its name (a JSON string). */
function chargeName(value: ChargeValue): string {
  return chargeValueName(value);
}

/** True when a `kind`-tagged carrier is an obstruction (kind ends with "-obstruction"). */
function isObstruction(value: { readonly kind?: unknown }): boolean {
  return typeof value.kind === "string" && value.kind.endsWith("-obstruction");
}

// ── the bridge from animating: a Handedness IS Player/Opponent polarity ──

/** mask — lift an animating Handedness into a concurrent-game Mask (the I/O face the
 *  participant turns to an arena). The package's FIRST morphism: by the CGS theorem
 *  embodied-handedness-is-P/O-duality, its domain is an animating carrier (the codomain
 *  of `animating embody`), not a bag. `relate utter | animating task | … | animating embody | gaming mask`. */
export const maskAction: Action = action({
  verb: "mask",
  inputFormat: "json",
  outputFormat: "json",
  options: ["label"],
  domain: maskRequestCarrier,
  codomain: maskCarrier,
  summary: "Lift an animating Handedness into a concurrent-game Mask (the I/O face the participant turns to an arena).",
  description: "Domain: an animating `Handedness` ({recv,send,actuate,observe} charges) — the codomain of `animating embody`. `--label` names the participant. Codomain: the Mask carrier (gaming/mask) — the participant's I/O face / CGS morphism shape — as JSON.",
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const handedness = input as unknown as Handedness;
    const label = typeof args["label"] === "string" ? args["label"] : "";
    return jsonResource(mask(handedness, label) as unknown as JsonValue, "gaming mask");
  },
});

/** sides — a Mask → its Aᗮ‖B Player/Opponent split (the morphism shape). */
export const sidesAction: Action = action({
  verb: "sides",
  inputFormat: "json",
  outputFormat: "json",
  domain: maskCarrier,
  codomain: maskSidesCarrier,
  summary: "Read a Mask's Aᗮ‖B Player/Opponent split — recv/observe (Opponent) vs send/actuate (Player).",
  description: "Domain: a Mask (gaming/mask). Codomain: the MaskSides split (gaming/mask-sides) as JSON.",
  run: (input: unknown): JsonValue =>
    jsonResource(sides(input as unknown as Mask) as unknown as JsonValue, "gaming mask sides"),
});

// ── the running game over an arena, and the play-anthropology reads ──

/** game — create a fresh running game over a demo/encoded arena. */
export const gameAction: Action = action({
  verb: "game",
  inputFormat: "json",
  outputFormat: "json",
  domain: gameRequestCarrier,
  codomain: gameCarrier,
  summary: "Create a fresh running game over a demo or encoded arena.",
  description: "Domain: { id?, demo | arena }. Codomain: the game snapshot (gaming/game) as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "game");
    const id = optionalString(record, "id") ?? "game";
    const created = createGame(id, arenaFromInput(record, "game"));
    return jsonResource(snapshot(created) as JsonValue, "gaming game snapshot");
  },
});

/** play — play one legal move against a running game snapshot. */
export const playAction: Action = action({
  verb: "play",
  inputFormat: "json",
  outputFormat: "json",
  domain: playRequestCarrier,
  codomain: gameCarrier,
  summary: "Play one legal move against a running game snapshot.",
  description: "Domain: { game: <gaming/game>, move: string }. Codomain: the advanced game snapshot (gaming/game), or a playMove obstruction, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "play");
    if (record["game"] === undefined) throw new TypeError(`play: requires "game"`);
    const move = requireString(record, "move", "play");
    const result = playMove(restore(record["game"]), move);
    if (isObstruction(result)) return jsonResource(result as unknown as JsonValue, "gaming play obstruction");
    return jsonResource(snapshot(result as ReturnType<typeof createGame>) as JsonValue, "gaming game snapshot");
  },
});

/** settle — settle a running game to its convergence verdict. */
export const settleAction: Action = action({
  verb: "settle",
  inputFormat: "json",
  outputFormat: "json",
  domain: settleRequestCarrier,
  codomain: gameCarrier,
  summary: "Settle a running game to its convergence verdict.",
  description: "Domain: { game: <gaming/game> }. Codomain: the settled game snapshot (gaming/game), or a settle obstruction, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "settle");
    if (record["game"] === undefined) throw new TypeError(`settle: requires "game"`);
    const result = settle(restore(record["game"]));
    if (isObstruction(result)) return jsonResource(result as unknown as JsonValue, "gaming settle obstruction");
    return jsonResource(snapshot(result as ReturnType<typeof createGame>) as JsonValue, "gaming game snapshot");
  },
});

/** interact — report the interaction (knowledge-join normal form) of two designs. */
export const interactAction: Action = action({
  verb: "interact",
  inputFormat: "json",
  outputFormat: "json",
  domain: interactionRequestCarrier,
  codomain: parallelCarrier,
  summary: "Report the interaction normal form of two dual designs.",
  description: "Domain: { designA: <encoded design>, designB: <encoded design> }. Codomain: the interaction report (gaming/parallel) — the knowledge-join normal form, per-locus meetings, and Daimon collision loci — as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "interact");
    if (record["designA"] === undefined || record["designB"] === undefined) {
      throw new TypeError(`interact: requires "designA" and "designB"`);
    }
    const report = interactionReport(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    return jsonResource(encodeInteractionReport(report) as JsonValue, "gaming interaction report");
  },
});

/** analyze — read the operationalized ludic/game theory over a game's arena. */
export const analyzeAction: Action = action({
  verb: "analyze",
  inputFormat: "json",
  outputFormat: "json",
  domain: analysisRequestCarrier,
  codomain: gameAnalysisCarrier,
  summary: "Analyze a game's arena through the operationalized ludic theory.",
  description: "Domain: { game: <gaming/game> } OR { demo | arena }. Codomain: the game analysis (gaming/game-analysis): regime, paidia/ludus, configurations, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "analyze");
    const game = record["game"] !== undefined
      ? restore(record["game"])
      : createGame(optionalString(record, "id") ?? "analysis", arenaFromInput(record, "analyze"));
    const analysis = analyzeGame(game);
    return jsonResource({
      id: analysis.id,
      events: analysis.events,
      designs: analysis.designs,
      regime: projectRegimeClassification(analysis.regime as ReturnType<typeof classifyRegime>),
      regimeConditions: projectRegimeConditions(analysis.regimeConditions as ReturnType<typeof regimeConditions>),
      paidiaLudus: jsonifyShallow(analysis.paidiaLudus),
      ludusIndex: jsonifyShallow(analysis.ludusIndex),
      configurations: analysis.configurations,
    }, "gaming game analysis");
  },
});

/** read-strategy — judge a strategy's CGS well-formedness. */
export const readStrategyAction: Action = action({
  verb: "read-strategy",
  inputFormat: "json",
  outputFormat: "json",
  domain: strategyReadRequestCarrier,
  codomain: strategyReportCarrier,
  summary: "Judge a strategy's concurrent-game well-formedness.",
  description: "Domain: { demo | arena, plays: string[][] }. Codomain: the well-formedness report (gaming/strategy-report): receptivity/innocence/symmetry-invariance, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "read-strategy");
    const arena = arenaFromInput(record, "read-strategy");
    const s = strategy(arena, playsOf(record, "read-strategy"));
    const report = strategyReport(s);
    return jsonResource({
      kind: report.kind,
      validPlays: report.validPlays,
      wellFormed: report.wellFormed,
      prefixClosed: { kind: report.prefixClosed.kind },
      receptivity: { kind: report.receptivity.kind },
      innocence: { kind: report.innocence.kind },
      symmetryInvariance: { kind: report.symmetryInvariance.kind },
    }, "gaming strategy report");
  },
});

/** read-regime — read an arena's Caillois regime scores, classification, conditions. */
export const readRegimeAction: Action = action({
  verb: "read-regime",
  inputFormat: "json",
  outputFormat: "json",
  domain: arenaReadRequestCarrier,
  codomain: regimeCarrier,
  summary: "Read an arena's Caillois regime scores, classification, and conditions.",
  description: "Domain: { demo | arena }. Codomain: { scores, classification, conditions } (gaming/regime) with exact rational scores, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "read-regime");
    const arena = arenaFromInput(record, "read-regime");
    const scores = regimeScores(arena);
    const classification = classifyRegime(arena);
    return jsonResource({
      scores: {
        agon: rat(scores.agon),
        alea: rat(scores.alea),
        mimicry: rat(scores.mimicry),
        ilinx: rat(scores.ilinx),
      },
      classification: projectRegimeClassification(classification),
      conditions: projectRegimeConditions(regimeConditions(arena)),
    }, "gaming regime reading");
  },
});

/** read-flow — judge Csikszentmihalyi flow of an arena against a strategy. */
export const readFlowAction: Action = action({
  verb: "read-flow",
  inputFormat: "json",
  outputFormat: "json",
  domain: flowRequestCarrier,
  codomain: flowCarrier,
  summary: "Judge challenge-skill flow of an arena against a strategy.",
  description: "Domain: { demo | arena, plays: string[][] }. Codomain: the flow judgment (gaming/flow): challenge/skill counts, band, gap, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "read-flow");
    const arena = arenaFromInput(record, "read-flow");
    const s = strategy(arena, playsOf(record, "read-flow"));
    const judgment = flow(arena, s);
    const base = {
      kind: judgment.kind,
      challenge: judgment.challenge.value,
      skill: judgment.skill.value,
      band: rat(judgment.band),
    };
    if (judgment.kind === "game-analysis.flow:witness") {
      return jsonResource({ ...base, gap: judgment.gap }, "gaming flow judgment");
    }
    return jsonResource({ ...base, reason: judgment.reason, mismatch: judgment.mismatch }, "gaming flow judgment");
  },
});

/** read-deep-play — judge Geertz deep play from stakes against instrumental value. */
export const readDeepPlayAction: Action = action({
  verb: "read-deep-play",
  inputFormat: "json",
  outputFormat: "json",
  domain: deepPlayRequestCarrier,
  codomain: deepPlayCarrier,
  summary: "Judge Geertz deep play: stakes exceeding instrumental rationality.",
  description: "Domain: { stakes: number, instrumentalValue: number }. Codomain: the deep-play judgment (gaming/deep-play): symbolicExcess or headroom, exact, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "read-deep-play");
    const stakes = fromRatio(requireNumber(record, "stakes", "read-deep-play"), 1);
    const instrumentalValue = fromRatio(requireNumber(record, "instrumentalValue", "read-deep-play"), 1);
    const judgment = deepPlayJudgment(stakes, instrumentalValue);
    const base = {
      kind: judgment.kind,
      stakes: rat(judgment.stakes),
      instrumentalValue: rat(judgment.instrumentalValue),
    };
    if (judgment.kind === "game-analysis.deepPlay:witness") {
      return jsonResource({ ...base, symbolicExcess: rat(judgment.symbolicExcess) }, "gaming deep-play judgment");
    }
    return jsonResource({ ...base, reason: judgment.reason, headroom: rat(judgment.headroom) }, "gaming deep-play judgment");
  },
});

/** read-rhetorics — judge a play's constitutive ambiguity over hosted rhetorics. */
export const readRhetoricsAction: Action = action({
  verb: "read-rhetorics",
  inputFormat: "json",
  outputFormat: "json",
  domain: rhetoricsRequestCarrier,
  codomain: rhetoricsCarrier,
  summary: "Judge a play's constitutive ambiguity over its hosted rhetorics.",
  description: "Domain: { rhetorics: string[] }. Codomain: the constitutive-ambiguity judgment (gaming/rhetorics): kind, inTension, charge name, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "read-rhetorics");
    const names = stringList(record, "rhetorics") as readonly RhetoricName[];
    const p = ambiguousPlay(names);
    const judgment = constitutiveAmbiguityJudgment(p);
    if (judgment.kind === "game-analysis.constitutiveAmbiguity:witness") {
      return jsonResource({
        kind: judgment.kind,
        hosted: [...p.hosted],
        inTension: [...judgment.inTension],
        charge: chargeName(judgment.charge),
      }, "gaming rhetorics judgment");
    }
    return jsonResource({
      kind: judgment.kind,
      hosted: [...p.hosted],
      reason: judgment.reason,
      charge: chargeName(judgment.charge),
    }, "gaming rhetorics judgment");
  },
});

/** read-lusory — judge Suits' lusory attitude of a game-with-strategy. */
export const readLusoryAction: Action = action({
  verb: "read-lusory",
  inputFormat: "json",
  outputFormat: "json",
  domain: lusoryRequestCarrier,
  codomain: lusoryCarrier,
  summary: "Judge Suits' lusory attitude of a game-with-strategy.",
  description: "Domain: { goal: { locus: <encoded>, target: <chargeName> }, chosen: <design>, alternatives?: <design>[] }. Codomain: the lusory-attitude judgment (gaming/lusory) as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "read-lusory");
    const goalRecord = asRecord(record["goal"] ?? null, "read-lusory");
    if (goalRecord["locus"] === undefined) throw new TypeError(`read-lusory: requires goal.locus`);
    const target = requireString(goalRecord, "target", "read-lusory");
    const goal = prelusoryGoal(decodeLocus(goalRecord["locus"]), chargeValue(target as Parameters<typeof chargeValue>[0]));
    if (record["chosen"] === undefined) throw new TypeError(`read-lusory: requires "chosen"`);
    const chosen = decodeDesign(record["chosen"]);
    const rawAlternatives = Array.isArray(record["alternatives"]) ? record["alternatives"] : [];
    const alternatives = rawAlternatives.map((alt) => decodeDesign(alt));
    const g = suitsianGame(goal, chosen, alternatives);
    const judgment = lusoryAttitudeJudgment(g);
    if (judgment.kind === "game-analysis.lusoryAttitude:witness") {
      return jsonResource({
        kind: judgment.kind,
        means: [...judgment.means],
        declined: judgment.declined,
      }, "gaming lusory-attitude judgment");
    }
    return jsonResource({ kind: judgment.kind, reason: judgment.reason }, "gaming lusory-attitude judgment");
  },
});

/** embed-culture — judge whether a cultural structure is ludically structured. */
export const embedCultureAction: Action = action({
  verb: "embed-culture",
  inputFormat: "json",
  outputFormat: "json",
  domain: culturalEmbeddingRequestCarrier,
  codomain: culturalEmbeddingCarrier,
  summary: "Judge whether a cultural structure is ludically structured (in the image of Φ).",
  description: "Domain: { demo|arena, plays, goal, chosen, alternatives?, rhetorics, hasMagicCircle }. Codomain: the ludically-structured judgment (gaming/cultural-embedding) with the five image-condition kinds, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "embed-culture");
    const arena = arenaFromInput(record, "embed-culture");
    const s = strategy(arena, playsOf(record, "embed-culture"));
    const goalRecord = asRecord(record["goal"] ?? null, "embed-culture");
    if (goalRecord["locus"] === undefined) throw new TypeError(`embed-culture: requires goal.locus`);
    const target = requireString(goalRecord, "target", "embed-culture");
    const goal = prelusoryGoal(decodeLocus(goalRecord["locus"]), chargeValue(target as Parameters<typeof chargeValue>[0]));
    if (record["chosen"] === undefined) throw new TypeError(`embed-culture: requires "chosen"`);
    const chosen = decodeDesign(record["chosen"]);
    const rawAlternatives = Array.isArray(record["alternatives"]) ? record["alternatives"] : [];
    const alternatives = rawAlternatives.map((alt) => decodeDesign(alt));
    const game = suitsianGame(goal, chosen, alternatives);
    const ambiguity = ambiguousPlay(stringList(record, "rhetorics") as readonly RhetoricName[]);
    const hasMagicCircle = record["hasMagicCircle"] === true;
    const x = culturalStructure({ arena, strategy: s, game, ambiguity, hasMagicCircle });
    const judgment = ludicallyStructuredJudgment(x);
    const conditions = {
      i1: judgment.conditions.i1.kind,
      i2: judgment.conditions.i2.kind,
      i3: judgment.conditions.i3,
      i4: judgment.conditions.i4.kind,
      i5: judgment.conditions.i5.kind,
    };
    if (judgment.kind === "game-analysis.ludicallyStructured:witness") {
      return jsonResource({
        kind: judgment.kind,
        satisfied: [...judgment.satisfied],
        conditions,
      }, "gaming cultural-embedding judgment");
    }
    return jsonResource({
      kind: judgment.kind,
      reason: [...judgment.reason],
      conditions,
    }, "gaming cultural-embedding judgment");
  },
});

// ── shared judgment projectors ──

/** Project a regime classification to JSON-safe form (rational scores via `rat`). */
function projectRegimeClassification(c: ReturnType<typeof classifyRegime>): JsonValue {
  return {
    kind: c.kind,
    dominant: c.dominant,
    dominantScore: rat(c.dominantScore),
    tied: c.tied,
    scores: {
      agon: rat(c.scores.agon),
      alea: rat(c.scores.alea),
      mimicry: rat(c.scores.mimicry),
      ilinx: rat(c.scores.ilinx),
    },
  };
}

/** Project the three arena-readable regime conditions to JSON-safe form. */
function projectRegimeConditions(rc: ReturnType<typeof regimeConditions>): JsonValue {
  const { agonFairness, aleaIndeterminacy, mimicryBoundary } = rc;
  return {
    kind: rc.kind,
    agonFairness: agonFairness.kind === "game-analysis.agonFairness:witness"
      ? { kind: agonFairness.kind, positive: agonFairness.positive, negative: agonFairness.negative }
      : { kind: agonFairness.kind, reason: agonFairness.reason, dominant: agonFairness.dominant, positive: agonFairness.positive, negative: agonFairness.negative },
    aleaIndeterminacy: aleaIndeterminacy.kind === "game-analysis.aleaIndeterminacy:witness"
      ? { kind: aleaIndeterminacy.kind, conflicts: aleaIndeterminacy.conflicts }
      : { kind: aleaIndeterminacy.kind, reason: aleaIndeterminacy.reason },
    mimicryBoundary: mimicryBoundary.kind === "game-analysis.mimicryBoundary:witness"
      ? { kind: mimicryBoundary.kind, symmetries: mimicryBoundary.symmetries }
      : { kind: mimicryBoundary.kind, reason: mimicryBoundary.reason },
  };
}

/**
 * A shallow JSON projection for `paidiaLudus`/`ludusIndex` carriers (placing
 * judgments): keep every scalar and string field, project any `Rational`, and
 * drop nested carriers (the embedded `arena`/`structure`).
 */
function jsonifyShallow(value: unknown): JsonValue {
  if (value === null || typeof value !== "object") {
    return (typeof value === "number" || typeof value === "boolean" || typeof value === "string")
      ? (value as JsonValue)
      : null;
  }
  if (isRational(value)) return rat(value as Rational);
  const out: Record<string, JsonValue> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === null) continue;
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
      out[key] = v;
    } else if (isRational(v)) {
      out[key] = rat(v as Rational);
    } else if (Array.isArray(v) && v.every((item) => typeof item === "string")) {
      out[key] = v as JsonValue;
    }
    // nested carriers (arena/structure/event lists) are intentionally dropped.
  }
  return out;
}

/** Whether a value is a `Rational` carrier (kind tag). */
function isRational(value: unknown): value is Rational {
  return typeof value === "object" && value !== null
    && (value as { kind?: unknown }).kind === "exactNumber.rational";
}

/** The package's actions — the source `induceBins` reads to project every transport. */
/** reachability — equilibrium reachability over a game's dominance: best-response cycles, but the
 *  monotone ≤_k settling converges (no-periodic-orbit), closing the stability↔reachability gap. */
export const reachabilityAction: Action = action({
  verb: "reachability",
  inputFormat: "json",
  outputFormat: "json",
  domain: reachabilitySeedCarrier,
  codomain: reachabilityCarrier,
  summary: "Read a game's equilibrium reachability: best-response may cycle (RPS), but the monotone ≤_k settling converges — the equilibrium is reachable.",
  description: "Domain: a dominance seed — newline `winner|loser` lines (the winner move beats the loser move), or a JSON array. Codomain: gaming/reachability — each move accumulates wins/losses along ≤_k; a move in a cycle settles to ⊤ (told-both). `bestResponseCyclic` flags games where best-response dynamics never converge (RPS / Matching Pennies — a periodic orbit), but `converges`/`reachable` hold ALWAYS by the no-non-trivial-periodic-orbit theorem: the monotone settling reaches a fixed-point attractor (a pure dominant move, or the symmetric ⊤ mixed equilibrium) even there. Closes the stability↔reachability gap (equilibrium-concept.md). Grounded in closure-monad-no-non-trivial-periodic-orbits.md.",
  run: (input: unknown): JsonValue => jsonResource(reachability(input) as unknown as JsonValue, "reachability"),
});

export const actions: readonly Action[] = Object.freeze([
  maskAction,
  reachabilityAction,
  sidesAction,
  gameAction,
  playAction,
  settleAction,
  interactAction,
  analyzeAction,
  readStrategyAction,
  readRegimeAction,
  readFlowAction,
  readDeepPlayAction,
  readRhetoricsAction,
  readLusoryAction,
  embedCultureAction,
  ...marketGameActions,
  ...gamingActions,
]);
