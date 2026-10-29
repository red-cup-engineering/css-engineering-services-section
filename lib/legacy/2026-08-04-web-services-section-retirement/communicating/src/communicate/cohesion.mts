/**
 * communicate/cohesion — discourse COHESION of an agent membrane, read through the substrate
 * spectral graph Laplacian.
 *
 * communicating's across/truth face reads the membrane's per-subject lean (face.mts). This sibling
 * reading reads the membrane's DISCOURSE GRAPH — the subject↔object terms its utterances relate — as
 * relating's combinatorial graph Laplacian L = D − W (`@red-cup-engineering/relating` analysis.laplacian, exact over
 * ℤ). Two readings the face's per-cell census cannot give:
 *   • topics  = the connected-component count (H⁰, the Laplacian zero-eigenvalue multiplicity): how
 *     many INDEPENDENT discourse clusters the membrane splits into — subject-clusters that share no
 *     entity, hence cannot be about the same thing. One topic ⟺ the discourse is about one connected
 *     web of subjects.
 *   • cohesionTrees = the Matrix-Tree (Kirchhoff) spanning-tree count: the discourse's COHESION
 *     ROBUSTNESS — `0` the discourse fragments into several topics, `1` a single fragile thread (a
 *     spanning tree; one dropped utterance can fragment it), `> 1` a richly cross-linked discourse
 *     (redundant connections, resilient to dropped utterances).
 * The relation graph reads only the cells (subject↔object), so the membrane's pooled memes present it
 * directly via `membraneMeme` ∘ `relationGraphOfCells`. Total over any membrane. A LEAF over relating +
 * the package's own meme surface (does NOT import @red-cup-engineering/animating).
 */
import {
  action,
  analysis,
  carrierFrom,
  cohomologyLaplacianOfCells,
  cohomologyTerms,
  evaluateRunTerm,
  geometry,
  jsonResource,
  utteranceCarrier,
  type Action,
  type Cell,
  type JsonRecord,
  type JsonValue,
  type UtteranceCarrier,
} from "@red-cup-engineering/relating";
import { membraneMeme } from "./face.mjs";

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */
const natCount = (natural: { readonly members: readonly unknown[] }): number => natural.members.length;

export const membraneSchema = {
  $id: "communicating/membrane",
  title: "CommunicatingMembrane",
  description: "A communicating membrane admitted as an array of utterance carriers or { membrane: [...] }.",
  anyOf: [
    { type: "array", items: { $ref: utteranceCarrier.id } },
    {
      type: "object",
      required: ["membrane"],
      additionalProperties: true,
      properties: {
        membrane: { type: "array", items: { $ref: utteranceCarrier.id } },
      },
    },
  ],
} as const;
export const membraneCarrier = carrierFrom(membraneSchema);

function discourseCohomologyReceipt(subjects: number, topics: number, cells: readonly Cell[]): JsonRecord {
  const laplacian = cohomologyLaplacianOfCells(cells);
  return Object.freeze({
    kind: "communicating.discourse-cohesion.cohomology" as const,
    subjects,
    topics,
    cells: cells.length,
    h0: laplacian.cohomology.zeroCohomology.rank.members.length,
    h1: laplacian.cohomology.firstCohomology.rank.members.length,
    vanishing: evaluateRunTerm(cohomologyTerms.rankVanishing, laplacian.cohomology.firstCohomology.vanishing as unknown as JsonValue),
    laplacian: evaluateRunTerm(cohomologyTerms.laplacian, laplacian as unknown as JsonValue),
  }) as JsonRecord;
}

/** communicating's spectral read of discourse cohesion: H⁰ topics (component count) plus the
 *  Matrix-Tree spanning-tree count as the discourse's cohesion robustness. */
