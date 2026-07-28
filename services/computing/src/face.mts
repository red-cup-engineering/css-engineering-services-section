/**
 * face — computing's INSIDE boundary face, read on the KNOWLEDGE axis (≤_k).
 *
 * organizing (the Gen-2 holographic bulk) is reconstructed from three boundary faces:
 * socializing (across / truth), computing (inside / knowledge), gaming (outside /
 * evidence). Each face is a LOCAL SECTION over that faculty's inter-agent membrane (a
 * `readonly UtteranceCarrier[]` log), read on its agentive-triad axis; the bulk glues
 * the three by the three-replica Mayer–Vietoris (`crossArena`). The dependency runs
 * BULK → FACES: this module must NEVER import @red-cup-engineering/organizing — computing is a leaf
 * over relating/animating. See dev/docs/notes/2026-06-21-bulk-over-faces-local-section-
 * threading.md.
 *
 * computing reads the INSIDE face on the KNOWLEDGE axis (≤_k): "how much has been
 * settled, independently of which way the evidence points; accumulation is monotone,
 * and its top is 'told both', the join of the for-only and against-only values"
 * (predication-categories/concepts/knowledge.md). This is computing's OWN reading, not
 * organizing's generic descend-then-section: the membrane's agents are admitted as a
 * SOCIETY and RELAYED — over the society's CONCERNS (the members' settled goal
 * predicates) `relay`/`joinKnowledge` folds the ≤_k comonad join (knowing's comonad
 * over the agents). The inside face is the society's ACCUMULATED knowledge local
 * section over that concern cover:
 *
 *   cover     = the society's distinct concerns (the cells of the local section)
 *   held      = concerns whose relayed knowledge accumulated above the ≤_k bottom ⊥
 *               (the society settled SOMETHING — for or against — about the concern)
 *   contested = concerns whose relayed knowledge reached the ≤_k TOP ⊤ "told both" —
 *               a held contradiction, where the society told BOTH for and against
 *               (its members disagree on whether the concern holds)
 *
 * The thick reading additionally carries the relayed society `aggregate` (the single
 * ≤_k join over EVERY member's standing) and the per-concern Belnap census on FOUR, so
 * the reading is genuinely computing's relay — not a generic descend.
 */
import {
  type JsonValue,
  type UtteranceCarrier,
} from "@red-cup-engineering/relating";
import { agent, type Agent } from "@red-cup-engineering/animating";
import { knowledgeMeetOfCensus, type ChargeValueName } from "@red-cup-engineering/relating";
import {
  standingOfAgent,
  relay,
  joinKnowledge,
  type Computation,
} from "./computing.mjs";
import { UNDECIDABLE, type Four } from "./four.mjs";

/** The knowledge-axis Belnap census of the relayed standing of each concern (FOUR values). */
export interface KnowledgeBelnap {
  /** undecidable ⊥ — the ≤_k bottom; the society settled nothing about the concern. */
  readonly undecidable: number;
  /** verified t — for-evidence accumulated (the society holds the concern). */
  readonly verified: number;
  /** refuted f — against-evidence accumulated (the society holds against the concern). */
  readonly refuted: number;
  /** contradictory ⊤ — the ≤_k top, "told both"; for AND against accumulated (disagreement). */
  readonly contradictory: number;
}

/**
 * The computing face: the INSIDE local section of organizing's social boundary, read on
 * the knowledge axis (≤_k) over the agent cover. The thin half (`cover`/`held`/
 * `contested`) is exactly organizing's `Face` contract; the thick half carries the
 * relayed society `aggregate` (the single ≤_k join over all members) and the per-agent
 * Belnap census, so the reading is genuinely computing's society relay — not a generic
 * descend-then-section.
 */
export interface ComputingFace {
  readonly kind: "computing.face";
  readonly faculty: "computing";
  readonly direction: "inside";
  readonly axis: "knowledge";
  /** the society's distinct concerns — the cells of this local section over the cover. */
  readonly cover: number;
  /** concerns whose relayed knowledge accumulated above the ≤_k bottom ⊥. */
  readonly held: number;
  /** concerns at the ≤_k top ⊤ ("told both") — held contradictions on this face. */
  readonly contested: number;
  /** the number of distinct members (agents) the membrane carries. */
  readonly members: number;
  /** the society's collective ≤_k knowledge: the relayed JOIN (∨_k) over EVERY member's
   *  standing — the disagreement-inclusive accumulation (⊤ where members disagree). */
  readonly aggregate: Four;
  /** computing's REAL knowledge-axis work: the CONSENSUS — the network-sheaf H⁰ global section,
   *  the knowledge-MEET (∧_k) over the society's concerns: the maximum information shared by ALL
   *  of them (content/…/sheaf/network-sheaf-consensus-on-agent-graphs.md). Dual to `aggregate`
   *  (the ∨_k join): consensus ⪯_k aggregate always, and the GAP between them is the society's
   *  disagreement. Parameterized from relating's `knowledgeMeetOfCensus`. */
  readonly consensus: ChargeValueName;
  /** the knowledge-axis Belnap census of the per-concern relayed standings. */
  readonly belnap: KnowledgeBelnap;
}

/** A member's `subject|predicate` seed line drawn from one membrane utterance. */
const memberLine = (carrier: UtteranceCarrier): string =>
  `${String(carrier.token.mark.value)}|${String(carrier.claim.mark.value)}`;

