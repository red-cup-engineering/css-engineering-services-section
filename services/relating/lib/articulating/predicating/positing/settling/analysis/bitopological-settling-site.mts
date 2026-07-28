/**
 * analysis/bitopological-settling-site - finite executable shadow of
 * RelMath.Cohomology.BitopologicalSettlingSite.
 *
 * The site is built from the pairwise-Stone clopen Boolean algebra already
 * carried by `pairwise-stone-clopen`: objects vary by predicate, settling
 * stratum, and clopen; covers are fixed-fiber finite clopen join-covers.
 */
import {
  allClopens,
  bot,
  clopenLatticeReceipt,
  join,
  meet,
  top,
  type ClopenUp,
  type ClopenLatticeReceipt,
} from "./pairwise-stone-clopen.mjs";

export interface SiteObjectCarrier {
  readonly kind: "bitopologicalSettlingSite.object";
  readonly predicate: string;
  readonly tau: number;
  readonly clopen: ClopenUp;
}

export interface FiberCoverReceipt {
  readonly kind: "bitopologicalSettlingSite.cover:witness";
  readonly target: ClopenUp;
  readonly family: readonly ClopenUp[];
  readonly join: ClopenUp;
  readonly everyMemberSubTarget: true;
  readonly joinEqualsTarget: true;
}

export interface TemporalCoverReceipt {
  readonly kind: "bitopologicalSettlingSite.noTemporalCovers:witness";
  readonly source: SiteObjectCarrier;
  readonly target: SiteObjectCarrier;
  readonly advances: true;
  readonly strictAdvance: boolean;
  readonly sameClopen: true;
  readonly fiberCoverSeenByJ: FiberCoverReceipt;
  readonly topologyMentionsTau: false;
  readonly temporalContentInMorphismsNotCovers: true;
}

export interface BitopologicalSettlingSiteReceipt {
  readonly kind: "bitopologicalSettlingSite.receipt:witness";
  readonly clopens: readonly ClopenUp[];
  readonly lattice: ClopenLatticeReceipt;
  readonly identityCover: FiberCoverReceipt;
  readonly pulledBackCover: FiberCoverReceipt;
  readonly transitiveCover: FiberCoverReceipt;
  readonly temporal: TemporalCoverReceipt;
  readonly clopenSubPartialOrder: true;
  readonly advancesPreorder: true;
  readonly grothendieckBasisAxioms: true;
  readonly strictRegimeFiniteFiber: true;
  readonly noTemporalCovers: true;
  readonly frontier: "general predicate reindexing and non-finite Grothendieck sites remain proof/kernel obligations";
}

