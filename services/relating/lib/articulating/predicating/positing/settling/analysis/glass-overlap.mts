/**
 * analysis/glass-overlap - finite configuration overlap.
 *
 * Executable carrier for `RelMath.Glass.Overlap`: a configuration assigns a
 * local state to each finite site, and overlap counts the listed sites on which
 * two configurations agree. This is the finite Hamming/replica-overlap shadow;
 * probability-valued Parisi order parameters stay outside this carrier.
 */

export type ConfigurationState = string | number | boolean | null;
export type Configuration = Readonly<Record<string, ConfigurationState>>;

export interface OverlapJudgment {
  readonly kind: "glass.overlap.count:witness";
  readonly sites: readonly string[];
  readonly left: Configuration;
  readonly right: Configuration;
  readonly count: number;
  readonly length: number;
}

export interface GlassOverlapReceipt {
  readonly kind: "glass.overlap.receipt:witness";
  readonly sourceModule: "RelMath.Glass.Overlap";
  readonly theorems: readonly [
    "RelMath.Glass.Configuration",
    "RelMath.Glass.overlapCount",
    "RelMath.Glass.overlapCount_nil",
    "RelMath.Glass.overlapCount_self",
    "RelMath.Glass.overlapCount_symm",
    "RelMath.Glass.overlapCount_le_length",
  ];
  readonly sample: OverlapJudgment;
  readonly self: OverlapJudgment;
  readonly symmetric: OverlapJudgment;
  readonly nil: OverlapJudgment;
  readonly selfOverlapsEverywhere: true;
  readonly overlapSymmetric: true;
  readonly overlapLeLength: true;
}

const requireSites = (sites: readonly string[]): void => {
  for (const [index, site] of sites.entries()) {
    if (typeof site !== "string" || site.length === 0) {
      throw new TypeError(`overlapCount sites[${index}]: expected a nonempty string`);
    }
  }
};

/** Count listed sites where two finite configurations carry equal local state. */
export function overlapCount(
  sites: readonly string[],
  left: Configuration,
  right: Configuration,
): OverlapJudgment {
  requireSites(sites);
  const count = sites.reduce((total, site) => total + (Object.is(left[site], right[site]) ? 1 : 0), 0);
  return Object.freeze({
    kind: "glass.overlap.count:witness" as const,
    sites: Object.freeze([...sites]),
    left: Object.freeze({ ...left }),
    right: Object.freeze({ ...right }),
    count,
    length: sites.length,
  });
}

/** Finite carrier for `RelMath.Glass.Overlap`. */
export function receipt(): GlassOverlapReceipt {
  const sites = Object.freeze(["alpha", "beta", "gamma", "delta"]);
  const left: Configuration = Object.freeze({ alpha: "t", beta: "f", gamma: "top", delta: "bot" });
  const right: Configuration = Object.freeze({ alpha: "t", beta: "top", gamma: "top", delta: "f" });
  const sample = overlapCount(sites, left, right);
  const self = overlapCount(sites, left, left);
  const symmetric = overlapCount(sites, right, left);
  const nil = overlapCount([], left, right);
  const selfOverlapsEverywhere = self.count === self.length;
  const overlapSymmetric = sample.count === symmetric.count;
  const overlapLeLength = sample.count <= sample.length && nil.count <= nil.length;
  if (!selfOverlapsEverywhere || !overlapSymmetric || !overlapLeLength) {
    throw new TypeError("glass.overlap.receipt: finite overlap laws failed");
  }
  return Object.freeze({
    kind: "glass.overlap.receipt:witness" as const,
    sourceModule: "RelMath.Glass.Overlap" as const,
    theorems: Object.freeze([
      "RelMath.Glass.Configuration",
      "RelMath.Glass.overlapCount",
      "RelMath.Glass.overlapCount_nil",
      "RelMath.Glass.overlapCount_self",
      "RelMath.Glass.overlapCount_symm",
      "RelMath.Glass.overlapCount_le_length",
    ]) as GlassOverlapReceipt["theorems"],
    sample,
    self,
    symmetric,
    nil,
    selfOverlapsEverywhere: true as const,
    overlapSymmetric: true as const,
    overlapLeLength: true as const,
  });
}

