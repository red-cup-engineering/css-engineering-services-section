// ledger/feed - pure description of how observations become witness rows.

import type { EAVTRecord } from "../codecs/text/json/jsonl/eavt/index.mjs";
import type { Witness } from "./cells.mjs";

/**
 * Description of how one observation enters the witness ledger.
 *
 * Callers provide the domain-specific part: a stable feed name, a cellizer that
 * turns one observation into EAVT rows, and the attributes whose projected state
 * should be latest-witness-wins. Filesystem persistence and state writes live in
 * `services/filesystem-store`.
 */
export interface Feed<Observation> {
  /** Stable feed name; used as the file stem by concrete stores. */
  readonly name: string;
  /** Turn one observation, witnessed at `at`, into EAVT cells. */
  readonly cellize: (observation: Observation, at: Witness) => readonly EAVTRecord[];
  /** Attributes holding one value at a time (latest witness wins on projection). */
  readonly functional: readonly string[];
}