export interface DiscourseCohesion {
  readonly kind: "communicating.discourse-cohesion";
  /** distinct subject/object terms — the vertices of the discourse graph. */
  readonly subjects: number;
  /** H⁰ = the number of independent discourse topics (connected components), as the Laplacian's
   *  zero-eigenvalue multiplicity. */
  readonly topics: number;
  /** whether the whole membrane is one connected discourse (`topics === 1`). */
  readonly connected: boolean;
  /** the Matrix-Tree spanning-tree count of the discourse graph — its cohesion robustness
   *  (`0` fragmented, `1` a single fragile thread, `> 1` richly cross-linked). */
  readonly cohesionTrees: number;
  /** a single rigid thread of discourse: one spanning tree, no redundant cross-links. */
  readonly cohesive: boolean;
  /** a richly cross-linked discourse: redundant connections (`cohesionTrees > 1`) — resilient. */
  readonly redundant: boolean;
  /** derivable discourse-links: the EXACT/gradient flows `rank(L) = V − C` — the links implied by
   *  shared subjects, reconstructible from a per-topic potential. */
  readonly derivable: number;
  /** irreducible discourse cycles: the HARMONIC flows `β₁ = E − V + C` (the H¹ obstruction) — the
   *  independent cross-link loops no local rephrasing removes. */
  readonly irreducible: number;
  /** normalized finite cohomology receipt for the discourse graph's H0/H1/Laplacian read. */
  readonly cohomology: JsonRecord;
}

export const discourseCohesionSchema = {
  $id: "communicating/discourse-cohesion",
  title: "DiscourseCohesion",
  type: "object",
  required: ["kind", "subjects", "topics", "connected", "cohesionTrees", "cohesive", "redundant", "derivable", "irreducible", "cohomology"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.discourse-cohesion" },
    subjects: { type: "integer", minimum: 0 },
    topics: { type: "integer", minimum: 0 },
    connected: { type: "boolean" },
    cohesionTrees: { type: "integer", minimum: 0 },
    cohesive: { type: "boolean" },
    redundant: { type: "boolean" },
    derivable: { type: "integer", minimum: 0 },
    irreducible: { type: "integer", minimum: 0 },
    cohomology: { type: "object" },
  },
} as const;
export const discourseCohesionCarrier = carrierFrom(discourseCohesionSchema);

/** The empty/edgeless discourse (no related cells present a graph). */
const emptyDiscourseCohesion = (subjects: number): DiscourseCohesion => Object.freeze({
  kind: "communicating.discourse-cohesion" as const,
  subjects,
  topics: subjects,
  connected: subjects === 1,
  cohesionTrees: subjects <= 1 ? 1 : 0,
  cohesive: subjects <= 1,
  redundant: false,
  derivable: 0,
  irreducible: 0,
  cohomology: discourseCohomologyReceipt(subjects, subjects, []),
});

/** Read a membrane's discourse cohesion through the substrate graph Laplacian: the topic count (H⁰)
 *  and the spanning-tree robustness of the discourse. */
export function discourseCohesionOf(membrane: readonly UtteranceCarrier[]): DiscourseCohesion {
  const cells = membrane.map((carrier) => membraneMeme(carrier).cell);
  const related = cells.filter((cell) => cell.subject !== cell.object);
  if (related.length === 0) {
    const terms: unknown[] = [];
    for (const cell of cells) for (const term of [cell.subject, cell.object]) if (!terms.includes(term)) terms.push(term);
    return emptyDiscourseCohesion(terms.length);
  }
  const graph = analysis.relationGraphOfCells(cells);
  const topics = natCount(analysis.componentCount(graph));
  const cohesionTrees = natCount(analysis.magnitude(analysis.treeCount(graph)));
  const hodge = analysis.hodgeDecomposition(graph);
  const cohomology = discourseCohomologyReceipt(graph.terms.length, topics, related);
  return Object.freeze({
    kind: "communicating.discourse-cohesion" as const,
    subjects: graph.terms.length,
    topics,
    connected: topics === 1,
    cohesionTrees,
    cohesive: cohesionTrees === 1,
    redundant: cohesionTrees > 1,
    derivable: natCount(hodge.exact),
    irreducible: natCount(hodge.harmonic),
    cohomology,
  });
}

