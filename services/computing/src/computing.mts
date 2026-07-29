/**
 * computing — the agent-morphism surface of Eff = Kl(!): computing OVER enriched agents.
 *
 * computing is to the AGENT carrier what communicating is to the meme carrier: every
 * operation admits a full @red-cup-engineering/animating agent (`animating/becoming/doing/working/
 * governing/agent`) — never bare data — and is a carrier→carrier morphism with a
 * declared domain/codomain. It is multi-agent precisely because animating supplies that
 * enriched carrier (cf. communicating's meme, playing's multi-meme designs).
 *
 * The corpus's identity "computation = settling" is taken literally: an agent IS a
 * settled computation (animating settles its perceive→act loop to a glued individual),
 * so `compute` READS the agent's computational truth as one of FOUR rather than running
 * a bare realizer. The Kleisli structure is over agents: `compose` relays two agents
 * into one composite agent (the multiplication), `relay` settles a SOCIETY of agents to
 * its collective knowledge (the ≤_k join — knowing's comonad over the agents). The
 * faculty edges are real: knowing = the ≤_k aggregate (`joinKnowledge`), communicating =
 * the agent's act as a transport (`transport`), playing = the ! exponential witnessing
 * the agent reusable (`bang`). relating is the substrate (marks, FOUR).
 */
import {
  analysis,
  cell,
  claim,
  cohomologyLaplacianOfCells,
  cohomologyTerms,
  evaluateRunTerm,
  mark,
  predicateOfClaim,
  token,
  type JsonRecord,
  type JsonValue,
} from "@red-cup-engineering/relating";
import { agent, type Agent } from "@red-cup-engineering/animating";
import { communicate } from "@red-cup-engineering/communicating";
import { ofCourse, atom, positive, type Proposition } from "@red-cup-engineering/playing";
import { joinKnowledgeValue } from "@lenticule-science/articulating/predicating/positing";
import { chargeOfFour, fourOfCharge, VERIFIED, REFUTED, UNDECIDABLE, CONTRADICTORY, type Four } from "./four.mjs";
import type { Computation } from "./computation.mjs";

/** The carrier `$id`s the surface references. computing operates over the AGENT carrier. */
export const AGENT_CARRIER_ID = "animating/becoming/doing/working/governing/agent";

/** The settled-governing facet of an agent (the Agent carrier's `governing` is `unknown`
 *  in the published type surface; at runtime it is the animating governing carrier). */
interface Governing {
  readonly glued: boolean;
  readonly cohomologyRank: number;
  readonly cells: number;
}
const governingOf = (a: Agent): Governing => a.governing as unknown as Governing;

/** Admit a full agent carrier from the wire, refusing bare data at the boundary. */
export function admitAgent(input: JsonValue, verb: string): Agent {
  if (input !== null && typeof input === "object" && !Array.isArray(input) && (input as { kind?: unknown }).kind === "animating.agent") {
    return input as unknown as Agent;
  }
  throw new TypeError(`${verb}: expected an @red-cup-engineering/animating agent carrier (animating.agent), not bare data`);
}

/**
 * standingOfAgent — read an agent's computational truth as one of FOUR (computation =
 * settling). ⊤ when the goal charge is a held contradiction (stable / both); ⊥ when the
 * agent never settled (its governing is not glued, cohomologyRank > 0 — the halting /
 * Rice boundary made structural); t when the settled individual carries its goal; f when
 * it settled without carrying it.
 */
export function standingOfAgent(a: Agent): Four {
  // read the goal's NEGATION-AWARE held charge (the bilattice involution): ⊤ told-both about the
  // goal is a held contradiction — the society told BOTH for and against it. This is what makes
  // the inside/knowledge face see disagreement; the all-positive descent (goal.charge/satisfied
  // alone) never could. ⊥ when the agent never settled (the Rice/halting boundary, structural).
  if (a.goal.held === "stable" || a.goal.charge === "stable") return CONTRADICTORY; // ⊤ by held evidence OR explicit target
  if (!a.glued) return UNDECIDABLE;
  if (a.goal.held === "active") return REFUTED; // the goal was DENIED (against-evidence accumulated)
  return a.goal.satisfied ? VERIFIED : REFUTED;
}

