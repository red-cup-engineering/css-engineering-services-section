/**
 * holography — projections from a communicating whole into readable layers.
 *
 * Holography is the representation boundary, not a codec. It does not encode a
 * carrier for transport; it reads the communicative whole through layer
 * projections whose parts remain accountable to the whole parse.
 */
import type { LambekForestProof, ParseForest, ParseResult, CohomologyResult } from "../speaking/listening/parsing/index.mjs";
import { admitCommunication, lambekProofOfForest, parseCommunicationForest } from "../speaking/listening/parsing/index.mjs";
import { cohomology } from "../speaking/listening/parsing/cohomology.mjs";
import type { CompiledBundle } from "../speaking/listening/algebra/index.mjs";
import { grammaticality } from "../speaking/listening/judging/grammaticality/index.mjs";
import type { GrammaticalityResult } from "../speaking/listening/judging/grammaticality/index.mjs";
import { discourseInformationOfState, discourseStateOfForest, roles, resolveReferences } from "../speaking/listening/understanding/index.mjs";
import type { DiscourseInformation, DiscourseState, SemanticFrame, ReferenceResult } from "../speaking/listening/understanding/index.mjs";

/** A full report over one sentence: the settled parse and every layer's reading. */
export interface Reading {
  readonly text: string;
  readonly forest: ParseForest;
  readonly lambek: LambekForestProof;
  readonly discourse: DiscourseState;
  readonly discourseInformation: DiscourseInformation;
  readonly parse: ParseResult;
  readonly roles: readonly SemanticFrame[];
  readonly grammaticality: GrammaticalityResult;
  readonly cohomology: CohomologyResult;
  readonly reference: ReferenceResult;
}

/** Articulate text, take its first sentence, and settle it through the engine. */
export function settle(text: string, bundle: CompiledBundle): ParseForest {
  return parseCommunicationForest(admitCommunication(text), bundle);
}

/** Read a sentence at every layer at once — the headline endomorphism. */
export function read(text: string, bundle: CompiledBundle): Reading {
  const forest = settle(text, bundle);
  const lambek = lambekProofOfForest(forest);
  const discourse = discourseStateOfForest(forest, lambek);
  const parsed = forest.readings[0]?.parse ?? {
    words: [],
    arcs: [],
    answers: [],
    compositions: [],
    tower: { folds: 0, fixedPoint: true, sizes: [] },
    conflicts: [],
    voids: [],
  };
  return {
    text,
    forest,
    lambek,
    discourse,
    discourseInformation: discourseInformationOfState(discourse),
    parse: parsed,
    roles: roles(parsed),
    grammaticality: grammaticality(parsed),
    cohomology: cohomology(parsed),
    reference: resolveReferences(parsed),
  };
}

/** A holographic projection of a reading: layer views accountable to the whole. */
export function projectReading(reading: Reading): Record<string, unknown> {
  return {
    text: reading.text,
    forest: {
      charge: reading.forest.charge,
      readings: reading.forest.readings.length,
      glued: reading.forest.glued,
      complete: reading.forest.complete,
      ambiguity: reading.forest.ambiguity,
      obstructions: reading.forest.obstructions,
    },
    lambek: {
      charge: reading.lambek.charge,
      proven: reading.lambek.proven,
      proofs: reading.lambek.proofs.length,
    },
    discourse: {
      charge: reading.discourse.charge,
      entities: reading.discourse.entities.length,
      references: reading.discourse.references.length,
      presuppositions: reading.discourse.presuppositions.length,
      topics: reading.discourse.topics.length,
      commitments: reading.discourse.commitments.length,
      repairs: reading.discourse.repairs.length,
    },
    discourseInformation: {
      stateCharge: reading.discourseInformation.stateCharge,
      samples: reading.discourseInformation.samples,
      topicEntropy: reading.discourseInformation.topicEntropy,
      commitmentEntropy: reading.discourseInformation.commitmentEntropy,
      repairEntropy: reading.discourseInformation.repairEntropy,
      meanSurprisal: reading.discourseInformation.meanSurprisal,
      redundancy: reading.discourseInformation.redundancy,
      semanticCohesion: reading.discourseInformation.semanticCohesion,
      channel: reading.discourseInformation.channel,
    },
    words: reading.parse.words.map((w) => ({ text: w.text, tags: w.tags, roles: w.roles })),
    arcs: reading.parse.arcs.map((a) => ({ rel: a.rel, head: a.headText, dep: a.depText })),
    roles: reading.roles,
    grammaticality: reading.grammaticality,
    cohomology: {
      glued: reading.cohomology.glued,
      h0: reading.cohomology.h0,
      h1: reading.cohomology.h1,
      obstructions: reading.cohomology.obstructions,
    },
  };
}