const admitMembrane = (input: unknown): readonly UtteranceCarrier[] => {
  if (Array.isArray(input)) return input as readonly UtteranceCarrier[];
  if (input !== null && typeof input === "object" && Array.isArray((input as { membrane?: unknown }).membrane)) {
    return (input as { membrane: readonly UtteranceCarrier[] }).membrane;
  }
  throw new TypeError("cohere: expected a membrane (an array of utterance carriers) or { membrane: [...] }");
};

/** cohere — read a membrane's discourse cohesion through the spectral graph Laplacian (H⁰ topics +
 *  Matrix-Tree spanning-tree robustness). */
export const cohereAction: Action = action({
  verb: "cohere",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a membrane's DISCOURSE COHESION through the substrate graph Laplacian: H⁰ topics (component count) and the Matrix-Tree spanning-tree count as cohesion robustness.",
  description: "Domain: a membrane (an array of utterance carriers) or { membrane: [...] }. Codomain: communicating/discourse-cohesion — the membrane's discourse graph (subject↔object terms) read through relating's combinatorial graph Laplacian L = D − W (analysis.laplacian, exact over ℤ). `topics` is the connected-component count H⁰ (independent discourse clusters sharing no entity); `cohesionTrees` is the Matrix-Tree spanning-tree count — the discourse's cohesion ROBUSTNESS: 0 fragmented, 1 a single fragile thread, > 1 a richly cross-linked resilient discourse. Grounded in relating's analysis.laplacian (relationGraphOfCells / componentCount / treeCount) and the across-face membrane reading (face.mts).",
  domain: membraneCarrier,
  codomain: discourseCohesionCarrier,
  run: (input: unknown): JsonValue =>
    jsonResource(discourseCohesionOf(admitMembrane(input)) as unknown as JsonValue, "discourse cohesion"),
});

/**
 * The DISCOURSE SPACETIME of a membrane — its causal geometry, read through relating's substrate
 * temporal geometry (`analysis.geometry`). The membrane is a genuine Lorentzian causal set: each
 * utterance is an EVENT stamped by its position (its TIME), two events are adjacent when their cells
 * share a TERM, and an earlier utterance causally PRECEDES a later one when a chain of shared terms
 * threads them forward (the transitive closure of stage-increasing term-adjacency — `causalOrder`).
 * Unrelated utterances are SPACELIKE (independent, concurrent topics). This is a DIFFERENT structure
 * from the discourse cohesion graph: it is the discourse's TIME, not just its connectivity.
 */
export interface DiscourseSpacetime {
  readonly kind: "communicating.discourse-spacetime";
  /** the utterances, as causal-set events. */
  readonly events: number;
  /** timelike (causally-related) pairs — utterances threaded by shared terms through time. */
  readonly timelikePairs: number;
  /** all distinct event pairs. */
  readonly totalPairs: number;
  /** the ORDERING FRACTION = timelike / total — the discourse's causal density (Lorentzian: `1` a pure
   *  chain of sequential reasoning, low a wide spacelike spread of independent concurrent threads). */
  readonly orderingFraction: number;
  /** the PROPER TIME = the longest causal chain — the depth of the deepest discourse thread (how many
   *  utterances deep the longest forward-threaded line of shared terms runs). */
  readonly properTime: number;
  /** a single dominant causal thread (`properTime === events`): the whole discourse is one timelike line. */
  readonly threaded: boolean;
}