/** joinKnowledge — settle two computational truths by knowing's comonad knowledge-order
 *  (≤_k) join. Accumulating evidence across agents IS the knowledge order, not an ad-hoc
 *  rule; the canonical charge package performs the join. */
export function joinKnowledge(a: Four, b: Four): Four {
  return fourOfCharge(joinKnowledgeValue(chargeOfFour(a), chargeOfFour(b)));
}

/** Build a computation carrier embedding the (enriched) agent and its settled truth. */
function computationOf(a: Agent, members: number, standing: Four, aggregate: Four): Computation {
  const governing = governingOf(a);
  return Object.freeze({
    kind: "computing.computation",
    agent: a as unknown as Computation["agent"],
    members,
    halted: a.glued,
    steps: governing.cells,
    standing,
    aggregate,
  });
}

/**
 * compute — read an agent's computation: its settling, as one of FOUR. The agent is the
 * enriched carrier (admitted, never bare); the computation embeds it. This is the
 * single-agent case: `aggregate` = `standing`.
 */
export function compute(a: Agent): Computation {
  const standing = standingOfAgent(a);
  return computationOf(a, 1, standing, standing);
}

/**
 * compose — the Kleisli multiplication over agents: relay two agents into one composite
 * agent (b ∘ a). The composite is a genuine animating agent whose membrane carries both
 * agents' standing concerns (id|goal) and whose goal is b's — b perceives what a brings.
 * Domain = codomain = the agent carrier (an agent endomorphism, like communicating's
 * `compose` on the meme). Built through animating, so no bare data crosses the boundary.
 */
export function compose(a: Agent, b: Agent): Agent {
  const seed = `${a.identity}|${a.goal.predicate}\n${b.identity}|${b.goal.predicate}`;
  return agent(seed, { identity: `${b.identity}∘${a.identity}`, goal: { predicate: b.goal.predicate, charge: b.goal.charge } });
}

/**
 * relay — settle a SOCIETY of agents to its collective knowledge: the multi-agent
 * computation. Each agent contributes its settled truth; the society's `aggregate` is the
 * ≤_k join (knowing's comonad over the agents) — a society where one agent verifies and
 * another refutes aggregates to ⊤ ("told both"). `standing` is the lead agent's result.
 */
export function relay(lead: Agent, rest: readonly Agent[]): Computation {
  const standing = standingOfAgent(lead);
  let aggregate = standing;
  for (const member of rest) aggregate = joinKnowledge(aggregate, standingOfAgent(member));
  return computationOf(lead, 1 + rest.length, standing, aggregate);
}

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */
const natCount = (natural: { readonly members: readonly unknown[] }): number => natural.members.length;

/** The complete comparison graph on `n` agents (every pair compared). */
function completeAgentPairs(n: number): (readonly [number, number])[] {
  const pairs: [number, number][] = [];
  for (let left = 0; left < n; left += 1) for (let right = left + 1; right < n; right += 1) pairs.push([left, right]);
  return pairs;
}

/** Two agent standings in direct knowledge-conflict: one verified (t), the other refuted (f) — the
 *  ⊤ "told-both" disagreement loci. ⊥/⊤ standings are never opposed (no definite direction). */
const opposedStanding = (left: Four, right: Four): boolean =>
  (left.value === "verified" && right.value === "refuted") || (left.value === "refuted" && right.value === "verified");

/** An agent standing's KNOWLEDGE-LEAN as an exact integer: +1 verified (t), −1 refuted (f), 0 for
 *  undecidable (⊥) / contradictory (⊤). The observable whose harmonicity on the comparison graph IS
 *  the society's coordination-free consensus equilibrium (CALM). */
const standingLean = (standing: Four) =>
  standing.value === "verified" ? analysis.intOne : standing.value === "refuted" ? analysis.intNegate(analysis.intOne) : analysis.intZero;

const agreementPredicate = predicateOfClaim(claim(mark("computing-agreement")));
const agentVertex = (index: number) => token(mark(`agent:${index}`));

