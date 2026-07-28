/**
 * @packageDocumentation
 *
 * ledger (RWIL) is the witness ledger as boundary-to-bulk holography — a first-class
 * capability peer to `writing`/`evaluating`/`running`, not a child of `running`. The
 * witness ROW codecs (EAVT/Datom/triple) live under
 * `@red-cup-engineering/relating/codecs/text/json/jsonl/eavt`; this is their projection
 * engine. Reached at `@red-cup-engineering/relating/ledger`.
 *
 * ```text
 * witness rows      append-only EAVT observations
 * state view        current view projected from the log
 * record/content    settled cuts derived by a service store
 * ```
 *
 * This is event sourcing in the package's own vocabulary. The log is the
 * write-model. State is the current read-model. Records are received
 * judgements about witnessed cells. Content is a cut of the same bulk into
 * ordinary documents.
 *
 * A caller authors one {@link Feed}: a feed name, a cellizer from observations
 * to EAVT rows, and the attributes whose latest witness should win. The
 * projection functions are pure folds over witnessed rows. Filesystem storage is
 * a service binding, not ledger law. The same witness log can also be projected
 * as resumable Server-Sent Events through {@link streamWitnessLog}. That split
 * is the product: agents and packages can share append-only traces while deriving
 * JSON state, records, content files, and live transport frames without inventing
 * separate persistence stories.
 */

export { cell, attributesOf, type Witness } from "./cells.mjs";
export { projectStateView, type EntityView, type StateView } from "./state.mjs";
export {
  markdownContent,
  projectContentDocuments,
  type ContentDocument,
  type ContentProjection,
} from "./content.mjs";
export { type Feed } from "./feed.mjs";
export {
  confine,
  readContentResource,
  listContentEntries,
  readContentTree,
  type ContentEntry,
} from "./store.mjs";
export { streamWitnessLog, EAVT_EVENT, feedResponse, type FeedResponse } from "./stream.mjs";
export {
  sameWitness,
  sameWitnessLog,
  cohere,
  cohereLog,
  assertCoherent,
  assertLogCoherent,
  readingAsLogReading,
  registerReading,
  registerLogReading,
  readingById,
  logReadingById,
  readings,
  logReadings,
  type ReadingDescriptor,
  type LogReadingDescriptor,
  type RWILWitness,
  type RWILWitnessLog,
  type Reading,
  type LogReading,
  type CoherenceReport,
  type LogCoherenceReport,
} from "./reading.mjs";
export {
  readingDescriptorSchema,
  readingDescriptorCarrier,
  logReadingDescriptorSchema,
  logReadingDescriptorCarrier,
  coherenceReportSchema,
  coherenceReportCarrier,
  logCoherenceReportSchema,
  logCoherenceReportCarrier,
} from "../carriers/ledger/reading.mjs";
export * from "./provenance.mjs";
export * from "./time-anchor.mjs";
export * from "./memento.mjs";