export const discourseSpacetimeSchema = {
  $id: "communicating/discourse-spacetime",
  title: "DiscourseSpacetime",
  type: "object",
  required: ["kind", "events", "timelikePairs", "totalPairs", "orderingFraction", "properTime", "threaded"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.discourse-spacetime" },
    events: { type: "integer", minimum: 0 },
    timelikePairs: { type: "integer", minimum: 0 },
    totalPairs: { type: "integer", minimum: 0 },
    orderingFraction: { type: "number", minimum: 0 },
    properTime: { type: "integer", minimum: 0 },
    threaded: { type: "boolean" },
  },
} as const;
export const discourseSpacetimeCarrier = carrierFrom(discourseSpacetimeSchema);

/** The longest causal chain (poset height) of a causal order — exact, by DP over the firing order
 *  (events are stamped in increasing time, so every predecessor is resolved before its successor). */
function properTimeOf(order: geometry.CausalOrderCarrier): number {
  const events = order.events.length;
  if (events === 0) return 0;
  const height = new Array<number>(events).fill(1);
  for (let later = 0; later < events; later += 1) {
    for (let earlier = 0; earlier < later; earlier += 1) {
      if (order.precedes[earlier]!.includes(later)) height[later] = Math.max(height[later]!, height[earlier]! + 1);
    }
  }
  return Math.max(...height);
}

/** Read a membrane's discourse spacetime: its causal order's ordering fraction (density) and proper
 *  time (deepest thread), through the substrate temporal geometry. */
export function discourseSpacetimeOf(membrane: readonly UtteranceCarrier[]): DiscourseSpacetime {
  const order = geometry.causalOrderOfFiringEvents(
    membrane.map((carrier, position) => geometry.firingEvent(membraneMeme(carrier).cell, position)),
  );
  const events = order.events.length;
  const fraction = geometry.orderingFraction(order);
  const timelikePairs = fraction.kind === "meme-geometry.temporal.orderingFraction" ? fraction.comparablePairs : 0;
  const totalPairs = fraction.kind === "meme-geometry.temporal.orderingFraction" ? fraction.totalPairs : 0;
  const properTime = properTimeOf(order);
  return Object.freeze({
    kind: "communicating.discourse-spacetime" as const,
    events,
    timelikePairs,
    totalPairs,
    orderingFraction: totalPairs === 0 ? 0 : timelikePairs / totalPairs,
    properTime,
    threaded: events > 0 && properTime === events,
  });
}

/** spacetime — read a membrane's discourse causal geometry (ordering fraction + proper time). */
export const spacetimeAction: Action = action({
  verb: "spacetime",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a membrane's DISCOURSE SPACETIME: the causal order's ordering fraction (causal density) and proper time (deepest thread), via relating's temporal geometry.",
  description: "Domain: a membrane (an array of utterance carriers) or { membrane: [...] }. Codomain: communicating/discourse-spacetime — the membrane as a Lorentzian causal set (analysis.geometry.causalOrder, exact): each utterance is an event stamped by its position, adjacency is shared terms, causal precedence is the transitive closure of stage-increasing term-adjacency. `orderingFraction` = timelike pairs / total pairs (causal density: 1 a sequential chain, low a spacelike spread); `properTime` = the longest causal chain (deepest discourse thread). Grounded in relating's settling/geometry/temporal and the corpus's lorentzian-causal-settling.",
  domain: membraneCarrier,
  codomain: discourseSpacetimeCarrier,
  run: (input: unknown): JsonValue =>
    jsonResource(discourseSpacetimeOf(admitMembrane(input)) as unknown as JsonValue, "discourse spacetime"),
});

/** The mark value of a cell term (a token wrapping a mark), as the information-theoretic outcome label. */
const termLabel = (term: { readonly mark: { readonly value: unknown } }): string => String(term.mark.value);

/**
 * The CHANNEL INFORMATION of a membrane — communicating read as information theory. With each utterance
 * a (speaker, subject) sample (the enriched membrane cell `(subject, predicate, utterer)`), the membrane
 * is an empirical joint distribution over a SPEAKER alphabet and a SUBJECT alphabet — a communication
 * channel. `mutualInformation` = `I(speaker; subject)` (bits): how much knowing who is speaking tells you
 * about what they speak of — the information the channel actually carries. `0` ⟺ speakers and subjects are
 * independent (everyone talks about everything equally); high ⟺ speakers specialize (each owns a topic).
 * Read through relating's substrate `analysis.mutualInformation`.
 */
