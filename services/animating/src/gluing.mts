/**
 * gluing — the holographic gluing node: animating's apex.
 *
 * animating is not a morphism and not a descent chain. It is a HOLOGRAPHIC BULK
 * whose boundary is the disjoint union of three typed faces — communicating
 * (across), knowing (inside), playing (outside) — and whose hidden interior is the
 * agent. This module is that node:
 *
 *   - `face` settles one faculty's membrane log into a local section over its cover
 *     (a `Face`): how the agent is seen from one side.
 *   - `glue` glues the three local sections into the interior agent — the GLOBAL
 *     SECTION over the three-cover boundary U = communicating ∪ knowing ∪ playing.
 *     The sheaf condition is the agent's `glued`: the corpus's replica
 *     Mayer–Vietoris theorem (settling-cohomology) makes this exact — the
 *     connecting map δ⁰ : H⁰(overlap) → H¹(U) vanishes iff a local section extends
 *     to a global section, so `glued` (H¹ = 0) means the three faces agree on their
 *     overlaps and the global section (the agent) exists. This is the first
 *     concrete bilattice-network-sheaf.
 *   - `project` restricts the agent back to its three boundary views — the
 *     holographic encoding. By the holographic principle (the corpus reads it at
 *     the settling regime: the interior is a projection of boundary data), you only
 *     ever see the agent through its three faces, never the bulk directly.
 *
 * H¹(U) carries the corpus's two readings of the obstruction: as an OBSTRUCTION it
 * is what cannot glue (faces disagreeing on overlaps); as a COORDINATION COST it is
 * the consensus needed to synthesize the global section — zero H¹ is a
 * coordination-free merge, non-zero H¹ requires consensus.
 * Grounding: content/_archive holographic-principle (cosmological-settlement) and the
 * proved replica-mayer-vietoris / settling-cohomology theorem.
 *
 * The three faces are THREADED, not absorbed: animating provides the face carriers
 * and the gluing; the sibling packages communicating/knowing/playing supply the
 * content over each face when mounted. The single-cover descent (./becoming …) is
 * the per-face settling SUBSTRATE this node glues over, not the shape of animating.
 * See dev/docs/notes/2026-06-21-animating-as-holographic-bulk.md.
 */
import { analysis, sectionOf } from "@red-cup-engineering/relating";
import type { JsonValue, SectionEntry, UtteranceCarrier } from "@red-cup-engineering/relating";
import { admitSeed, descend } from "./becoming/descending.mjs";
import { chargeValueOfCarrier } from "./becoming/doing/embodying/algebra.mjs";
import {
  buildAgent,
  faceOf,
  type AgentOptions,
} from "./becoming/doing/working/governing/agent.mjs";
import type { Agent } from "./becoming/doing/working/governing/carriers.mjs";
import type { Face } from "./carriers.mjs";
import type { BoundaryProjection } from "./carriers.mjs";

/** The faces of the boundary, in canonical order: across, inside, outside. */
const FACULTIES = ["communicating", "knowing", "playing"] as const;
type Faculty = (typeof FACULTIES)[number];

const FACE_DIRECTION: Readonly<Record<Faculty, Face["direction"]>> = Object.freeze({
  communicating: "across",
  knowing: "inside",
  playing: "outside",
});

/** The agentive-triad bilattice axis each face faculty works (the three transverse
 *  Avron axes): communicating→TRUTH, knowing→KNOWLEDGE, playing→EVIDENCE. */
const FACE_AXIS: Readonly<Record<Faculty, Face["axis"]>> = Object.freeze({
  communicating: "truth",
  knowing: "knowledge",
  playing: "evidence",
});

/** A three-faced boundary input: a membrane seed per face (any face may be empty). */
export interface GluingInput {
  readonly communicating?: JsonValue;
  readonly knowing?: JsonValue;
  readonly playing?: JsonValue;
}

/** The empty face of a faculty: a cover with no local section yet — nothing told on any
 *  FOUR corner of its axis (the empty Belnap census). */
function emptyFace(faculty: Faculty): Face {
  return { kind: "animating.face", faculty, direction: FACE_DIRECTION[faculty], axis: FACE_AXIS[faculty], cover: 0, held: 0, contested: 0, belnap: { absurd: 0, potential: 0, active: 0, stable: 0 }, aggregate: "absurd", bigrade: { truth: 0, contradiction: 0, collapsed: true } };
}

/** Whether a face seed carries any membrane content. */
function hasContent(seed: JsonValue | undefined): seed is JsonValue {
  if (seed === undefined) return false;
  if (typeof seed === "string") return seed.trim() !== "";
  if (Array.isArray(seed)) return seed.length > 0;
  return false;
}

/** Settle one faculty's membrane seed into its boundary face (its local section).
 *  An empty seed yields the empty face. */
export function face(faculty: Faculty, seed: JsonValue | undefined): Face {
  if (!hasContent(seed)) return emptyFace(faculty);
  return faceOf(faculty, descend(admitSeed(seed)));
}

/**
 * glue — the holographic gluing. Settle each faculty's membrane into its boundary
 * face, then glue the three local sections into the interior agent: the global
 * section over the union of the three covers. The agent's `glued` (H¹ = 0) is the
 * sheaf condition — the three faces agree on overlaps. At least one face must carry
 * content; an empty boundary glues no agent.
 */
