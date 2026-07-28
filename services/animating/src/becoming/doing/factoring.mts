/**
 * factoring — the agentive-triad act-factorization, the THIRD reading of the descent.
 *
 * The one relating descent already reads two ways: as the four closure regimes
 * (becoming → doing → working → governing) and as the agency faces. This module adds
 * the corpus's third reading: the Austin/Searle **locution / illocution /
 * perlocution** three-layer factorization of an agentive act (content/_archive
 * speaking/{locution,illocution,perlocution}.md):
 *   - LOCUTION = *what is said* — the content SELECTED, prior to any force; "the
 *     selecting step: it changes nothing yet, it only fixes where a force will land."
 *   - ILLOCUTION = *what is done in saying* — the FORCE charged onto that content
 *     (asserted / denied); conventional, fixed by the act-type.
 *   - PERLOCUTION = *what is brought about by saying* — the EFFECT, the standing
 *     contribution left in the shared field; NOT conventional — it depends on the
 *     actual UPTAKE (the closure that actually settled), running out beyond the act.
 *
 * Crucially `factor` no longer FAKES the three faces with one generic descend section.
 * It consolidates each from its sibling faculty's OWN face reading (the bulk → faces
 * threading; dev/docs/notes/2026-06-21-bulk-over-faces-local-section-threading.md):
 * communicating reads its memes (truth ≤_t), knowing its comonad context (knowledge
 * ≤_k), playing its Design (evidence ⟨a₊,a₋⟩). The L/I/P is that face's own settling
 * FUNNEL — locution = the membrane's locutionary acts (raw utterances selecting
 * content) ⊇ illocution = the distinct charged cells (the force-bearing memes/cells/
 * loci, the face's `cover`) ⊇ perlocution = the cells that took settled effect (the
 * face's `held` standing, the uptake into the shared field) — and `belnap` is the
 * face's OWN axis-typed FOUR census, NOT a generic section count. The face↔axis map
 * (communicating↔truth, knowing↔knowledge, playing↔evidence) is provisional.
 */
import { communicatingFace } from "@red-cup-engineering/communicating";
import { knowingFace } from "@red-cup-engineering/knowing";
import { playingFace } from "@red-cup-engineering/playing";
import type { UtteranceCarrier } from "@red-cup-engineering/relating";
import type { DescentState } from "../descending.mjs";
import type { Factorization } from "./carriers.mjs";

/** The provisional agentive-triad axis each faculty works. */
const FACULTY_AXIS: Readonly<Record<Factorization["faculty"], Factorization["axis"]>> = Object.freeze({
  communicating: "truth",
  knowing: "knowledge",
  playing: "evidence",
});

/** The thick per-face reading the factorization consolidates: each sibling faculty's OWN
 *  axis-typed local section over a membrane — its `cover` (distinct charged cells), `held`
 *  (cells with a settled standing), and `belnap` (the FOUR census on its axis). */
interface FaceReading {
  readonly cover: number;
  readonly held: number;
  readonly belnap: Factorization["belnap"];
}

/** The real per-face reading for each faculty — its OWN settling, not a generic descend:
 *  communicating's memes (truth), knowing's comonad context (knowledge), playing's Design
 *  (evidence). The bulk imports its faces (bulk → faces); the faces never import the bulk. */
const FACE_READING: Readonly<Record<Factorization["faculty"], (membrane: readonly UtteranceCarrier[]) => FaceReading>> =
  Object.freeze({
    communicating: communicatingFace,
    knowing: knowingFace,
    playing: playingFace,
  });

/**
 * Factor a face's act into locution/illocution/perlocution, consolidated from the
 * sibling faculty's OWN face reading over the descent's membrane (no generic descend-
 * then-section). The L/I/P is the face's settling funnel — locution = the membrane's
 * locutionary acts (raw utterances selecting content); illocution = the distinct charged
 * cells the force lands on (the face's `cover`); perlocution = the cells that took settled
 * effect / uptake (the face's `held` standing). `belnap` is the face's OWN axis-typed FOUR
 * census. The act is a PRODUCING (Gen-1 speaking) act; its receiving dual is organizing's
 * adjudication.
 */
export function factor(faculty: Factorization["faculty"], state: DescentState): Factorization {
  const readFace = FACE_READING[faculty];
  if (readFace === undefined) throw new TypeError(`factor: unknown faculty ${String(faculty)}`);
  const reading = readFace(state.utterances);
  return {
    kind: "animating.factorization",
    faculty,
    axis: FACULTY_AXIS[faculty],
    dual: "producing",
    locution: state.utterances.length,
    illocution: reading.cover,
    perlocution: reading.held,
    belnap: { absurd: reading.belnap.absurd, potential: reading.belnap.potential, active: reading.belnap.active, stable: reading.belnap.stable },
  };
}

export type { Factorization } from "./carriers.mjs";
