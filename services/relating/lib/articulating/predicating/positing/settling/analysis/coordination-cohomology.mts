/**
 * analysis/coordination-cohomology - finite executable shadow of
 * RelMath.Cohomology.CoordinationCohomology.
 *
 * Lean models a federated cover nerve by Euler counts: entities |V|, cells |E|,
 * and components |C|. H0 is |C| and H1 is |E| - |V| + |C| under the carried
 * union-find invariant |V| <= |E| + |C|. This module makes that finite
 * coordination-cost receipt executable.
 */
import {
  detailedBalanceImpliesStationary,
  poissonKernel,
  poissonPi,
  ratStochSemiring,
  type DetailedBalanceStationaryWitness,
} from "../stochastic.mjs";

export interface CoverNerveCarrier {
  readonly kind: "coordinationCohomology.coverNerve";
  readonly entities: number;
  readonly cells: number;
  readonly components: number;
  readonly componentsLeEntities: true;
  readonly entitiesLeCellsAddComponents: true;
}

export interface CoverNerveObstruction {
  readonly kind: "coordinationCohomology.coverNerve-obstruction";
  readonly entities: number;
  readonly cells: number;
  readonly components: number;
  readonly reason: "negative-count" | "empty-component-with-entities" | "components-exceed-entities" | "union-find-invariant-fails";
}

export type CoverNerveJudgment = CoverNerveCarrier | CoverNerveObstruction;

export interface CoordinationCostReceipt {
  readonly kind: "coordinationCohomology.cost:witness";
  readonly nerve: CoverNerveCarrier;
  readonly h0Rank: number;
  readonly h1Rank: number;
  readonly spanningForestEdges: number;
  readonly coordinationCost: number;
  readonly coordinationFree: boolean;
  readonly forestEquality: boolean;
  readonly h1VanishesIffForest: true;
  readonly h1RankIsCoordinationCost: true;
}

export interface LaplacianDualReceipt {
  readonly kind: "coordinationCohomology.laplacianDual:witness";
  readonly nerve: CoverNerveCarrier;
  readonly incidenceRank: number;
  readonly h0KernelRank: number;
  readonly h1CokernelRank: number;
  readonly h0EqualsKernel: true;
  readonly h1EqualsCokernel: true;
}

export interface TreeCoordinationReceipt {
  readonly kind: "coordinationCohomology.tree:witness";
  readonly vertices: number;
  readonly edges: number;
  readonly nerve: CoverNerveCarrier;
  readonly edgeCountIdentity: true;
  readonly h1Rank: 0;
  readonly coordinationFree: true;
}

export interface LandauerEntropyReceipt {
  readonly kind: "coordinationCohomology.landauerEntropy:witness";
  readonly nerve: CoverNerveCarrier;
  readonly bits: number;
  readonly coordinationCost: number;
  readonly reversible: boolean;
  readonly landauerFree: boolean;
  readonly zeroIffReversible: true;
  readonly equalsCoordinationCost: true;
  readonly stochasticFace: DetailedBalanceStationaryWitness;
  readonly reversibleIsLandauerFree: true;
  readonly bitScale: "one-bit-per-first-cohomology-class";
  readonly physicalScaleBoundary: "exact bit count only; kT-ln2 thermodynamic scaling remains an interpretation boundary";
}

export interface CoordinationCohomologyReceipt {
  readonly kind: "coordinationCohomology.receipt:witness";
  readonly cycle: CoordinationCostReceipt;
  readonly forest: CoordinationCostReceipt;
  readonly tree: TreeCoordinationReceipt;
  readonly laplacian: LaplacianDualReceipt;
  readonly landauer: LandauerEntropyReceipt;
  readonly openFrontier: readonly string[];
}