export function glue(input: GluingInput, options: AgentOptions = {}): Agent {
  const faces: Face[] = [];
  const utterances = [];
  for (const faculty of FACULTIES) {
    const seed = input[faculty];
    if (hasContent(seed)) {
      const state = descend(admitSeed(seed));
      faces.push(faceOf(faculty, state));
      utterances.push(...state.utterances);
    } else {
      faces.push(emptyFace(faculty));
    }
  }
  if (utterances.length === 0) throw new TypeError("glue: an empty three-faced boundary glues no agent");
  return buildAgent(descend(utterances), faces, options);
}

/** The corpus's coordination-cost reading of H¹(U) over the three-cover: a
 *  coordination-free merge (H¹ = 0) or a merge that requires consensus (H¹ > 0). */
export type Coordination = "coordination-free" | "consensus-required";

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */
const natCount = (natural: { readonly members: readonly unknown[] }): number => natural.members.length;
const cellKey = (cell: SectionEntry["cell"]): string => `${String(cell.subject.mark.value)}|${String(cell.predicate.mark.value)}`;
const chargeName = (entry: SectionEntry): string => chargeValueOfCarrier(entry.charge).name;

/** A face seed's settled cells as cellKey → charge-name (its local section over the membrane). */
function faceCharges(seed: JsonValue | undefined): Map<string, string> {
  const charges = new Map<string, string>();
  if (!hasContent(seed)) return charges;
  const utterances: readonly UtteranceCarrier[] = descend(admitSeed(seed)).utterances;
  if (utterances.length === 0) return charges;
  for (const entry of sectionOf(descend(utterances).readings.knowledgeLeast).entries) {
    charges.set(cellKey(entry.cell), chargeName(entry));
  }
  return charges;
}

/**
 * The AGENT's structural coherence robustness, read through the substrate graph Laplacian
 * (`@red-cup-engineering/relating` analysis.laplacian). This CONSOLIDATES onto the animating bulk the
 * consensus-robustness capability its faculties expose (knowing's `spectralBindingOf`, communicating's
 * `discourseCohesionOf`), lifted to the three-face cover U = communicating ∪ knowing ∪ playing: the
 * present faces are the vertices, and two are joined when they SHARE settled cells and COHERE on every
 * shared cell (no cross-face contradiction). Then `blocs` = the connected-component count H⁰ (how the
 * agent's faces cluster), and `agentTrees` = the Matrix-Tree spanning-tree count — the agent's COHERENCE
 * ROBUSTNESS: `0` the faces fragment (the agent is not glued), `1` a single fragile thread of shared
 * agreement, `> 1` redundant agreement across faces (a robustly-coherent agent). This is the scale-1
 * mirror of organizing's `collectiveRobustness`; the agent's `glued` (H¹ = 0) is unchanged.
 */
export interface AgentRobustness {
  readonly kind: "animating.agent-robustness";
  readonly faces: number;
  readonly blocs: number;
  readonly coherent: boolean;
  readonly agentTrees: number;
  readonly robust: boolean;
  readonly fragile: boolean;
}

/** Read an agent boundary's coherence robustness: the three-face cover's component count (H⁰) and
 *  spanning-tree robustness, through the substrate graph Laplacian. */
export function agentRobustness(input: GluingInput): AgentRobustness {
  const present = FACULTIES.filter((faculty) => hasContent(input[faculty]));
  const charges = present.map((faculty) => faceCharges(input[faculty]));
  const edges: [number, number][] = [];
  for (let left = 0; left < present.length; left += 1) {
    for (let right = left + 1; right < present.length; right += 1) {
      const a = charges[left]!;
      const b = charges[right]!;
      let shares = false;
      let contradicts = false;
      for (const [key, name] of a) {
        if (b.has(key)) { shares = true; if (b.get(key) !== name) { contradicts = true; break; } }
      }
      if (shares && !contradicts) edges.push([left, right]);
    }
  }
  const spectrum = analysis.graphSpectrum(present.length, edges);
  const blocs = natCount(spectrum.components);
  const agentTrees = natCount(analysis.magnitude(spectrum.spanningTrees));
  return Object.freeze({
    kind: "animating.agent-robustness" as const,
    faces: present.length,
    blocs,
    coherent: blocs === 1,
    agentTrees,
    robust: agentTrees > 1,
    fragile: agentTrees === 1,
  });
}

/** The agent's three boundary faces, keyed by faculty — the holographic boundary
 *  projection (the single-source TypeBox carrier `animating/boundary-projection` in
 *  `./carriers.mts`). You see the agent only through these; the interior bulk is never
 *  returned directly (the holographic principle: the interior is a projection of
 *  boundary data). `coordination` is the Mayer–Vietoris reading of the gluing. */
export type { BoundaryProjection } from "./carriers.mjs";

/** project — restrict the agent (the bulk) to its three boundary views. */
export function project(agent: Agent): BoundaryProjection {
  const byFaculty = (faculty: Faculty): Face => {
    const found = (agent.faces as readonly Face[]).find((f) => f.faculty === faculty);
    return found ?? emptyFace(faculty);
  };
  return {
    kind: "animating.projection",
    identity: agent.identity,
    glued: agent.glued,
    coordination: agent.glued ? "coordination-free" : "consensus-required",
    communicating: byFaculty("communicating"),
    knowing: byFaculty("knowing"),
    playing: byFaculty("playing"),
  };
}

export type { Agent } from "./becoming/doing/working/governing/carriers.mjs";
export type { Face } from "./carriers.mjs";
