// holography/projecting/cells — the grain-of-change EAVT cell DSL.
//
// A witness is an EAVT `[entity, attribute, value, time]`: at `time`, the cell
// (entity, attribute, value) was observed (monotone, no assert/retract; finality
// is derived by settling). Choosing the entity at the grain of independent change
// is the whole compression argument: an unchanged observation re-witnesses to a
// byte-identical row and dedupes to zero cost. Pure: constructs cells, no I/O.
//
// The ledger is deliberately the `assertion` content corner (the EAVT writer's
// corner): state that must merge across agents/sessions lives here because triple
// union is order-independent and coordination-free (CALM), not in a `data`/JSON
// tree whose merge would need coordination.

import { eavtRecord, type EAVTRecord } from "../codecs/text/json/jsonl/eavt/index.mjs";
import type { JsonValue } from "../codecs/text/json/core.mjs";

/**
 * Witness coordinate for one observation.
 *
 * It is intentionally just JSON data: an ISO timestamp, block number, build id,
 * session id, or other caller-owned mark. State projection orders functional
 * attributes by this value's canonical JSON form; the ledger does not impose a
 * global clock discipline.
 */
export type Witness = JsonValue;

/**
 * Build one EAVT witness row.
 *
 * `entity`, `attribute`, and `value` are the cell being witnessed; `at` is the
 * witness coordinate. Values may be structured JSON, but they must already be
 * meaningful at the caller boundary. This helper is pure and performs no store
 * write.
 */
export function cell(entity: JsonValue, attribute: JsonValue, value: JsonValue, at: Witness): EAVTRecord {
  return eavtRecord({ e: entity, a: attribute, v: value, t: at });
}

/**
 * Witness selected attributes of one source object for one entity.
 *
 * `undefined` and `null` are treated as absent and skipped. Present values are
 * emitted as independent EAVT rows, which lets later projection decide whether
 * an attribute is functional latest-wins state or accumulated evidence.
 */
export function attributesOf(
  entity: JsonValue,
  source: Readonly<Record<string, unknown>>,
  attributes: readonly string[],
  at: Witness,
): EAVTRecord[] {
  const rows: EAVTRecord[] = [];
  for (const attribute of attributes) {
    const value = source[attribute];
    if (value === undefined || value === null) continue;
    rows.push(cell(entity, attribute, value as JsonValue, at));
  }
  return rows;
}
