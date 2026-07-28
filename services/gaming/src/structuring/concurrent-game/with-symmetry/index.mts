/**
 * Concurrent games with symmetry are the 0-cells of CGS.
 *
 * This presentation includes the generated 1-cell material (strategies), the
 * ludics substrate, closure/settling, proof readings, and geometric/analytic
 * readings over the same carrier.
 */
export * from "@red-cup-engineering/playing/ludics";
export * from "./arena.mjs";
export * from "./embedding.mjs";
export * from "./libp2p.mjs";
export * from "./strategizing/index.mjs";
export {
  innocenceJudgment,
  type InnocenceJudgment,
  type InnocenceObstruction,
  type InnocenceWitness,
} from "./strategizing/index.mjs";
export * from "./nominalizing/index.mjs";
export * from "./placing/index.mjs";
export * from "./reading/index.mjs";