const assertNat = (name: string, value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a safe natural number`);
  }
  return value;
};

export function coverNerveJudgment(entitiesInput: number, cellsInput: number, componentsInput: number): CoverNerveJudgment {
  const entities = assertNat("entities", entitiesInput);
  const cells = assertNat("cells", cellsInput);
  const components = assertNat("components", componentsInput);

  if (entities > 0 && components === 0) {
    return Object.freeze({
      kind: "coordinationCohomology.coverNerve-obstruction" as const,
      entities,
      cells,
      components,
      reason: "empty-component-with-entities" as const,
    });
  }
  if (components > entities) {
    return Object.freeze({
      kind: "coordinationCohomology.coverNerve-obstruction" as const,
      entities,
      cells,
      components,
      reason: "components-exceed-entities" as const,
    });
  }
  if (entities > cells + components) {
    return Object.freeze({
      kind: "coordinationCohomology.coverNerve-obstruction" as const,
      entities,
      cells,
      components,
      reason: "union-find-invariant-fails" as const,
    });
  }

  return Object.freeze({
    kind: "coordinationCohomology.coverNerve" as const,
    entities,
    cells,
    components,
    componentsLeEntities: true as const,
    entitiesLeCellsAddComponents: true as const,
  });
}

export function coverNerve(entities: number, cells: number, components: number): CoverNerveCarrier {
  const judgment = coverNerveJudgment(entities, cells, components);
  if (judgment.kind !== "coordinationCohomology.coverNerve") {
    throw new TypeError(`coverNerve: ${judgment.reason}`);
  }
  return judgment;
}

export const h0Rank = (nerve: CoverNerveCarrier): number => nerve.components;

export const h1Rank = (nerve: CoverNerveCarrier): number =>
  nerve.cells + nerve.components - nerve.entities;

export const coordinationFree = (nerve: CoverNerveCarrier): boolean => h1Rank(nerve) === 0;

export const forestEquality = (nerve: CoverNerveCarrier): boolean =>
  nerve.entities === nerve.cells + nerve.components;

export const landauerBits = (nerve: CoverNerveCarrier): number => h1Rank(nerve);

export const landauerZeroIffReversible = (nerve: CoverNerveCarrier): boolean =>
  (landauerBits(nerve) === 0) === forestEquality(nerve);

export const landauerEqualsCoordinationCost = (nerve: CoverNerveCarrier): boolean =>
  landauerBits(nerve) === nerve.cells - (nerve.entities - nerve.components);

export function coordinationCostReceipt(nerve: CoverNerveCarrier): CoordinationCostReceipt {
  const h1 = h1Rank(nerve);
  const spanningForestEdges = nerve.entities - nerve.components;
  const coordinationCost = nerve.cells - spanningForestEdges;
  const h1VanishesIffForest = (h1 === 0) === forestEquality(nerve);
  const h1RankIsCoordinationCost = h1 === coordinationCost;

  if (!h1VanishesIffForest || !h1RankIsCoordinationCost) {
    throw new TypeError("coordinationCostReceipt: cover-nerve Euler laws failed");
  }

  return Object.freeze({
    kind: "coordinationCohomology.cost:witness" as const,
    nerve,
    h0Rank: h0Rank(nerve),
    h1Rank: h1,
    spanningForestEdges,
    coordinationCost,
    coordinationFree: h1 === 0,
    forestEquality: forestEquality(nerve),
    h1VanishesIffForest: true as const,
    h1RankIsCoordinationCost: true as const,
  });
}

export function laplacianDualReceipt(nerve: CoverNerveCarrier): LaplacianDualReceipt {
  const incidenceRank = nerve.entities - nerve.components;
  const h0KernelRank = nerve.entities - incidenceRank;
  const h1CokernelRank = nerve.cells - incidenceRank;
  const h0EqualsKernel = h0Rank(nerve) === h0KernelRank;
  const h1EqualsCokernel = h1Rank(nerve) === h1CokernelRank;

  if (!h0EqualsKernel || !h1EqualsCokernel) {
    throw new TypeError("laplacianDualReceipt: kernel/cokernel rank identities failed");
  }

  return Object.freeze({
    kind: "coordinationCohomology.laplacianDual:witness" as const,
    nerve,
    incidenceRank,
    h0KernelRank,
    h1CokernelRank,
    h0EqualsKernel: true as const,
    h1EqualsCokernel: true as const,
  });
}

export function treeCoordinationReceipt(verticesInput: number): TreeCoordinationReceipt {
  const vertices = assertNat("vertices", verticesInput);
  if (vertices === 0) throw new TypeError("treeCoordinationReceipt: a finite tree has at least one vertex");
  const edges = vertices - 1;
  const nerve = coverNerve(vertices, edges, 1);
  const h1 = h1Rank(nerve);
  if (h1 !== 0) throw new TypeError("treeCoordinationReceipt: tree H1 rank did not vanish");

  return Object.freeze({
    kind: "coordinationCohomology.tree:witness" as const,
    vertices,
    edges,
    nerve,
    edgeCountIdentity: true as const,
    h1Rank: 0 as const,
    coordinationFree: true as const,
  });
}

export function landauerEntropyReceipt(nerve: CoverNerveCarrier = coverNerve(3, 3, 1)): LandauerEntropyReceipt {
  const bits = landauerBits(nerve);
  const coordinationCost = nerve.cells - (nerve.entities - nerve.components);
  const zeroIffReversible = landauerZeroIffReversible(nerve);
  const equalsCoordinationCost = landauerEqualsCoordinationCost(nerve);
  const stochasticFace = detailedBalanceImpliesStationary(poissonKernel, ratStochSemiring, poissonPi);
  const reversibleIsLandauerFree = stochasticFace.detailedBalance && stochasticFace.rowsSumToOne && stochasticFace.stationary;

  if (!zeroIffReversible || !equalsCoordinationCost || !reversibleIsLandauerFree) {
    throw new TypeError("landauerEntropyReceipt: Landauer/cohomology reversibility laws failed");
  }

  return Object.freeze({
    kind: "coordinationCohomology.landauerEntropy:witness" as const,
    nerve,
    bits,
    coordinationCost,
    reversible: forestEquality(nerve),
    landauerFree: bits === 0,
    zeroIffReversible: true as const,
    equalsCoordinationCost: true as const,
    stochasticFace,
    reversibleIsLandauerFree: true as const,
    bitScale: "one-bit-per-first-cohomology-class" as const,
    physicalScaleBoundary: "exact bit count only; kT-ln2 thermodynamic scaling remains an interpretation boundary" as const,
  });
}

export function receipt(): CoordinationCohomologyReceipt {
  const cycle = coverNerve(3, 3, 1);
  const forest = coverNerve(4, 2, 2);
  return Object.freeze({
    kind: "coordinationCohomology.receipt:witness" as const,
    cycle: coordinationCostReceipt(cycle),
    forest: coordinationCostReceipt(forest),
    tree: treeCoordinationReceipt(5),
    laplacian: laplacianDualReceipt(cycle),
    landauer: landauerEntropyReceipt(cycle),
    openFrontier: Object.freeze([
      "General component counting from arbitrary graph reachability is still proof/kernel work; this carrier requires the union-find invariant.",
      "A nonzero H1 rank is a coordination-cost count, not a runtime proof that a concrete monotone global section is obstructed without a total order.",
      "Cech gluing existence is reused from finite settling cohomology; arbitrary cover sheaf proof objects remain Lean-side.",
      "Landauer entropy is reported as exact H1 bit count; physical kT ln2 scaling and entropy-production units remain outside this Node carrier.",
    ]),
  });
}
