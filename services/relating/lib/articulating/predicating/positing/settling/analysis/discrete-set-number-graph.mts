/**
 * analysis/discrete - finite set, Nat, and graph shadows.
 *
 * Executable shadow of RelMath.Order.SetNumberGraphTheory: finite powersets,
 * Kuratowski pair equality, equivalence partitions, bounded Nat semiring checks,
 * directed handshake counts, topological-order DAG witnesses, and tree counts.
 */

export interface FiniteSetCarrier {
  readonly kind: "discrete.set.carrier";
  readonly universe: readonly string[];
  readonly members: readonly string[];
}

export interface PowersetReceipt {
  readonly kind: "discrete.powerset.receipt:witness";
  readonly universe: readonly string[];
  readonly left: FiniteSetCarrier;
  readonly right: FiniteSetCarrier;
  readonly intersection: FiniteSetCarrier;
  readonly union: FiniteSetCarrier;
  readonly leftComplement: FiniteSetCarrier;
  readonly rightComplement: FiniteSetCarrier;
  readonly subsetPartialOrder: true;
  readonly boundedLattice: true;
  readonly deMorganInter: true;
  readonly deMorganUnion: true;
  readonly complementAntitone: true;
}

export interface KuratowskiPairReceipt {
  readonly kind: "discrete.kuratowskiPair.receipt:witness";
  readonly left: readonly [string, string];
  readonly right: readonly [string, string];
  readonly equal: boolean;
  readonly characteristicEquality: true;
}

export interface EquivalencePartitionReceipt {
  readonly kind: "discrete.equivalencePartition.receipt:witness";
  readonly carrier: readonly string[];
  readonly classes: readonly FiniteSetCarrier[];
  readonly reflexive: true;
  readonly symmetric: true;
  readonly transitive: true;
  readonly covers: true;
  readonly overlapForcesEqual: true;
}

export interface NatSemiringReceipt {
  readonly kind: "discrete.natSemiring.receipt:witness";
  readonly checkedThrough: number;
  readonly addCommutative: true;
  readonly addAssociative: true;
  readonly addZero: true;
  readonly mulCommutative: true;
  readonly mulAssociative: true;
  readonly mulOne: true;
  readonly zeroMul: true;
  readonly leftDistributive: true;
  readonly rightDistributive: true;
  readonly noAdditiveInverseOfOne: true;
}

export interface SuccessorAlgebraCarrier {
  readonly kind: "discrete.successorAlgebra.carrier";
  readonly elements: readonly string[];
  readonly zero: string;
  readonly successor: Readonly<Record<string, string>>;
}

export interface SuccessorAlgebraReceipt {
  readonly kind: "discrete.successorAlgebra.receipt:witness";
  readonly sourceModule: "RelMath.Order.SetNumberGraphTheory";
  readonly theorems: readonly [
    "RelMath.Discrete.natAlg",
    "RelMath.Discrete.natRec",
    "RelMath.Discrete.natRecHom",
    "RelMath.Discrete.nat_initial_exists",
    "RelMath.Discrete.nat_initial_unique",
    "RelMath.Discrete.nat_hom_unique",
  ];
  readonly algebra: SuccessorAlgebraCarrier;
  readonly checkedThrough: number;
  readonly recursor: readonly string[];
  readonly candidateMorphisms: readonly (readonly string[])[];
  readonly recursorPreservesZero: true;
  readonly recursorPreservesSuccessor: true;
  readonly initialExistsOnPrefix: true;
  readonly initialUniqueOnPrefix: true;
}

export interface FiniteDirectedGraphCarrier {
  readonly kind: "discrete.graph.directed.carrier";
  readonly vertices: readonly string[];
  readonly edges: readonly (readonly [string, string])[];
}

export interface DirectedHandshakeReceipt {
  readonly kind: "discrete.graph.handshake.receipt:witness";
  readonly graph: FiniteDirectedGraphCarrier;
  readonly edgeCount: number;
  readonly indegrees: Readonly<Record<string, number>>;
  readonly outdegrees: Readonly<Record<string, number>>;
  readonly sumIndegree: number;
  readonly sumOutdegree: number;
  readonly directedHandshake: true;
}

