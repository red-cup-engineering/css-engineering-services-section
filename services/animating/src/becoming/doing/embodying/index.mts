/**
 * embodying — the agent's body: its in/out membrane and its polarity.
 *
 * `doing` is the bounded deed; to act, the someone must be embodied — have a
 * boundary across which input and output pass. This module gathers the two seeds
 * that constitute that body:
 *
 *   - `handedness` — the four-coordinate polarity of the perceive→act loop:
 *     recv/observe (Opponent, perceive) and send/actuate (Player, act), the
 *     agent-side reading of CGS Player/Opponent duality `(-)^⊥`.
 *   - `boundary` — the membrane itself: a settled relating carrier whose section
 *     is what the agent has prehended, with the `bearing`/`affordances`/`transition`
 *     reads the agency loop runs over it.
 *
 * Both are stated over the relating-experimental charge bilattice through the
 * name-level `algebra` helpers; the embodying layer invents no value structure of
 * its own.
 */

export * from "./handedness.mjs";
export * from "./boundary/index.mjs";
export {
  chargeSidesOf,
  chargeNameOfSides,
  chargeValueNamed,
  chargeNameOfCarrier,
  chargeValueOfCarrier,
  joinKnowledgeNames,
} from "./algebra.mjs";
export {
  cellKey,
  cellOfTerms,
  cellOfUtterance,
  termOf,
  predicateOf,
  termLabel,
  relationTermOf,
  relationPairOf,
  sameBoundaryValue,
  termTouches,
  predicateMatches,
  type AnimatingBoundaryInput,
  type AnimatingTermInput,
  type AnimatingPredicateInput,
} from "./boundary/relation-boundary.mjs";
