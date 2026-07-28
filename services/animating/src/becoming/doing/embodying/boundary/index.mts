/**
 * embodying/boundary — the agent's in/out membrane as a settled relating carrier.
 *
 * An agent's boundary is the membrane across which it perceives (input) and acts
 * (output). This module settles a log of membrane utterances into a relating
 * fixed-point reading whose section is the agent's standing perspective: what it
 * has prehended, at what bilattice charge, across what predicates. The handedness
 * coordinates (`../handedness`) polarize that membrane — recv/observe inbound,
 * send/actuate outbound — but the membrane's *content* is this settled section.
 *
 * This is the seed the agency descent (becoming → doing → working → governing)
 * reads as its settled-individual codomain: the boundary carrier IS the glued
 * sheaf the governing stage produces, read at its knowledge-least section. The
 * package keeps domain logic over carriers here; wire codecs live at the actions.
 */

import {
  sectionOf,
  type Cell,
  type ChargeValue,
  type PredicationTerm,
  type SectionCarrier,
  type SectionEntry,
  type SettlementFiltration,
  type MemeTopologyFixedPointReadings,
  type UtteranceCarrier,
} from "@red-cup-engineering/relating";
import {
  fixedPointReadingsOfUtterances,
  settleUtterances,
} from "./settling.mjs";
export {
  fixedPointReadingsOfUtterances,
  settleUtterances,
} from "./settling.mjs";
import { chargeValueNamed, chargeValueOfCarrier } from "../algebra.mjs";
import {
  cellKey,
  predicateMatches,
  termTouches,
  type AnimatingPredicateInput,
  type AnimatingTermInput,
} from "./relation-boundary.mjs";

export type {
  UtteranceCarrier,
  SectionCarrier,
  SectionEntry,
  Cell,
  ChargeValue,
};
export type TermInput = AnimatingTermInput;
export type PredicateInput = AnimatingPredicateInput;

export { transition } from "./transition.mjs";
export type { ChargeShift, TransitionCarrier } from "./transition.mjs";

// ---------- private boundary helpers ----------

const truthPresent = (value: ChargeValue): boolean => value.coordinates[0].name === "present";

const absurd = (): ChargeValue => chargeValueNamed("absurd");

const sameCell = (left: Cell, right: Cell): boolean => cellKey(left) === cellKey(right);

const sectionValues = (carrier: AgentBoundaryCarrier): readonly { cell: Cell; value: ChargeValue }[] =>
  sectionOf(carrier.fixedPointReadings.knowledgeLeast).entries.map((entry) => ({
    cell: entry.cell,
    value: chargeValueOfCarrier(entry.charge),
  }));

// ---------- boundary settlement ----------

/**
 * An agent's settled boundary: the carrier whose readings present the agent's
 * perspective on what it has prehended across its membrane.
 */
export interface AgentBoundaryCarrier {
  readonly kind: "animating.agent.boundary.carrier";
  readonly utterances: readonly UtteranceCarrier[];
  readonly settlement: SettlementFiltration;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  readonly _agentBoundaryBrand: never;
}

const buildBoundary = (utterances: readonly UtteranceCarrier[]): AgentBoundaryCarrier => {
  if (utterances.length === 0) throw new TypeError("a boundary settlement requires at least one utterance");
  const log = Object.freeze([...utterances]);
  return Object.freeze({
    kind: "animating.agent.boundary.carrier" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: fixedPointReadingsOfUtterances(log),
  }) as AgentBoundaryCarrier;
};

/** Settle a membrane log into the agent's boundary carrier. */
export function settleBoundary(utterances: readonly UtteranceCarrier[]): AgentBoundaryCarrier {
  return buildBoundary(utterances);
}

/** Settle a list of membrane utterances into an AgentBoundaryCarrier. */
export function induceAgentBoundary(utterances: readonly UtteranceCarrier[]): AgentBoundaryCarrier {
  return buildBoundary(utterances);
}

/** Extend an existing agent boundary with a delta of further utterances, re-settled. */
export function extendAgentBoundary(
  carrier: AgentBoundaryCarrier,
  delta: readonly UtteranceCarrier[],
): AgentBoundaryCarrier {
  return buildBoundary([...carrier.utterances, ...delta]);
}