/** The member key (the inter-agent membrane's token) of one utterance. */
const memberKey = (carrier: UtteranceCarrier): string => String(carrier.token.mark.value);

/**
 * The society an inter-agent membrane carries: ONE @red-cup-engineering/animating agent per distinct
 * member token, settled over exactly that member's membrane lines. Each agent's goal is
 * its first claim (animating's default), so its FOUR standing reads how far that member's
 * own membrane has accumulated toward its concern — the knowledge the society has settled
 * about it. (A bare membrane is admitted as agents here; computing never reads bare data
 * beyond this society construction, mirroring `admitAgent` at the agent boundary.)
 */
function societyOf(membrane: readonly UtteranceCarrier[]): Agent[] {
  const lines = new Map<string, string[]>();
  const order: string[] = [];
  for (const carrier of membrane) {
    const key = memberKey(carrier);
    if (!lines.has(key)) {
      lines.set(key, []);
      order.push(key);
    }
    lines.get(key)!.push(memberLine(carrier));
  }
  return order.map((key) => agent(lines.get(key)!.join("\n") as JsonValue, { identity: key }));
}

/** Relay a non-empty group of agents to its collective ≤_k knowledge — `relay`'s
 *  aggregate (the lead's standing folded with the rest via `joinKnowledge`), folded one
 *  more time with the lead's own standing so it is symmetric over the whole group. This
 *  is computing's society relay: the ≤_k join (knowing's comonad over the agents). */
function relayedKnowledge(group: readonly Agent[]): Four {
  const [lead, ...rest] = group;
  if (lead === undefined) return UNDECIDABLE;
  const relayed: Computation = relay(lead, rest);
  return joinKnowledge(relayed.aggregate, standingOfAgent(lead));
}

/** A leading-negation prefix — stripped so a concern and its denial are the SAME concern. */
const CONCERN_NEGATION = /^\s*(?:!|¬|-|not\s+|no\s+|never\s+)/i;
const bareConcern = (predicate: string): string => predicate.replace(CONCERN_NEGATION, "").trim() || predicate;

/** Group the society's members by their concern (their settled goal predicate, NEGATION-aware —
 *  a concern and its denial share one bare concern) — the concern cover the inside face is read
 *  over. Each concern's members are exactly those the society relays together when adjudicating
 *  whether that concern holds; an asserter and a denier of one concern relay to ⊤ (told-both). */
function concernCover(society: readonly Agent[]): Map<string, Agent[]> {
  const byConcern = new Map<string, Agent[]>();
  for (const member of society) {
    const concern = bareConcern(member.goal.predicate);
    const group = byConcern.get(concern) ?? [];
    group.push(member);
    byConcern.set(concern, group);
  }
  return byConcern;
}

/**
 * computingFace — computing's OWN inside/knowledge local section over an inter-agent
 * membrane, the face organizing (the bulk) consumes instead of faking it with a generic
 * relating descend. The membrane is read as a SOCIETY of agents (one per member token);
 * the society's CONCERNS (the members' settled goal predicates) are the cover. For each
 * concern the members pursuing it are RELAYED — `relay`/`joinKnowledge` folds the ≤_k
 * comonad join over them (knowing's comonad over the agents) — and the concern's
 * accumulated standing read as one of FOUR. The thin triad is the knowledge-axis reading
 * of that relayed cover:
 *
 *   cover     = the society's distinct concerns (cells of the local section)
 *   held      = concerns whose relayed knowledge accumulated above the ≤_k bottom ⊥
 *   contested = concerns whose relayed knowledge reached the ≤_k TOP ⊤ ("told both") —
 *               the society told BOTH for and against the concern (members disagree)
 *
 * The thick `aggregate` is the single ≤_k join over EVERY member (the whole society's
 * collective standing); `belnap` is the per-concern Belnap census. Pure; never imports
 * the bulk — this is computing's relay reading, not organizing's cross-arena.
 */
export function computingFace(membrane: readonly UtteranceCarrier[]): ComputingFace {
  const society = societyOf(membrane);
  const belnap: { -readonly [K in keyof KnowledgeBelnap]: number } = { undecidable: 0, verified: 0, refuted: 0, contradictory: 0 };
  let cover = 0;
  let held = 0;
  let contested = 0;
  for (const group of concernCover(society).values()) {
    const standing = relayedKnowledge(group);
    belnap[standing.value] += 1;
    cover += 1;
    if (standing.value !== "undecidable") held += 1; // accumulated above the ≤_k bottom ⊥
    if (standing.value === "contradictory") contested += 1; // the ≤_k top ⊤ — told both
  }
  return Object.freeze({
    kind: "computing.face" as const,
    faculty: "computing" as const,
    direction: "inside" as const,
    axis: "knowledge" as const,
    cover,
    held,
    contested,
    members: society.length,
    aggregate: relayedKnowledge(society),
    // the CONSENSUS H⁰: the ∧_k meet over the society's concerns (what ALL share),
    // parameterized from relating. computing's own knowledge-axis names map to the canonical
    // FOUR: undecidable→absurd, verified→potential, refuted→active, contradictory→stable.
    consensus: knowledgeMeetOfCensus({
      absurd: belnap.undecidable,
      potential: belnap.verified,
      active: belnap.refuted,
      stable: belnap.contradictory,
    }),
    belnap,
  });
}
