// @red-cup-engineering/relating ledger/reading — compatibility shim.
//
// The coherence kernel that used to live here has split by capability, per the
// jargon ruling ("the coherence computation and the wire-form check are
// different capabilities"):
//   - the generic wire-form round-trip check (Reading<Wire>/LogReading<Wire>,
//     sameWitness/sameWitnessLog, the reading registry) moved to
//     @red-cup-engineering/wire-form-round-trip-check;
//   - the witness-journal coherence judgement (cohere/cohereLog/CoherenceReport)
//     built on top of it moved to @red-cup-engineering/witness-journal-coherence,
//     seated beside the other witness-journal-services-section packages.
// This file re-exports both, under the same names ledger/index.mts has always
// exported, so relating's 20+ ledger consumers keep working without edits. The
// schema carriers (readingDescriptorCarrier, coherenceReportCarrier, etc.) stay
// relating-owned in ../carriers/ledger/reading.mjs — boundary-system material,
// untouched by this split.
export {
  sameWitness,
  sameWitnessLog,
  readingAsLogReading,
  registerReading,
  registerLogReading,
  readingById,
  logReadingById,
  readings,
  logReadings,
  type ReadingDescriptor,
  type LogReadingDescriptor,
  type Reading,
  type LogReading,
  type WitnessRow as WitnessJournalEntry,
  type WitnessLog as WitnessJournal,
} from "@red-cup-engineering/wire-form-round-trip-check";

export {
  cohere,
  cohereLog,
  assertCoherent,
  assertLogCoherent,
  type CoherenceReport,
  type LogCoherenceReport,
} from "@red-cup-engineering/witness-journal-coherence";