/** The knowledge-least section of a settled boundary — the agent's standing perspective. */
export function boundarySection(carrier: AgentBoundaryCarrier): SectionCarrier {
  return sectionOf(carrier.fixedPointReadings.knowledgeLeast);
}

// ---------- bearing — did a claim's potential appear between two states? ----------

/**
 * A bearing reading where a claim's potential appeared at a cell: the cell with
 * its charge value before and after settlement.
 */
export interface BearingAffirmation {
  readonly kind: "animating.agent.bearing.affirmation";
  readonly cell: Cell;
  readonly before: ChargeValue;
  readonly after: ChargeValue;
}

/**
 * A bearing reading where a cell's truth-presence stayed put between two
 * settled states: the cell and its unchanged charge value.
 */
export interface BearingSilence {
  readonly kind: "animating.agent.bearing.silence";
  readonly cell: Cell;
  readonly value: ChargeValue;
}

/**
 * A bearing reading where a claim's potential withdrew at a cell: the cell with
 * its charge value before and after. Evidence is monotone, so withdrawal
 * refuses a bearing name.
 */
export interface BearingObstruction {
  readonly kind: "animating.agent.bearing-obstruction";
  readonly cell: Cell;
  readonly before: ChargeValue;
  readonly after: ChargeValue;
}

/** The outcome of a bearing read at a cell: an affirmation, a silence, or an obstruction. */
export type BearingJudgment = BearingAffirmation | BearingSilence | BearingObstruction;

/** Between two settled states, at a cell, did the claim's potential appear (affirmation),
 *  stay put (silence), or withdraw (obstruction)?  Evidence is monotone, so withdrawal
 *  refuses a bearing name.  There is no denial: a contrary fact is its own claim. */
export function bearing(before: AgentBoundaryCarrier, after: AgentBoundaryCarrier, cell: Cell): BearingJudgment {
  const find = (carrier: AgentBoundaryCarrier): ChargeValue => {
    const match = sectionValues(carrier).find((entry) => sameCell(entry.cell, cell));
    return match?.value ?? absurd();
  };
  const earlier = find(before);
  const later = find(after);
  if (truthPresent(earlier) && !truthPresent(later)) {
    return Object.freeze({ kind: "animating.agent.bearing-obstruction" as const, cell, before: earlier, after: later });
  }
  if (!truthPresent(earlier) && truthPresent(later)) {
    return Object.freeze({ kind: "animating.agent.bearing.affirmation" as const, cell, before: earlier, after: later });
  }
  return Object.freeze({ kind: "animating.agent.bearing.silence" as const, cell, value: later });
}

// ---------- membrane — a term's boundary situation ----------

/**
 * A term's boundary situation: every section entry whose subject or object is
 * the term, with the contested (stable) and open (absurd) entries singled out.
 */
export interface BoundaryCarrier {
  readonly kind: "animating.agent.boundary";
  readonly entries: readonly SectionEntry[];
  /** Entries reading `stable` — held contradictions; derived, never admitted. */
  readonly stable: readonly SectionEntry[];
  /** Entries reading `absurd` — open residue. */
  readonly absurd: readonly SectionEntry[];
}

/**
 * Build a BoundaryCarrier for a term over a section: collect the entries
 * mentioning the term as subject or object and partition out those reading
 * stable and absurd.
 */
export function boundary(section: SectionCarrier, term: TermInput): BoundaryCarrier {
  const entries = section.entries.filter((entry) =>
    termTouches(entry.cell.subject, term) || termTouches(entry.cell.object, term));
  const named = (name: ChargeValue["name"]) =>
    Object.freeze(entries.filter((entry) => chargeValueOfCarrier(entry.charge).name === name));
  return Object.freeze({
    kind: "animating.agent.boundary" as const,
    entries: Object.freeze(entries),
    stable: named("stable"),
    absurd: named("absurd"),
  });
}

/** The stable and absurd entries of a boundary, where the situation is contested
 *  or open, optionally restricted to predicates the locus can perceive. */
export function affordances(
  boundaryCarrier: BoundaryCarrier,
  perceivable?: readonly PredicateInput[],
): readonly SectionEntry[] {
  const open = [...boundaryCarrier.stable, ...boundaryCarrier.absurd];
  if (perceivable === undefined) return Object.freeze(open);
  return Object.freeze(open.filter((entry) =>
    perceivable.some((input) => predicateMatches(entry.cell.predicate, input))));
}