function agreementCohomologyReceipt(agentCount: number, clusters: number, agreement: readonly (readonly [number, number])[]): JsonRecord {
  const cells = agreement.map(([left, right]) => cell(agentVertex(left), agreementPredicate, agentVertex(right)));
  const laplacian = cohomologyLaplacianOfCells(cells);
  return Object.freeze({
    kind: "computing.spectral-society.cohomology" as const,
    agents: agentCount,
    edges: agreement.length,
    clusters,
    supportH0: laplacian.cohomology.zeroCohomology.rank.members.length,
    h1: laplacian.cohomology.firstCohomology.rank.members.length,
    vanishing: evaluateRunTerm(cohomologyTerms.rankVanishing, laplacian.cohomology.firstCohomology.vanishing as unknown as JsonValue),
    laplacian: evaluateRunTerm(cohomologyTerms.laplacian, laplacian as unknown as JsonValue),
  }) as JsonRecord;
}

/**
 * spectralSociety — the agent society read through the substrate graph Laplacian
 * (`@red-cup-engineering/relating` analysis.laplacian). Where `relay` folds the society's ≤_k aggregate, this reads
 * the structural resilience of its CONSENSUS: the AGREEMENT graph is the comparison edges whose agent
 * standings are not in direct (verified-vs-refuted) conflict.
 *   • clusters = the connected-component count H⁰ (the Laplacian's zero-eigenvalue multiplicity) — the
 *     number of independent agent consensus communities (isolated agents counted).
 *   • societyTrees = the Matrix-Tree spanning-tree count — the society's CONSENSUS ROBUSTNESS: `0` the
 *     society fragments, `1` a single fragile agreement thread, `> 1` redundant agreement paths (a
 *     CALM-resilient society where coordination-free convergence survives a few disagreements).
 * The contested (⊤) concerns remain the FLP-hard loci `relay` already surfaces; this reads the
 * coordination-free skeleton around them.
 */
export interface SpectralSociety {
  readonly kind: "computing.spectral-society";
  /** the number of agents (the fixed vertex set of the agreement graph). */
  readonly agents: number;
  /** H⁰ = the number of independent agent consensus communities (connected components). */
  readonly clusters: number;
  /** whether the whole society agrees into one community (`clusters === 1`). */
  readonly unified: boolean;
  /** the Matrix-Tree spanning-tree count of the agreement graph — the consensus robustness. */
  readonly societyTrees: number;
  /** redundant agreement paths (`societyTrees > 1`): a CALM-resilient society. */
  readonly robust: boolean;
  /** a single fragile agreement thread (`societyTrees === 1`): one lost link fragments consensus. */
  readonly fragile: boolean;
  /** CONSENSUS EQUILIBRIUM (CALM): whether the society's standing assignment is HARMONIC on the
   *  comparison graph (`L·standing = 0`, the standing ∈ ker L) — every compared pair shares one
   *  knowledge direction, so the merge is coordination-free (no standing flows along any edge). This
   *  is the consensus = ker(L) reading, DISTINCT from `robust`/`fragile`: a society can be robustly
   *  connected yet not at equilibrium (compared agents still settling to different standings). */
  readonly atEquilibrium: boolean;
  /** derivable agreement: the EXACT/gradient flows of the agreement graph `rank(L) = V − C`. */
  readonly derivable: number;
  /** irreducible agreement cycles: the HARMONIC flows `β₁ = E − V + C` (the H¹) — redundant agreement
   *  loops that make the society robust beyond a spanning tree. */
  readonly irreducible: number;
  /** normalized finite cohomology receipt for the agreement graph's H0/H1/Laplacian read. */
  readonly cohomology: JsonRecord;
}

/** Read a society's consensus resilience through the substrate graph Laplacian: the agreement graph's
 *  component count (H⁰) and spanning-tree robustness. The comparison graph defaults to complete. */