export interface TopologicalDagReceipt {
  readonly kind: "discrete.graph.topologicalDag.receipt:witness";
  readonly graph: FiniteDirectedGraphCarrier;
  readonly order: Readonly<Record<string, number>>;
  readonly irreflexive: true;
  readonly topological: true;
  readonly dag: true;
}

export interface TreeCountReceipt {
  readonly kind: "discrete.graph.treeCount.receipt:witness" | "discrete.graph.treeCount.receipt:obstruction";
  readonly graph: FiniteDirectedGraphCarrier;
  readonly vertexCount: number;
  readonly edgeCount: number;
  readonly edgeCountPlusOne: number;
  readonly spanningCount: boolean;
}

const unique = (items: readonly string[]): boolean => new Set(items).size === items.length;

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

function requireUniverse(universe: readonly string[], caller: string): void {
  if (!unique(universe)) throw new TypeError(`${caller}: duplicate universe elements are not a finite carrier`);
}

function requireMember(universe: readonly string[], member: string, caller: string): void {
  if (!universe.includes(member)) throw new TypeError(`${caller}: ${member} is not in the finite carrier`);
}

export function finiteSet(universe: readonly string[], members: readonly string[]): FiniteSetCarrier {
  requireUniverse(universe, "finiteSet");
  if (!unique(members)) throw new TypeError("finiteSet: duplicate members are not extensional");
  for (const member of members) requireMember(universe, member, "finiteSet");
  return Object.freeze({
    kind: "discrete.set.carrier" as const,
    universe: Object.freeze([...universe]),
    members: Object.freeze([...members].sort((a, b) => universe.indexOf(a) - universe.indexOf(b))),
  });
}

const has = (set: FiniteSetCarrier, member: string): boolean => set.members.includes(member);

export const subset = (left: FiniteSetCarrier, right: FiniteSetCarrier): boolean =>
  left.members.every((member) => has(right, member));

const sameSet = (left: FiniteSetCarrier, right: FiniteSetCarrier): boolean =>
  subset(left, right) && subset(right, left);

export const setIntersection = (left: FiniteSetCarrier, right: FiniteSetCarrier): FiniteSetCarrier =>
  finiteSet(left.universe, left.universe.filter((member) => has(left, member) && has(right, member)));

export const setUnion = (left: FiniteSetCarrier, right: FiniteSetCarrier): FiniteSetCarrier =>
  finiteSet(left.universe, left.universe.filter((member) => has(left, member) || has(right, member)));

export const setComplement = (set: FiniteSetCarrier): FiniteSetCarrier =>
  finiteSet(set.universe, set.universe.filter((member) => !has(set, member)));

function* subsets(universe: readonly string[], index = 0, members: string[] = []): Generator<FiniteSetCarrier> {
  if (index === universe.length) {
    yield finiteSet(universe, members);
    return;
  }
  yield* subsets(universe, index + 1, members);
  members.push(universe[index] as string);
  yield* subsets(universe, index + 1, members);
  members.pop();
}

export function powersetReceipt(universe: readonly string[], leftMembers: readonly string[], rightMembers: readonly string[]): PowersetReceipt {
  if (universe.length > 6) throw new RangeError("powersetReceipt: exhaustive powerset checks are limited to at most 6 elements");
  const left = finiteSet(universe, leftMembers);
  const right = finiteSet(universe, rightMembers);
  const all = [...subsets(universe)];
  const partial = all.every((set) => subset(set, set))
    && all.every((a) => all.every((b) => all.every((c) => !(subset(a, b) && subset(b, c)) || subset(a, c))))
    && all.every((a) => all.every((b) => !(subset(a, b) && subset(b, a)) || sameSet(a, b)));
  const bounded = all.every((set) =>
    sameSet(setIntersection(set, finiteSet(universe, universe)), set)
    && sameSet(setUnion(set, finiteSet(universe, [])), set),
  );
  const deMorganInter = sameSet(setComplement(setIntersection(left, right)), setUnion(setComplement(left), setComplement(right)));
  const deMorganUnion = sameSet(setComplement(setUnion(left, right)), setIntersection(setComplement(left), setComplement(right)));
  const complementAntitone = !subset(left, right) || subset(setComplement(right), setComplement(left));
  if (!partial || !bounded || !deMorganInter || !deMorganUnion || !complementAntitone) {
    throw new TypeError("powersetReceipt: finite powerset laws failed");
  }
  return Object.freeze({
    kind: "discrete.powerset.receipt:witness" as const,
    universe: left.universe,
    left,
    right,
    intersection: setIntersection(left, right),
    union: setUnion(left, right),
    leftComplement: setComplement(left),
    rightComplement: setComplement(right),
    subsetPartialOrder: true as const,
    boundedLattice: true as const,
    deMorganInter: true as const,
    deMorganUnion: true as const,
    complementAntitone: true as const,
  });
}

