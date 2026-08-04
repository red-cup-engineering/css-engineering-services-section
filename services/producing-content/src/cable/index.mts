// producing-content/cable — the wire and the cable, web-free.
//
// Vocabulary, in the literal electrical sense: a NEWSWIRE is a discrete thing
// with its own data — a provenanced claim stream with a masthead, owning its
// store, its item projection, its surfaces, and its production kit. A NEWSCABLE
// is a NEW thing whose data IS newswires — a bundle of wires the way a cable is
// a bundle of wires, adding only the sheath: the routing inversion, the index,
// /cable.json, robots, and sitemap. Claim-state bundles are the canonical
// resources throughout; HTML and feeds are lossy projections, and no projection
// displays a claim stronger than its force.
//
// This is the FORMING + STORE + PRODUCTION KIT, all web-free: the surface
// strings come from @red-cup-engineering/content's pure feed codecs, and the HTML document
// shell is an injected `render` (the cable topology — routing, /cable.json — is
// @red-cup-engineering/content/topology/news). HTTP transport (mounting `cable.handle` on a
// listener) is the site's affair; filum supplies the renderer and the App.

export {
  addDays,
  assertedNow,
  computesClaim,
  createNewswire,
  htmlPage,
  loadWireBundles,
  newswireDescription,
  newswireDescriptionCarrier,
  newswireDescriptionTerm,
  readBundleFile,
  reportWrite,
  resolveDate,
  NewswireDescriptionSchema,
  WireSurfaceUrlsSchema,
  wireSurfaceUrls,
  wireSurfaceUrlsCarrier,
  wireSurfaceUrlsTerm,
  writeBundleIfAbsent,
  type ComputedClaimInput,
  type Newswire,
  type NewswireAuthor,
  type NewswireDefinition,
  type NewswireDescription,
  type NewswireOptions,
  type RenderDocument,
  type RenderLink,
  type StoredBundle,
  type WireCorrection,
  type WireSurface,
  type WireSurfaceUrls,
  type WriteOutcome,
} from "./wire.mjs";

export {
  CableDirectorySchema,
  cableDirectory,
  cableDirectoryCarrier,
  cableDirectoryTerm,
  createNewscable,
  type CableDirectory,
  type Newscable,
  type NewscableOptions,
} from "./cable.mjs";

export {
  DEFAULT_WIRE_STORE,
  CableRoutingSchema,
  NEWSCABLE_CONFIG_BLOCK,
  NewscableSiteConfigSchema,
  NewswireAuthorSchema,
  NewswireConfigSchema,
  assertNewscableBlock,
  assertNewswireBlock,
  aggregateWires,
  newscableSiteConfig,
  newscableSiteConfigCarrier,
  newscableSiteConfigTerm,
  newswireConfig,
  newswireConfigCarrier,
  newswireConfigTerm,
  readNewscableSiteConfig,
  type NewscableSiteConfig,
  type NewscableSiteConfigCarrier,
  type NewswireAuthorCarrier,
  type NewswireBlock,
  type NewswireConfig,
  type NewswireConfigCarrier,
} from "./discovery.mjs";

export {
  auditOf,
  claimLine,
  freshnessOf,
  itemSummary,
  itemTitle,
  projectItem,
  propositionText,
  publishedOf,
  sortReverseChronological,
  updatedOf,
  type WireAuditEntry,
  type WireItem,
} from "./projection.mjs";

export {
  ingestWire,
  ingestCableFromConfig,
  type IngestResult,
} from "./ingest.mjs";

export {
  SourceRollSchema,
  SourceRollSourceSchema,
  SourceRollWireSchema,
  sourceRollCarrier,
  sourceRollReading,
  sourceRollSource,
  sourceRollSourceCarrier,
  sourceRollSourceTerm,
  sourceRollTerm,
  sourceRollWire,
  sourceRollWireCarrier,
  sourceRollWireTerm,
  type SourceRollClassification,
  type SourceRollClassifier,
  type SourceRollOptions,
  type SourceRollReading,
  type SourceRollSource,
  type SourceRollWire,
} from "./source-roll.mjs";