export function spectralSociety(agents: readonly Agent[], edges?: readonly (readonly [number, number])[]): SpectralSociety {
  const comparison = edges ?? completeAgentPairs(agents.length);
  const standings = agents.map(standingOfAgent);
  const agreement = comparison.filter(([left, right]) => !opposedStanding(standings[left]!, standings[right]!));
  const spectrum = analysis.graphSpectrum(agents.length, agreement.map(([left, right]) => [left, right] as const));
  const clusters = natCount(spectrum.components);
  const societyTrees = natCount(analysis.magnitude(spectrum.spanningTrees));
  const comparisonWeights = analysis.weightsOfEdges(agents.length, comparison.map(([left, right]) => [left, right] as const));
  const atEquilibrium = analysis.isHarmonicOfWeights(comparisonWeights, standings.map(standingLean));
  const hodge = analysis.hodgeDecompositionOfWeights(analysis.weightsOfEdges(agents.length, agreement.map(([left, right]) => [left, right] as const)));
  const cohomology = agreementCohomologyReceipt(agents.length, clusters, agreement);
  return Object.freeze({
    kind: "computing.spectral-society" as const,
    agents: agents.length,
    clusters,
    unified: clusters === 1,
    societyTrees,
    robust: societyTrees > 1,
    fragile: societyTrees === 1,
    derivable: natCount(hodge.exact),
    irreducible: natCount(hodge.harmonic),
    atEquilibrium,
    cohomology,
  });
}

/** The diffusion endpoint of a society's standings: where each agent's agreement-community settles. */
export interface DiffusedSociety {
  readonly kind: "computing.diffused-society";
  /** the number of agents. */
  readonly agents: number;
  /** agents whose agreement-community diffuses to a net FOR (+1) knowledge-direction. */
  readonly leansFor: number;
  /** agents whose agreement-community diffuses to a net AGAINST (−1) knowledge-direction. */
  readonly leansAgainst: number;
  /** agents whose agreement-community diffuses to a BALANCED (0) direction — no net knowledge-lean. */
  readonly balanced: number;
}

/**
 * diffusedSociety — diffuse the society's standings to consensus. Each agent relaxes to the net
 * knowledge-DIRECTION of its agreement-community (`sign` of the harmonic projection `lim_{t→∞} e^{−tL}`
 * onto `ker L` — the per-community mean standing), read through the substrate `diffusionDirections`.
 * Where `spectralSociety.atEquilibrium` asks WHETHER the standings are already harmonic, this reads what
 * the society settles TO: how many agents land for / against / balanced once consensus diffuses.
 */
export function diffusedSociety(agents: readonly Agent[], edges?: readonly (readonly [number, number])[]): DiffusedSociety {
  const comparison = edges ?? completeAgentPairs(agents.length);
  const standings = agents.map(standingOfAgent);
  const agreement = comparison.filter(([left, right]) => !opposedStanding(standings[left]!, standings[right]!));
  const weights = analysis.weightsOfEdges(agents.length, agreement.map(([left, right]) => [left, right] as const));
  const directions = analysis.diffusionDirections(weights, standings.map(standingLean));
  let leansFor = 0;
  let leansAgainst = 0;
  let balanced = 0;
  for (const direction of directions) {
    if (analysis.intIsZero(direction)) balanced += 1;
    else if (analysis.isNegative(direction)) leansAgainst += 1;
    else leansFor += 1;
  }
  return Object.freeze({ kind: "computing.diffused-society" as const, agents: agents.length, leansFor, leansAgainst, balanced });
}

/**
 * transport — read an agent's outward act as a communicating transport (meme out): the
 * agent communicating its identity asserting its goal. The communicating faculty edge.
 */
export function transport(a: Agent): ReturnType<typeof communicate> {
  return communicate("communicating.admit", mark(a.identity), mark(a.goal.predicate));
}

/**
 * bang — witness an agent as the ! exponential !A (the reusable Kleisli domain), via
 * playing's of-course. The playing faculty edge: "a computer is a game made repeatable".
 */
export function bang(a: Agent): Proposition {
  return ofCourse(atom(a.identity, positive()));
}

export type { Computation } from "./computation.mjs";
export type { Agent } from "@red-cup-engineering/animating";
