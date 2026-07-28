// holography/projecting/state — the current view projected from the witness log.
//
// The append-only log is the boundary; this projection is the bulk it determines
// (the read-model of the event-sourced ledger). Functional attributes hold one
// value at a time (latest witness by time wins); every other attribute
// accumulates the set of distinct witnessed values. Pure: a fold over the log.

import { canonical, type JsonValue } from "../codecs/text/json/core.mjs";
import type { EAVTRecord } from "../codecs/text/json/jsonl/eavt/index.mjs";

/**
 * One entity's projected attributes.
 *
 * A functional attribute holds a single JSON value. A non-functional attribute
 * holds an array of distinct witnessed values. This type is a read model, not
 * the log itself.
 */
export type EntityView = { readonly [attribute: string]: JsonValue };

/**
 * Current view keyed by canonical entity JSON.
 *
 * The keys are strings because JSON objects need stable file/state addresses;
 * callers that need the original entity value can parse a key that was produced
 * from JSON.
 */
export type StateView = { readonly [entity: string]: EntityView };

interface Accum {
  readonly functional: Map<string, { value: JsonValue; time: JsonValue }>;
  readonly sets: Map<string, Map<string, JsonValue>>;
}

/**
 * Fold an append-only witness log into its current state view.
 *
 * Functional attributes use latest-witness-wins according to canonical witness
 * time. Non-functional attributes accumulate a canonicalized set of distinct
 * values. The fold is pure: it does not read or write the store.
 */
export function projectStateView(log: readonly EAVTRecord[], functional: ReadonlySet<string>): StateView {
  const entities = new Map<string, Accum>();
  for (const row of log) {
    const entityKey = canonical(row.e);
    const attribute = String(row.a);
    const accum = entities.get(entityKey) ?? { functional: new Map(), sets: new Map() };
    if (functional.has(attribute)) {
      const prior = accum.functional.get(attribute);
      if (prior === undefined || canonical(row.t) > canonical(prior.time)) {
        accum.functional.set(attribute, { value: row.v, time: row.t });
      }
    } else {
      const set = accum.sets.get(attribute) ?? new Map<string, JsonValue>();
      set.set(canonical(row.v), row.v);
      accum.sets.set(attribute, set);
    }
    entities.set(entityKey, accum);
  }

  const view: { [entity: string]: EntityView } = {};
  for (const [entityKey, accum] of entities) {
    const entityView: { [attribute: string]: JsonValue } = {};
    for (const [attribute, { value }] of accum.functional) entityView[attribute] = value;
    for (const [attribute, set] of accum.sets) entityView[attribute] = Object.freeze([...set.values()]);
    view[entityKey] = Object.freeze(entityView);
  }
  return Object.freeze(view);
}
