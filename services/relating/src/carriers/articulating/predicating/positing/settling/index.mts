import { kindCarrier } from "../../../../kind.mjs";
import type { JsonRecord } from "../../../../../codecs/text/json/core.mjs";

export const settlementFiltrationCarrier = kindCarrier(
  "relating/articulating/predicating/positing/settling/filtration",
  { const: "predication.settlement.filtration" },
  "SettlementFiltration",
  "A transfinite paraconsistent fixed-point settlement filtration.",
);

/** A settling-read codomain carrier, identified by the read invariant's kind. */
const settlingReadCarrier = <const Id extends string, const Kind extends JsonRecord>(id: Id, kind: Kind, title: string) =>
  kindCarrier(id, kind, title, `The ${title} read of a settlement filtration.`);

export const settlingClassificationCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/classification", { const: "predication.settling.classification" }, "SettlingClassification");
export const settlingStageOrdinalCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/stage-ordinal", { const: "predication.settling.stageOrdinal" }, "SettlingStageOrdinal");
export const settlingFiniteStageJudgmentCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/finite-stage-judgment", { enum: ["predication.settling.finiteStage:witness", "predication.settling.finiteStage-obstruction"] }, "SettlingFiniteStageJudgment");
export const settlingLimitStagesCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/limit-stages", { const: "predication.settling.limitStages" }, "SettlingLimitStages");
export const settlingNonScottFiringsCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/non-scott-firings", { const: "predication.settling.nonScottFirings" }, "NonScottSettlingFirings");
export const settlingFirstCohomologyCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/first-cohomology", { const: "predication.settling.firstCohomology" }, "SettlingFirstCohomology");
export const settlingGradedGapCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/graded-gap", { const: "predication.settling.gradedGap" }, "GradedGap");
export const settlingRankIdentityCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/rank-identity", { enum: ["predication.cohomology.rankIdentity:witness", "predication.cohomology.rankIdentity-obstruction"] }, "RankIdentityJudgment");
export const settlingClosureInvariantCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/closure-invariant", { const: "predication.settling.closureInvariant" }, "SettlingClosureInvariant");