export function kuratowskiPairReceipt(a: string, b: string, c: string, d: string): KuratowskiPairReceipt {
  return Object.freeze({
    kind: "discrete.kuratowskiPair.receipt:witness" as const,
    left: Object.freeze([a, b]) as readonly [string, string],
    right: Object.freeze([c, d]) as readonly [string, string],
    equal: a === c && b === d,
    characteristicEquality: true as const,
  });
}

export function equivalencePartitionReceipt(carrier: readonly string[], relation: readonly (readonly boolean[])[]): EquivalencePartitionReceipt {
  requireUniverse(carrier, "equivalencePartitionReceipt");
  if (relation.length !== carrier.length || relation.some((row) => row.length !== carrier.length)) {
    throw new TypeError("equivalencePartitionReceipt: relation must be square over the carrier");
  }
  const reflexive = carrier.every((_, i) => relation[i]?.[i] === true);
  const symmetric = carrier.every((_, i) => carrier.every((__, j) => relation[i]?.[j] !== true || relation[j]?.[i] === true));
  const transitive = carrier.every((_, i) => carrier.every((__, j) => carrier.every((___, k) =>
    !(relation[i]?.[j] === true && relation[j]?.[k] === true) || relation[i]?.[k] === true,
  )));
  if (!reflexive || !symmetric || !transitive) {
    throw new TypeError("equivalencePartitionReceipt: relation is not an equivalence relation");
  }
  const classBySeed = carrier.map((seed, i) => finiteSet(carrier, carrier.filter((_, j) => relation[i]?.[j] === true)));
  const classes = Object.freeze(classBySeed.filter((set, i) => classBySeed.findIndex((other) => sameSet(set, other)) === i));
  const covers = carrier.every((member) => classes.some((cls) => has(cls, member)));
  const overlapForcesEqual = classes.every((left) => classes.every((right) => {
    const overlaps = left.members.some((member) => has(right, member));
    return !overlaps || sameSet(left, right);
  }));
  if (!covers || !overlapForcesEqual) throw new TypeError("equivalencePartitionReceipt: partition laws failed");
  return Object.freeze({
    kind: "discrete.equivalencePartition.receipt:witness" as const,
    carrier: Object.freeze([...carrier]),
    classes,
    reflexive: true as const,
    symmetric: true as const,
    transitive: true as const,
    covers: true as const,
    overlapForcesEqual: true as const,
  });
}

export function natSemiringReceipt(checkedThrough = 6): NatSemiringReceipt {
  if (!Number.isSafeInteger(checkedThrough) || checkedThrough < 1 || checkedThrough > 50) {
    throw new RangeError("natSemiringReceipt: checkedThrough must be an integer in [1, 50]");
  }
  const xs = Array.from({ length: checkedThrough + 1 }, (_, i) => i);
  const addCommutative = xs.every((a) => xs.every((b) => a + b === b + a));
  const addAssociative = xs.every((a) => xs.every((b) => xs.every((c) => (a + b) + c === a + (b + c))));
  const addZero = xs.every((a) => a + 0 === a && 0 + a === a);
  const mulCommutative = xs.every((a) => xs.every((b) => a * b === b * a));
  const mulAssociative = xs.every((a) => xs.every((b) => xs.every((c) => (a * b) * c === a * (b * c))));
  const mulOne = xs.every((a) => a * 1 === a && 1 * a === a);
  const zeroMul = xs.every((a) => 0 * a === 0 && a * 0 === 0);
  const leftDistributive = xs.every((a) => xs.every((b) => xs.every((c) => a * (b + c) === (a * b) + (a * c))));
  const rightDistributive = xs.every((a) => xs.every((b) => xs.every((c) => (a + b) * c === (a * c) + (b * c))));
  const noAdditiveInverseOfOne = xs.every((n) => 1 + n !== 0);
  if (!addCommutative || !addAssociative || !addZero || !mulCommutative || !mulAssociative || !mulOne || !zeroMul || !leftDistributive || !rightDistributive || !noAdditiveInverseOfOne) {
    throw new TypeError("natSemiringReceipt: bounded Nat semiring laws failed");
  }
  return Object.freeze({
    kind: "discrete.natSemiring.receipt:witness" as const,
    checkedThrough,
    addCommutative: true as const,
    addAssociative: true as const,
    addZero: true as const,
    mulCommutative: true as const,
    mulAssociative: true as const,
    mulOne: true as const,
    zeroMul: true as const,
    leftDistributive: true as const,
    rightDistributive: true as const,
    noAdditiveInverseOfOne: true as const,
  });
}