export interface ChannelInformation {
  readonly kind: "communicating.channel-information";
  /** the utterances, as joint samples. */
  readonly utterances: number;
  /** distinct speakers — the X alphabet. */
  readonly speakers: number;
  /** distinct subjects — the Y alphabet. */
  readonly subjects: number;
  /** `H(speaker)` — the entropy of who is speaking (bits). */
  readonly speakerEntropy: number;
  /** `H(subject)` — the entropy of what is spoken of (bits). */
  readonly subjectEntropy: number;
  /** `H(speaker, subject)` — the joint entropy (bits). */
  readonly jointEntropy: number;
  /** `I(speaker; subject)` — the information the channel carries (bits, `≥ 0`). */
  readonly mutualInformation: number;
}

export const channelInformationSchema = {
  $id: "communicating/channel-information",
  title: "ChannelInformation",
  type: "object",
  required: ["kind", "utterances", "speakers", "subjects", "speakerEntropy", "subjectEntropy", "jointEntropy", "mutualInformation"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.channel-information" },
    utterances: { type: "integer", minimum: 0 },
    speakers: { type: "integer", minimum: 0 },
    subjects: { type: "integer", minimum: 0 },
    speakerEntropy: { type: "number", minimum: 0 },
    subjectEntropy: { type: "number", minimum: 0 },
    jointEntropy: { type: "number", minimum: 0 },
    mutualInformation: { type: "number", minimum: 0 },
  },
} as const;
export const channelInformationCarrier = carrierFrom(channelInformationSchema);

/** Read a membrane's channel information: the mutual information between speaker and subject. */
export function channelInformationOf(membrane: readonly UtteranceCarrier[]): ChannelInformation {
  const pairs = membrane.map((carrier): readonly [string, string] => {
    const memeCell = membraneMeme(carrier).cell;
    return [termLabel(memeCell.object), termLabel(memeCell.subject)]; // [speaker, subject]
  });
  const info = analysis.mutualInformation(pairs);
  return Object.freeze({
    kind: "communicating.channel-information" as const,
    utterances: membrane.length,
    speakers: new Set(pairs.map(([speaker]) => speaker)).size,
    subjects: new Set(pairs.map(([, subject]) => subject)).size,
    speakerEntropy: info.entropyX,
    subjectEntropy: info.entropyY,
    jointEntropy: info.jointEntropy,
    mutualInformation: info.mutualInformation,
  });
}

/** channel — read a membrane's channel information: H(speaker), H(subject), and I(speaker; subject). */
export const channelAction: Action = action({
  verb: "channel",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a membrane as an information CHANNEL: H(speaker), H(subject), and the mutual information I(speaker; subject) — how much who-is-speaking tells you about what-is-spoken-of.",
  description: "Domain: a membrane (an array of utterance carriers) or { membrane: [...] }. Codomain: communicating/channel-information — the membrane as an empirical joint distribution over a speaker alphabet and a subject alphabet (each utterance a (speaker, subject) sample, from the enriched membrane cell). Read through relating's substrate analysis.mutualInformation: marginal entropies H(speaker)/H(subject), joint H(speaker,subject), and I(speaker;subject) = H(speaker)+H(subject)-H(speaker,subject) — the information the channel carries (0 = independence, high = speaker specialization). Bits, real-valued (Shannon). Grounds communicating as the information-theory faculty.",
  domain: membraneCarrier,
  codomain: channelInformationCarrier,
  run: (input: unknown): JsonValue =>
    jsonResource(channelInformationOf(admitMembrane(input)) as unknown as JsonValue, "channel information"),
});
