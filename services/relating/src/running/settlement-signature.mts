/**
 * running/settlement-signature — derive an action's transport regime from its
 * codomain settlement-filtration read.
 *
 * The signature is not an authored action field. `induceBins` asks the codomain
 * schema for the finite witness needed to materialize a settlement filtration,
 * runs the shipped `readClassificationOfSettlementFiltration`, and only then
 * projects the small serializable transport signature.
 */
import {
  articulate,
  mark,
  utterance,
} from "../../lib/articulating/index.mjs";
import { predicate } from "../../lib/articulating/predicating/index.mjs";
import {
  countableSettlingCofinality,
  initialSettlingStageInput,
  limitSettlingStageInput,
  omegaOrdinal,
  readClassificationOfSettlementFiltration,
  settlementFiltration,
  settlingStageOrdinal,
  uncountableSettlingCofinality,
  type SettlingClassification,
} from "../../lib/articulating/predicating/positing/settling/index.mjs";
import type { JsonRecord } from "../codecs/text/json/core.mjs";
import type { Action } from "./action.mjs";

export type ActionSettlementRegime = "strict-finite" | "scott" | "transfinite-bounded" | "aperiodic";
export type ActionTransport = "request-response" | "event-stream" | "websocket-session";

export interface CodomainSettlementWitness {
  readonly kind: "relating.codomain.settlement-filtration";
  readonly limitStage?: boolean;
  readonly nonScottLimitFiring?: boolean;
  readonly cofinality?: "countable" | "uncountable";
}

export interface ActionSettlementSignature {
  readonly kind: "relating.action.settlement-signature";
  readonly regime: ActionSettlementRegime;
  readonly closureRegime: SettlingClassification["regime"]["kind"];
  readonly transport: ActionTransport;
  readonly finality: "normal-form" | "bounded-partial" | "subscription";
  readonly continuation: "none" | "last-event-id" | "websocket";
  readonly classification: {
    readonly kind: SettlingClassification["kind"];
    readonly cofinality: SettlingClassification["cofinality"]["kind"];
    readonly limitStages: number;
    readonly nonScottFirings: number;
  };
}

const WITNESS_KEY = "x-settlement-filtration";
const SETTLEMENT_FILTRATION_ID = "relating/articulating/predicating/positing/settling/filtration";

function naturalSize(value: { readonly members: readonly unknown[] }): number {
  return value.members.length;
}

function schemaRef(schema: JsonRecord | undefined): string | undefined {
  const ref = schema?.["$ref"];
  return typeof ref === "string" ? ref : undefined;
}

function isCodomainSettlementWitness(value: unknown): value is CodomainSettlementWitness {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record["kind"] === "relating.codomain.settlement-filtration";
}

export function codomainSettlementWitness(
  schema: JsonRecord | undefined,
): CodomainSettlementWitness {
  const authored = schema?.[WITNESS_KEY];
  if (isCodomainSettlementWitness(authored)) return authored;
  if (schemaRef(schema) === SETTLEMENT_FILTRATION_ID || schema?.["$id"] === SETTLEMENT_FILTRATION_ID) {
    return { kind: "relating.codomain.settlement-filtration", limitStage: true, nonScottLimitFiring: false, cofinality: "countable" };
  }
  return { kind: "relating.codomain.settlement-filtration", limitStage: false, nonScottLimitFiring: false, cofinality: "countable" };
}

function witnessCell(label: string) {
  return predicate(articulate(utterance(mark(["codomain", label]), mark("settles-as")))).cells.cells[0]!;
}

function classificationOfWitness(
  witness: CodomainSettlementWitness,
  label: string,
): SettlingClassification {
  const stages = [initialSettlingStageInput([])];
  if (witness.limitStage === true) {
    stages.push(limitSettlingStageInput(
      settlingStageOrdinal(omegaOrdinal()),
      witness.nonScottLimitFiring === true ? [witnessCell(label)] : [],
    ));
  }
  return readClassificationOfSettlementFiltration(settlementFiltration(
    stages,
    witness.cofinality === "uncountable" ? uncountableSettlingCofinality : countableSettlingCofinality,
  ));
}

function signatureRegime(kind: SettlingClassification["regime"]["kind"]): ActionSettlementRegime {
  switch (kind) {
    case "ordinal.closure.regime.finite":
      return "strict-finite";
    case "ordinal.closure.regime.scott":
      return "scott";
    case "ordinal.closure.regime.transfinite":
      return "transfinite-bounded";
    case "ordinal.closure.regime.aperiodic":
      return "aperiodic";
  }
}

function transportOf(regime: ActionSettlementRegime): Pick<ActionSettlementSignature, "transport" | "finality" | "continuation"> {
  switch (regime) {
    case "strict-finite":
      return { transport: "request-response", finality: "normal-form", continuation: "none" };
    case "scott":
    case "transfinite-bounded":
      return { transport: "event-stream", finality: "bounded-partial", continuation: "last-event-id" };
    case "aperiodic":
      return { transport: "websocket-session", finality: "subscription", continuation: "websocket" };
  }
}

export function actionSettlementSignature(action: Action): ActionSettlementSignature {
  const witness = codomainSettlementWitness(action.codomain?.schema);
  const classification = classificationOfWitness(witness, action.verb);
  const regime = signatureRegime(classification.regime.kind);
  return Object.freeze({
    kind: "relating.action.settlement-signature" as const,
    regime,
    closureRegime: classification.regime.kind,
    ...transportOf(regime),
    classification: Object.freeze({
      kind: classification.kind,
      cofinality: classification.cofinality.kind,
      limitStages: naturalSize(classification.limitStages.rank),
      nonScottFirings: naturalSize(classification.nonScottFirings.rank),
    }),
  });
}

export const codomainSettlementWitnessKey = WITNESS_KEY;
