/**
 * game-projection - read computing observations as actual gaming arenas.
 *
 * ObservationArena already has positions and moves. This module realizes that
 * shape as a finite CGS/event-structure projection using @red-cup-engineering/gaming's real
 * constructors: charges become polarity, moves become causal edges, and the
 * secured linearization becomes a strategy/play witness.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import {
  arena,
  event,
  eventStructure,
  negative,
  play,
  positive,
  strategy,
  strategyReport,
  type Arena,
  type Play,
  type Strategy,
  type StrategyWellFormednessReport,
} from "@red-cup-engineering/gaming";
import type { LabelCharge, Observation, ObservationArena } from "./operating.mjs";
import { traceTile, type TraceTile } from "./trace-holography.mjs";
import { contentHash } from "./holographic-compute.mjs";

export const observationGameProjectionSchema = {
  $id: "computing/observation-game-projection",
  title: "ObservationGameProjection",
  type: "object",
  required: [
    "kind",
    "observationHash",
    "arena",
    "play",
    "strategy",
    "report",
    "traceTiles",
    "polarityReading",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.observation-game-projection" },
    observationHash: { type: "string", minLength: 1 },
    arena: { type: "object" },
    play: { type: "object" },
    strategy: { type: "object" },
    report: { type: "object" },
    traceTiles: { type: "array", items: { type: "object" } },
    polarityReading: {
      type: "object",
      required: ["positive", "negative", "silent"],
      additionalProperties: false,
      properties: {
        positive: { type: "array", items: { type: "string" } },
        negative: { type: "array", items: { type: "string" } },
        silent: { type: "array", items: { type: "string" } },
      },
    },
    theory: {
      type: "object",
      required: ["eventStructure", "cgs", "goi"],
      additionalProperties: false,
      properties: {
        eventStructure: { type: "string", minLength: 1 },
        cgs: { type: "string", minLength: 1 },
        goi: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export const observationGameRequestSchema = {
  $id: "computing/observation-game-request",
  title: "ObservationGameRequest",
  type: "object",
  required: ["kind", "arena"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.observation-game-request" },
    arena: { type: "object" },
  },
} as const;

export type ObservationGameRequest = FromSchema<typeof observationGameRequestSchema>;
export const observationGameRequestCarrier = carrierFrom(observationGameRequestSchema);

export type ObservationGameProjectionCarrier = FromSchema<typeof observationGameProjectionSchema>;
export const observationGameProjectionCarrier = carrierFrom(observationGameProjectionSchema);

export type ObservationGameProjection = Readonly<{
  kind: "computing.observation-game-projection";
  observationHash: string;
  arena: Arena;
  play: Play;
  strategy: Strategy;
  report: StrategyWellFormednessReport;
  traceTiles: readonly TraceTile[];
  polarityReading: Readonly<{
    positive: readonly string[];
    negative: readonly string[];
    silent: readonly string[];
  }>;
  theory: Readonly<{
    eventStructure: string;
    cgs: string;
    goi: string;
  }>;
}>;

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

function polarityOf(charge: LabelCharge): "positive" | "negative" | "silent" {
  switch (charge) {
    case "potential":
      return "positive";
    case "active":
      return "negative";
    case "stable":
    case "absurd":
      return "silent";
  }
}

function sortedByMoveOrder(arenaInput: ObservationArena): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const move of arenaInput.moves) {
    for (const id of [move.from, move.to]) {
      if (!arenaInput.positions.includes(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of arenaInput.positions) if (!seen.has(id)) out.push(id);
  return Object.freeze(out);
}

export function projectObservationGame(observation: Observation | ObservationArena): ObservationGameProjection {
  const arenaInput = observation.kind === "computing.observation" ? observation.arena : observation;
  const chargeByPosition = new Map<string, LabelCharge>();
  for (const eventInput of arenaInput.structure.events) chargeByPosition.set(eventInput.id, eventInput.charge);
  for (const move of arenaInput.moves) {
    if (!chargeByPosition.has(move.from)) chargeByPosition.set(move.from, move.charge);
    if (!chargeByPosition.has(move.to)) chargeByPosition.set(move.to, move.charge);
  }
  const positiveIds: string[] = [];
  const negativeIds: string[] = [];
  const silentIds: string[] = [];
  const gameEvents = arenaInput.positions.flatMap((id) => {
    const charge = chargeByPosition.get(id) ?? "absurd";
    const polarity = polarityOf(charge);
    if (polarity === "silent") {
      silentIds.push(id);
      return [];
    }
    if (polarity === "positive") positiveIds.push(id);
    else negativeIds.push(id);
    return [event(id, polarity === "positive" ? positive() : negative())];
  });
  const causalPairs = arenaInput.moves
    .filter((move) => move.from !== move.to)
    .filter((move) => polarityOf(chargeByPosition.get(move.from) ?? move.charge) !== "silent")
    .filter((move) => polarityOf(chargeByPosition.get(move.to) ?? move.charge) !== "silent")
    .map((move) => Object.freeze([move.from, move.to] as const));
  const gameArena = arena(eventStructure(gameEvents, causalPairs), []);
  const gamePlay = play(sortedByMoveOrder(arenaInput)
    .filter((id) => polarityOf(chargeByPosition.get(id) ?? "absurd") !== "silent"));
  const prefixes = gamePlay.moves.map((_, index) => play(gamePlay.moves.slice(0, index + 1)));
  const gameStrategy = strategy(gameArena, [play([]), ...prefixes]);
  const report = strategyReport(gameStrategy);
  const observationHash = contentHash(arenaInput);
  const traceTiles = Object.freeze(gamePlay.moves.map((move, index) => traceTile({
    kind: "computing.trace-event-input",
    source: "labels",
    subject: move,
    rule: "observation.game.play",
    stage: index,
    payload: { move, index, polarity: polarityOf(chargeByPosition.get(move) ?? "absurd") },
    boundaryHashes: index === 0 ? [observationHash] : [contentHash({ previous: gamePlay.moves[index - 1] })],
  })));
  const projection: ObservationGameProjection = Object.freeze({
    kind: "computing.observation-game-projection" as const,
    observationHash,
    arena: gameArena,
    play: gamePlay,
    strategy: gameStrategy,
    report,
    traceTiles,
    polarityReading: Object.freeze({
      positive: unique(positiveIds),
      negative: unique(negativeIds),
      silent: unique(silentIds),
    }),
    theory: Object.freeze({
      eventStructure: "finite prime-event-structure shadow: events plus causal dependency edges",
      cgs: "concurrent game with symmetry via @red-cup-engineering/gaming arena and strategy constructors",
      goi: "play trace as token-machine path through the observation arena",
    }),
  });
  observationGameProjectionCarrier.assert(projection);
  return projection;
}
