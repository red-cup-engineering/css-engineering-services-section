// producing-content - the organizing reading of a farm cycle.
//
// A farm cycle is not merely an observation emitted by a computer. It is a
// small organization of property readings: each property contributes a section,
// and organizing glues those sections into the produced-content collective.

import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource, type JsonValue } from "@red-cup-engineering/relating/codecs";

import { isCultivationObstruction, type CultivationJudgment } from "./cultivate.mjs";

export type ProducingContentRunReading = Readonly<{
  kind: "producing-content.cycle.run-reading";
  property: string;
  status: "committed" | "withheld" | "obstructed";
}>;

export const ProducingContentRunReadingSchema = { additionalProperties: false, type: "object", required: ["kind", "property", "status"], properties: { kind: { const: "producing-content.cycle.run-reading" }, property: { minLength: 1, type: "string" }, status: { anyOf: [{ const: "committed" }, { const: "withheld" }, { const: "obstructed" }] } } } as const;

export const ProducingContentCycleSchema = { $id: "producing-content/content-farm/cycle", title: "ProducingContentCycle", additionalProperties: false, type: "object", required: ["kind", "identity", "ordinal", "propertyCount", "committed", "withheld", "obstructed", "readings", "organization", "projection", "constraints"], properties: { kind: { const: "producing-content.cycle" }, identity: { minLength: 1, type: "string" }, ordinal: { minLength: 1, type: "string" }, propertyCount: { type: "number" }, committed: { type: "number" }, withheld: { type: "number" }, obstructed: { type: "number" }, readings: { type: "array", items: ProducingContentRunReadingSchema }, organization: {}, projection: {}, constraints: { type: "array", items: { type: "string" } } } } as const;

export type ProducingContentCycle = FromSchema<typeof ProducingContentCycleSchema>;

export const producingContentCycleCarrier = carrierFrom(ProducingContentCycleSchema);

export type ProducingContentCycleInput = Readonly<{
  identity: string;
  ordinal: bigint;
  readings: readonly Readonly<{
    property: string;
    run: CultivationJudgment | Readonly<{ kind: "content.farm.run-obstruction"; property: string; reason: string }>;
  }>[];
  constraints?: readonly string[];
}>;

function runStatus(
  run: CultivationJudgment | Readonly<{ kind: "content.farm.run-obstruction"; property: string; reason: string }>,
): ProducingContentRunReading["status"] {
  if (run.kind === "content.farm.run-obstruction") return "obstructed";
  if (isCultivationObstruction(run)) return "withheld";
  return "committed";
}

export function producingContentCycle(input: ProducingContentCycleInput): ProducingContentCycle {
  const readings = input.readings.map((reading): ProducingContentRunReading => Object.freeze({
    kind: "producing-content.cycle.run-reading" as const,
    property: reading.property,
    status: runStatus(reading.run),
  }));
  const committed = readings.filter((reading) => reading.status === "committed").length;
  const withheld = readings.filter((reading) => reading.status === "withheld").length;
  const obstructed = readings.filter((reading) => reading.status === "obstructed").length;
  const organization = Object.freeze({
    kind: "producing-content.cycle.organization" as const,
    identity: input.identity,
    readings: [...readings],
  });
  const projection = Object.freeze({
    kind: "producing-content.cycle.projection" as const,
    identity: input.identity,
    propertyCount: readings.length,
    committed,
    withheld,
    obstructed,
  });
  return producingContentCycleCarrier.assert({
    kind: "producing-content.cycle" as const,
    identity: input.identity,
    ordinal: input.ordinal.toString(),
    propertyCount: readings.length,
    committed,
    withheld,
    obstructed,
    readings: [...readings],
    organization: jsonResource(organization, "producing content organization"),
    projection: jsonResource(projection, "producing content projection"),
    constraints: [...(input.constraints ?? [
      "A produced-content cycle preserves the full plurality of property run readings.",
      "Committed, withheld, and obstructed runs remain distinct rather than collapsing into a boolean pass/fail.",
    ])],
  }, "producing content cycle");
}

export function producingContentCycleTerm(input: ProducingContentCycle): Tm {
  return carrierToTerm(jsonResource(producingContentCycleCarrier.assert(input), "producing content cycle"));
}