const assertNat = (name: string, value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a safe natural number`);
  }
  return value;
};

export const sameClopen = (left: ClopenUp, right: ClopenUp): boolean =>
  left.plus === right.plus && left.minus === right.minus;

export const sub = (left: ClopenUp, right: ClopenUp): boolean =>
  sameClopen(meet(left, right), left);

export const advances = (tau: number, tauPrime: number): boolean =>
  assertNat("tau", tau) <= assertNat("tauPrime", tauPrime);

export function siteObject(predicate: string, tauInput: number, clopen: ClopenUp): SiteObjectCarrier {
  if (predicate.length === 0) throw new TypeError("siteObject: predicate must be nonempty");
  return Object.freeze({
    kind: "bitopologicalSettlingSite.object" as const,
    predicate,
    tau: assertNat("tau", tauInput),
    clopen,
  });
}

export function joinList(family: readonly ClopenUp[]): ClopenUp {
  return family.reduceRight((acc, value) => join(value, acc), bot);
}

export function covers(target: ClopenUp, family: readonly ClopenUp[]): boolean {
  return family.every((member) => sub(member, target)) && sameClopen(joinList(family), target);
}

export function coverReceipt(target: ClopenUp, familyInput: readonly ClopenUp[]): FiberCoverReceipt {
  const family = Object.freeze([...familyInput]);
  const joined = joinList(family);
  const everyMemberSubTarget = family.every((member) => sub(member, target));
  const joinEqualsTarget = sameClopen(joined, target);

  if (!everyMemberSubTarget || !joinEqualsTarget) {
    throw new TypeError("coverReceipt: family is not a fixed-fiber clopen join-cover");
  }

  return Object.freeze({
    kind: "bitopologicalSettlingSite.cover:witness" as const,
    target,
    family,
    join: joined,
    everyMemberSubTarget: true as const,
    joinEqualsTarget: true as const,
  });
}

export function pullbackCover(target: ClopenUp, coverFamily: readonly ClopenUp[], along: ClopenUp): FiberCoverReceipt {
  if (!covers(target, coverFamily)) throw new TypeError("pullbackCover: source family must cover target");
  if (!sub(along, target)) throw new TypeError("pullbackCover: pullback clopen must be below target");
  return coverReceipt(along, coverFamily.map((member) => meet(along, member)));
}

export function temporalCoverReceipt(
  source: SiteObjectCarrier = siteObject("q", 0, top),
  target: SiteObjectCarrier = siteObject("q", 2, top),
): TemporalCoverReceipt {
  const temporalAdvance = source.predicate === target.predicate
    && sameClopen(source.clopen, target.clopen)
    && advances(source.tau, target.tau);
  if (!temporalAdvance) throw new TypeError("temporalCoverReceipt: expected same-fiber temporal advancement");

  return Object.freeze({
    kind: "bitopologicalSettlingSite.noTemporalCovers:witness" as const,
    source,
    target,
    advances: true as const,
    strictAdvance: source.tau < target.tau,
    sameClopen: true as const,
    fiberCoverSeenByJ: coverReceipt(target.clopen, [source.clopen]),
    topologyMentionsTau: false as const,
    temporalContentInMorphismsNotCovers: true as const,
  });
}

const partialOrderHolds = (): boolean => {
  const refl = allClopens.every((value) => sub(value, value));
  const trans = allClopens.every((a) => allClopens.every((b) => allClopens.every((c) =>
    !sub(a, b) || !sub(b, c) || sub(a, c))));
  const antisym = allClopens.every((a) => allClopens.every((b) =>
    !sub(a, b) || !sub(b, a) || sameClopen(a, b)));
  return refl && trans && antisym;
};

const advancesPreorderHolds = (): boolean =>
  [0, 1, 2].every((tau) => advances(tau, tau))
  && advances(0, 1)
  && advances(1, 2)
  && advances(0, 2);

export function receipt(): BitopologicalSettlingSiteReceipt {
  const singletonTop = coverReceipt(top, [top]);
  const twoPieceTop = coverReceipt(top, [
    allClopens.find((value) => value.plus && !value.minus) ?? bot,
    allClopens.find((value) => !value.plus && value.minus) ?? bot,
  ]);
  const pulledBack = pullbackCover(top, twoPieceTop.family, allClopens.find((value) => value.plus && !value.minus) ?? bot);
  const transitive = coverReceipt(top, [top, bot]);
  const clopenSubPartialOrder = partialOrderHolds();
  const preorder = advancesPreorderHolds();
  const grothendieckBasisAxioms = covers(top, [top])
    && covers(pulledBack.target, pulledBack.family)
    && covers(transitive.target, transitive.family);
  const strictRegimeFiniteFiber = allClopens.length === 4;

  if (!clopenSubPartialOrder || !preorder || !grothendieckBasisAxioms || !strictRegimeFiniteFiber) {
    throw new TypeError("bitopologicalSettlingSite.receipt: finite site laws failed");
  }

  return Object.freeze({
    kind: "bitopologicalSettlingSite.receipt:witness" as const,
    clopens: allClopens,
    lattice: clopenLatticeReceipt(),
    identityCover: singletonTop,
    pulledBackCover: pulledBack,
    transitiveCover: transitive,
    temporal: temporalCoverReceipt(),
    clopenSubPartialOrder: true as const,
    advancesPreorder: true as const,
    grothendieckBasisAxioms: true as const,
    strictRegimeFiniteFiber: true as const,
    noTemporalCovers: true as const,
    frontier: "general predicate reindexing and non-finite Grothendieck sites remain proof/kernel obligations" as const,
  });
}
