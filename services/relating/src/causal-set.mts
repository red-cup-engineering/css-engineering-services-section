/**
 * causal-set - the finite Lorentzian carrier for commit/build order.
 *
 * Git commits, build steps, and package graph settlements can all project into
 * the same partial order: events plus causal links. The carrier is schema-only
 * and imports no host adapter, so every reader targets the same data shape.
 */
import type { FromSchema } from "./carriers/kernel/carrier.mjs";
import { CausalSetSchema } from "./carriers/causal-set/index.mjs";

export { CausalSetSchema, causalSetCarrier } from "./carriers/causal-set/index.mjs";

export type CausalSet = FromSchema<typeof CausalSetSchema>;
