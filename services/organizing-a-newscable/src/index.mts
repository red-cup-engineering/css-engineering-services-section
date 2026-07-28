/**
 * @red-cup-engineering/organizing-a-newscable
 *
 * A newscable bundles newswires. It owns the sheath: routing inversion, cable
 * directory, cable index, ingest, and source-roll readings over configured
 * wires.
 */
import { carrierFrom, carrierToTerm, type FromSchema, type Tm } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";
import type { Newscable, NewscableSiteConfig } from "@red-cup-engineering/producing-content/cable";

export {
  DEFAULT_WIRE_STORE,
  CableRoutingSchema,
  NEWSCABLE_CONFIG_BLOCK,
  NewscableSiteConfigSchema,
  NewswireDescriptionSchema,
  NewswireAuthorSchema,
  NewswireConfigSchema,
  SourceRollSchema,
  SourceRollSourceSchema,
  SourceRollWireSchema,
  aggregateWires,
  assertNewscableBlock,
  assertNewswireBlock,
  CableDirectorySchema,
  cableDirectory,
  cableDirectoryCarrier,
  cableDirectoryTerm,
  createNewscable,
  ingestCableFromConfig,
  ingestWire,
  newscableSiteConfig,
  newscableSiteConfigCarrier,
  newscableSiteConfigTerm,
  newswireDescription,
  newswireDescriptionCarrier,
  newswireDescriptionTerm,
  newswireConfig,
  newswireConfigCarrier,
  newswireConfigTerm,
  readNewscableSiteConfig,
  sourceRollCarrier,
  sourceRollReading,
  sourceRollSource,
  sourceRollSourceCarrier,
  sourceRollSourceTerm,
  sourceRollTerm,
  sourceRollWire,
  sourceRollWireCarrier,
  sourceRollWireTerm,
  WireSurfaceUrlsSchema,
  wireSurfaceUrls,
  wireSurfaceUrlsCarrier,
  wireSurfaceUrlsTerm,
  type CableDirectory,
  type IngestResult,
  type Newscable,
  type NewscableOptions,
  type NewscableSiteConfig,
  type NewscableSiteConfigCarrier,
  type NewswireAuthorCarrier,
  type NewswireBlock,
  type NewswireConfig,
  type NewswireConfigCarrier,
  type RenderDocument,
  type SourceRollClassification,
  type SourceRollClassifier,
  type SourceRollOptions,
  type SourceRollReading,
  type SourceRollSource,
  type SourceRollWire,
} from "@red-cup-engineering/producing-content/cable";
export {
  producingNewswire,
  producingNewswireCarrier,
  producingNewswireTerm,
  type ProducingNewswire,
} from "@red-cup-engineering/organizing-a-newswire";

export const OrganizedNewscableSchema = {
  $id: "organizing/newscable",
  title: "OrganizedNewscable",
  type: "object",
  required: ["kind", "name", "title", "domain", "wireCount", "itemCount"],
  properties: {
    kind: { const: "organizing.newscable" },
    name: { minLength: 1, type: "string" },
    title: { minLength: 1, type: "string" },
    domain: { minLength: 1, type: "string" },
    wireCount: { minimum: 0, type: "integer" },
    itemCount: { minimum: 0, type: "integer" },
  },
  additionalProperties: false,
} as const;

export type OrganizedNewscable = FromSchema<typeof OrganizedNewscableSchema>;

export const organizedNewscableCarrier = carrierFrom(OrganizedNewscableSchema);

export function organizedNewscable(input: Readonly<{
  config: NewscableSiteConfig;
  cable: Newscable;
}>): OrganizedNewscable {
  return organizedNewscableCarrier.assert({
    kind: "organizing.newscable" as const,
    name: input.config.name,
    title: input.config.title,
    domain: input.config.domain,
    wireCount: input.cable.wires.length,
    itemCount: input.cable.wires.reduce((total, wire) => total + wire.items.length, 0),
  }, "organized newscable");
}

export function organizedNewscableTerm(input: OrganizedNewscable): Tm {
  return carrierToTerm(jsonResource(organizedNewscableCarrier.assert(input), "organized newscable"));
}