function requireSuccessorAlgebra(algebra: SuccessorAlgebraCarrier, caller: string): void {
  requireUniverse(algebra.elements, caller);
  requireMember(algebra.elements, algebra.zero, caller);
  for (const element of algebra.elements) {
    const next = algebra.successor[element];
    if (next === undefined) throw new TypeError(`${caller}: missing successor for ${element}`);
    requireMember(algebra.elements, next, caller);
  }
}

function natRecPrefix(algebra: SuccessorAlgebraCarrier, checkedThrough: number): readonly string[] {
  const out: string[] = [algebra.zero];
  for (let index = 0; index < checkedThrough; index += 1) {
    out.push(algebra.successor[out[index] as string] as string);
  }
  return Object.freeze(out);
}

function candidateNatMorphisms(algebra: SuccessorAlgebraCarrier, checkedThrough: number): readonly (readonly string[])[] {
  const length = checkedThrough + 1;
  const out: (readonly string[])[] = [];
  const build = (index: number, current: string[]): void => {
    if (index === length) {
      const preservesZero = current[0] === algebra.zero;
      const preservesSuccessor = current.slice(0, -1).every((value, n) => current[n + 1] === algebra.successor[value]);
      if (preservesZero && preservesSuccessor) out.push(Object.freeze([...current]));
      return;
    }
    for (const element of algebra.elements) {
      current[index] = element;
      build(index + 1, current);
    }
  };
  build(0, []);
  return Object.freeze(out);
}

/** Finite prefix shadow of Nat's initiality as a successor algebra. */
export function successorAlgebraReceipt(algebra: SuccessorAlgebraCarrier, checkedThrough = 5): SuccessorAlgebraReceipt {
  if (!Number.isSafeInteger(checkedThrough) || checkedThrough < 0 || checkedThrough > 8) {
    throw new RangeError("successorAlgebraReceipt: checkedThrough must be an integer in [0, 8]");
  }
  if (algebra.elements.length > 6) throw new RangeError("successorAlgebraReceipt: exhaustive morphism checks are limited to at most 6 elements");
  requireSuccessorAlgebra(algebra, "successorAlgebraReceipt");
  const normalized: SuccessorAlgebraCarrier = Object.freeze({
    kind: "discrete.successorAlgebra.carrier" as const,
    elements: Object.freeze([...algebra.elements]),
    zero: algebra.zero,
    successor: freezeRecord(Object.fromEntries(algebra.elements.map((element) => [element, algebra.successor[element] as string]))),
  });
  const recursor = natRecPrefix(normalized, checkedThrough);
  const candidateMorphisms = candidateNatMorphisms(normalized, checkedThrough);
  const recursorPreservesZero = recursor[0] === normalized.zero;
  const recursorPreservesSuccessor = recursor.slice(0, -1).every((value, index) => recursor[index + 1] === normalized.successor[value]);
  const initialExistsOnPrefix = candidateMorphisms.some((candidate) => candidate.every((value, index) => value === recursor[index]));
  const initialUniqueOnPrefix = candidateMorphisms.every((candidate) => candidate.every((value, index) => value === recursor[index]));
  if (!recursorPreservesZero || !recursorPreservesSuccessor || !initialExistsOnPrefix || !initialUniqueOnPrefix) {
    throw new TypeError("successorAlgebraReceipt: finite Nat initiality laws failed");
  }
  return Object.freeze({
    kind: "discrete.successorAlgebra.receipt:witness" as const,
    sourceModule: "RelMath.Order.SetNumberGraphTheory" as const,
    theorems: Object.freeze([
      "RelMath.Discrete.natAlg",
      "RelMath.Discrete.natRec",
      "RelMath.Discrete.natRecHom",
      "RelMath.Discrete.nat_initial_exists",
      "RelMath.Discrete.nat_initial_unique",
      "RelMath.Discrete.nat_hom_unique",
    ]) as SuccessorAlgebraReceipt["theorems"],
    algebra: normalized,
    checkedThrough,
    recursor,
    candidateMorphisms,
    recursorPreservesZero: recursorPreservesZero as true,
    recursorPreservesSuccessor: recursorPreservesSuccessor as true,
    initialExistsOnPrefix: initialExistsOnPrefix as true,
    initialUniqueOnPrefix: initialUniqueOnPrefix as true,
  });
}