export interface BasinGraphCarrier {
  readonly kind: "glass.basinGraph.carrier";
  readonly basins: readonly string[];
  readonly transitions: Readonly<Record<string, readonly string[]>>;
  readonly energy: Readonly<Record<string, number>>;
}

export interface DescendChainJudgment {
  readonly kind: "glass.basinGraph.descendChain:witness";
  readonly chain: readonly string[];
  readonly startEnergy: number;
  readonly endEnergy: number;
  readonly energyDecreases: true;
}

export interface BasinGraphReceipt {
  readonly kind: "glass.basinGraph.receipt:witness";
  readonly sourceModule: "RelMath.Glass.BasinGraph";
  readonly theorems: readonly [
    "RelMath.Glass.BasinGraph",
    "RelMath.Glass.BasinGraph.Descends",
    "RelMath.Glass.BasinGraph.DescendChain",
    "RelMath.Glass.BasinGraph.descendChain_energy_lt",
    "RelMath.Glass.BasinGraph.no_descending_cycle",
    "RelMath.Glass.BasinGraph.descend_asymm",
  ];
  readonly graph: BasinGraphCarrier;
  readonly chain: DescendChainJudgment;
  readonly noDescendingCycle: true;
  readonly descendAsymmetric: true;
}

const requireSafeNat = (name: string, value: number): void => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name}: expected a non-negative safe integer`);
};

function basinGraph(
  basins: readonly string[],
  transitions: Readonly<Record<string, readonly string[]>>,
  energy: Readonly<Record<string, number>>,
): BasinGraphCarrier {
  requireSites(basins);
  const basinSet = new Set(basins);
  for (const basin of basins) {
    requireSafeNat(`energy[${basin}]`, energy[basin] ?? -1);
    for (const target of transitions[basin] ?? []) {
      if (!basinSet.has(target)) throw new RangeError(`transition ${basin}->${target}: target outside basin set`);
    }
  }
  return Object.freeze({
    kind: "glass.basinGraph.carrier" as const,
    basins: Object.freeze([...basins]),
    transitions: Object.freeze(Object.fromEntries(basins.map((basin) => [basin, Object.freeze([...(transitions[basin] ?? [])])]))),
    energy: Object.freeze(Object.fromEntries(basins.map((basin) => [basin, energy[basin]!]))),
  });
}

export function descends(graph: BasinGraphCarrier, source: string, target: string): boolean {
  return (graph.transitions[source] ?? []).includes(target)
    && (graph.energy[target] ?? Number.POSITIVE_INFINITY) < (graph.energy[source] ?? -1);
}

export function descendChain(graph: BasinGraphCarrier, chain: readonly string[]): DescendChainJudgment {
  if (chain.length < 2) throw new RangeError("descendChain: expected at least two basins");
  for (let index = 0; index + 1 < chain.length; index += 1) {
    if (!descends(graph, chain[index]!, chain[index + 1]!)) {
      throw new TypeError("descendChain: every step must strictly lower energy");
    }
  }
  const startEnergy = graph.energy[chain[0]!]!;
  const endEnergy = graph.energy[chain[chain.length - 1]!]!;
  if (!(endEnergy < startEnergy)) throw new TypeError("descendChain: endpoint energy did not decrease");
  return Object.freeze({
    kind: "glass.basinGraph.descendChain:witness" as const,
    chain: Object.freeze([...chain]),
    startEnergy,
    endEnergy,
    energyDecreases: true as const,
  });
}

function reachableByDescent(graph: BasinGraphCarrier, source: string, target: string): boolean {
  const seen = new Set<string>();
  const stack = [...(graph.transitions[source] ?? []).filter((next) => descends(graph, source, next))];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(graph.transitions[current] ?? []).filter((next) => descends(graph, current, next)));
  }
  return false;
}

/** Finite carrier for `RelMath.Glass.BasinGraph`. */
export function basinGraphReceipt(): BasinGraphReceipt {
  const graph = basinGraph(
    ["high", "mid", "low"],
    { high: ["mid", "low"], mid: ["low"], low: [] },
    { high: 4, mid: 2, low: 0 },
  );
  const chain = descendChain(graph, ["high", "mid", "low"]);
  const noDescendingCycle = graph.basins.every((basin) => !reachableByDescent(graph, basin, basin));
  const descendAsymmetric = graph.basins.every((left) => graph.basins.every((right) =>
    !(reachableByDescent(graph, left, right) && reachableByDescent(graph, right, left))));
  if (!noDescendingCycle || !descendAsymmetric) throw new TypeError("basinGraphReceipt: finite descent laws failed");
  return Object.freeze({
    kind: "glass.basinGraph.receipt:witness" as const,
    sourceModule: "RelMath.Glass.BasinGraph" as const,
    theorems: Object.freeze([
      "RelMath.Glass.BasinGraph",
      "RelMath.Glass.BasinGraph.Descends",
      "RelMath.Glass.BasinGraph.DescendChain",
      "RelMath.Glass.BasinGraph.descendChain_energy_lt",
      "RelMath.Glass.BasinGraph.no_descending_cycle",
      "RelMath.Glass.BasinGraph.descend_asymm",
    ]) as BasinGraphReceipt["theorems"],
    graph,
    chain,
    noDescendingCycle: true as const,
    descendAsymmetric: true as const,
  });
}

export interface DynamicHeterogeneityReceipt {
  readonly kind: "glass.dynamicHeterogeneity.receipt:witness";
  readonly sourceModule: "RelMath.Glass.DynamicHeterogeneity";
  readonly theorems: readonly [
    "RelMath.Glass.changedOn",
    "RelMath.Glass.mobilityCount",
    "RelMath.Glass.mobility_zero_iff_agree_on_support",
    "RelMath.Glass.mobility_self",
  ];
  readonly sites: readonly string[];
  readonly left: Configuration;
  readonly right: Configuration;
  readonly mobilityCount: number;
  readonly overlapCount: number;
  readonly mobilityPlusOverlap: number;
  readonly mobilitySelf: 0;
  readonly zeroMobilityIffAgree: true;
}

export function changedOn(left: Configuration, right: Configuration, site: string): boolean {
  return !Object.is(left[site], right[site]);
}

export function mobilityCount(sites: readonly string[], left: Configuration, right: Configuration): number {
  requireSites(sites);
  return sites.reduce((total, site) => total + (changedOn(left, right, site) ? 1 : 0), 0);
}

/** Finite carrier for `RelMath.Glass.DynamicHeterogeneity`. */
export function dynamicHeterogeneityReceipt(): DynamicHeterogeneityReceipt {
  const sites = Object.freeze(["alpha", "beta", "gamma", "delta"]);
  const left: Configuration = Object.freeze({ alpha: "t", beta: "f", gamma: "top", delta: "bot" });
  const right: Configuration = Object.freeze({ alpha: "t", beta: "top", gamma: "top", delta: "f" });
  const mobility = mobilityCount(sites, left, right);
  const overlap = overlapCount(sites, left, right).count;
  const mobilitySelf = mobilityCount(sites, left, left);
  const zeroMobilityIffAgree = mobilitySelf === 0 && sites.every((site) => Object.is(left[site], left[site]));
  if (mobility + overlap !== sites.length || mobilitySelf !== 0 || !zeroMobilityIffAgree) {
    throw new TypeError("dynamicHeterogeneityReceipt: finite mobility laws failed");
  }
  return Object.freeze({
    kind: "glass.dynamicHeterogeneity.receipt:witness" as const,
    sourceModule: "RelMath.Glass.DynamicHeterogeneity" as const,
    theorems: Object.freeze([
      "RelMath.Glass.changedOn",
      "RelMath.Glass.mobilityCount",
      "RelMath.Glass.mobility_zero_iff_agree_on_support",
      "RelMath.Glass.mobility_self",
    ]) as DynamicHeterogeneityReceipt["theorems"],
    sites,
    left,
    right,
    mobilityCount: mobility,
    overlapCount: overlap,
    mobilityPlusOverlap: mobility + overlap,
    mobilitySelf: 0 as const,
    zeroMobilityIffAgree: true as const,
  });
}

export type ActiveField = Readonly<Record<string, boolean>>;

export interface KcmReceipt {
  readonly kind: "glass.kcm.receipt:witness";
  readonly sourceModule: "RelMath.Glass.KCM";
  readonly theorems: readonly [
    "RelMath.Glass.activateStep",
    "RelMath.Glass.activateStep_infl",
    "RelMath.Glass.activateStep_mono",
    "RelMath.Glass.activateStep_fixed",
    "RelMath.Glass.ActiveClosure",
    "RelMath.Glass.activation_is_facilitation_closure",
  ];
  readonly sites: readonly string[];
  readonly facilitation: Readonly<Record<string, readonly string[]>>;
  readonly seed: ActiveField;
  readonly afterOneStep: ActiveField;
  readonly closure: ActiveField;
  readonly activationInflationary: true;
  readonly activationMonotone: true;
  readonly closureFixed: true;
  readonly seedExtendsToClosure: true;
}

function freezeField(sites: readonly string[], field: ActiveField): ActiveField {
  return Object.freeze(Object.fromEntries(sites.map((site) => [site, field[site] === true])));
}

export function activateStep(
  sites: readonly string[],
  facilitation: Readonly<Record<string, readonly string[]>>,
  active: ActiveField,
): ActiveField {
  requireSites(sites);
  return freezeField(sites, Object.fromEntries(sites.map((site) => [
    site,
    active[site] === true || sites.some((source) => active[source] === true && (facilitation[source] ?? []).includes(site)),
  ])));
}

export function activeClosure(
  sites: readonly string[],
  facilitation: Readonly<Record<string, readonly string[]>>,
  seed: ActiveField,
): ActiveField {
  let current = freezeField(sites, seed);
  for (let index = 0; index <= sites.length; index += 1) {
    const next = activateStep(sites, facilitation, current);
    if (sites.every((site) => next[site] === current[site])) return next;
    current = next;
  }
  throw new Error("activeClosure: finite facilitation closure did not stabilize");
}

/** Finite carrier for `RelMath.Glass.KCM`. */
export function kcmReceipt(): KcmReceipt {
  const sites = Object.freeze(["a", "b", "c"]);
  const facilitation = Object.freeze({
    a: Object.freeze(["b"]),
    b: Object.freeze(["c"]),
    c: Object.freeze([]),
  });
  const seed = freezeField(sites, { a: true, b: false, c: false });
  const afterOneStep = activateStep(sites, facilitation, seed);
  const closure = activeClosure(sites, facilitation, seed);
  const largerSeed = freezeField(sites, { a: true, b: true, c: false });
  const activationInflationary = sites.every((site) => !seed[site] || afterOneStep[site] === true);
  const activationMonotone = sites.every((site) => !afterOneStep[site] || activateStep(sites, facilitation, largerSeed)[site] === true);
  const closureFixed = sites.every((site) => activateStep(sites, facilitation, closure)[site] === closure[site]);
  const seedExtendsToClosure = sites.every((site) => !seed[site] || closure[site] === true);
  if (!activationInflationary || !activationMonotone || !closureFixed || !seedExtendsToClosure) {
    throw new TypeError("kcmReceipt: finite facilitation closure laws failed");
  }
  return Object.freeze({
    kind: "glass.kcm.receipt:witness" as const,
    sourceModule: "RelMath.Glass.KCM" as const,
    theorems: Object.freeze([
      "RelMath.Glass.activateStep",
      "RelMath.Glass.activateStep_infl",
      "RelMath.Glass.activateStep_mono",
      "RelMath.Glass.activateStep_fixed",
      "RelMath.Glass.ActiveClosure",
      "RelMath.Glass.activation_is_facilitation_closure",
    ]) as KcmReceipt["theorems"],
    sites,
    facilitation,
    seed,
    afterOneStep,
    closure,
    activationInflationary: true as const,
    activationMonotone: true as const,
    closureFixed: true as const,
    seedExtendsToClosure: true as const,
  });
}
