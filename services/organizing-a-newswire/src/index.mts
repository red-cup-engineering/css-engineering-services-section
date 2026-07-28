/**
 * @red-cup-engineering/organizing-a-newswire
 *
 * A newswire is one provenanced claim stream. It owns wire-local bundle state,
 * item projection, production writes, and web-free wire surfaces.
 */
import { carrierFrom, carrierToTerm, type FromSchema, type Tm } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";
import type { Newswire, NewswireConfig } from "@red-cup-engineering/producing-content/cable";

export {
  addDays,
  assertedNow,
  auditOf,
  claimLine,
  computesClaim,
  createNewswire,
  freshnessOf,
  htmlPage,
  itemSummary,
  itemTitle,
  loadWireBundles,
  newswireDescription,
  newswireDescriptionCarrier,
  newswireDescriptionTerm,
  NewswireDescriptionSchema,
  projectItem,
  propositionText,
  publishedOf,
  readBundleFile,
  reportWrite,
  resolveDate,
  sortReverseChronological,
  updatedOf,
  WireSurfaceUrlsSchema,
  wireSurfaceUrls,
  wireSurfaceUrlsCarrier,
  wireSurfaceUrlsTerm,
  writeBundleIfAbsent,
  type ComputedClaimInput,
  type NewscableSiteConfig,
  type Newswire,
  type NewswireAuthor,
  type NewswireBlock,
  type NewswireConfig,
  type NewswireDefinition,
  type NewswireDescription,
  type NewswireOptions,
  type RenderDocument,
  type RenderLink,
  type StoredBundle,
  type WireAuditEntry,
  type WireCorrection,
  type WireItem,
  type WireSurface,
  type WireSurfaceUrls,
  type WriteOutcome,
} from "@red-cup-engineering/producing-content/cable";

export const ProducingNewswireSchema = {
  $id: "producing/newswire",
  title: "ProducingNewswire",
  type: "object",
  required: ["kind", "name", "title", "store", "authorName", "itemCount"],
  properties: {
    kind: { const: "producing.newswire" },
    name: { minLength: 1, type: "string" },
    title: { minLength: 1, type: "string" },
    store: { minLength: 1, type: "string" },
    authorName: { minLength: 1, type: "string" },
    itemCount: { minimum: 0, type: "integer" },
  },
  additionalProperties: false,
} as const;

export type ProducingNewswire = FromSchema<typeof ProducingNewswireSchema>;

export const producingNewswireCarrier = carrierFrom(ProducingNewswireSchema);

function authorName(config: NewswireConfig): string {
  if (typeof config.author === "string") return config.author;
  if (config.author !== undefined) return config.author.name;
  return config.title;
}

export function producingNewswire(input: Readonly<{
  config: NewswireConfig;
  wire: Newswire;
}>): ProducingNewswire {
  return producingNewswireCarrier.assert({
    kind: "producing.newswire" as const,
    name: input.config.name,
    title: input.config.title,
    store: input.config.store,
    authorName: authorName(input.config),
    itemCount: input.wire.items.length,
  }, "producing newswire");
}

export function producingNewswireTerm(input: ProducingNewswire): Tm {
  return carrierToTerm(jsonResource(producingNewswireCarrier.assert(input), "producing newswire"));
}