export function directedGraph(vertices: readonly string[], edges: readonly (readonly [string, string])[]): FiniteDirectedGraphCarrier {
  requireUniverse(vertices, "directedGraph");
  for (const [source, target] of edges) {
    requireMember(vertices, source, "directedGraph");
    requireMember(vertices, target, "directedGraph");
  }
  const edgeKeys = new Set<string>();
  const out: (readonly [string, string])[] = [];
  for (const [source, target] of edges) {
    const key = `${source}\u0000${target}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      out.push(Object.freeze([source, target]) as readonly [string, string]);
    }
  }
  return Object.freeze({
    kind: "discrete.graph.directed.carrier" as const,
    vertices: Object.freeze([...vertices]),
    edges: Object.freeze(out),
  });
}

export function directedHandshakeReceipt(graph: FiniteDirectedGraphCarrier): DirectedHandshakeReceipt {
  const indegrees: Record<string, number> = Object.fromEntries(graph.vertices.map((v) => [v, 0]));
  const outdegrees: Record<string, number> = Object.fromEntries(graph.vertices.map((v) => [v, 0]));
  for (const [source, target] of graph.edges) {
    outdegrees[source] = (outdegrees[source] ?? 0) + 1;
    indegrees[target] = (indegrees[target] ?? 0) + 1;
  }
  const sumIndegree = Object.values(indegrees).reduce((a, b) => a + b, 0);
  const sumOutdegree = Object.values(outdegrees).reduce((a, b) => a + b, 0);
  if (sumIndegree !== graph.edges.length || sumOutdegree !== graph.edges.length) {
    throw new TypeError("directedHandshakeReceipt: directed handshake failed");
  }
  return Object.freeze({
    kind: "discrete.graph.handshake.receipt:witness" as const,
    graph,
    edgeCount: graph.edges.length,
    indegrees: freezeRecord(indegrees),
    outdegrees: freezeRecord(outdegrees),
    sumIndegree,
    sumOutdegree,
    directedHandshake: true as const,
  });
}

export function topologicalDagReceipt(graph: FiniteDirectedGraphCarrier, order: Readonly<Record<string, number>>): TopologicalDagReceipt {
  const normalized: Record<string, number> = {};
  for (const vertex of graph.vertices) {
    const value = order[vertex];
    if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new TypeError(`topologicalDagReceipt: missing integer order for ${vertex}`);
    normalized[vertex] = value;
  }
  const irreflexive = graph.edges.every(([source, target]) => source !== target);
  const topological = graph.edges.every(([source, target]) => (normalized[source] as number) < (normalized[target] as number));
  if (!irreflexive || !topological) throw new TypeError("topologicalDagReceipt: graph is not witnessed as a DAG by this order");
  return Object.freeze({
    kind: "discrete.graph.topologicalDag.receipt:witness" as const,
    graph,
    order: freezeRecord(normalized),
    irreflexive: true as const,
    topological: true as const,
    dag: true as const,
  });
}

export function treeCountReceipt(graph: FiniteDirectedGraphCarrier): TreeCountReceipt {
  const spanningCount = graph.edges.length + 1 === graph.vertices.length;
  return Object.freeze({
    kind: spanningCount ? "discrete.graph.treeCount.receipt:witness" as const : "discrete.graph.treeCount.receipt:obstruction" as const,
    graph,
    vertexCount: graph.vertices.length,
    edgeCount: graph.edges.length,
    edgeCountPlusOne: graph.edges.length + 1,
    spanningCount,
  });
}
