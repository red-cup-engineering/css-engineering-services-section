/**
 * @packageDocumentation
 *
 * running/invocation describes a scripted boundary play as EAVT witness material.
 *
 * Dispatch reports successful plays through an optional hook. Service bindings
 * decide whether that hook persists rows, streams them, or ignores them.
 * Filesystem persistence is deliberately outside this module.
 */
import { cell, type Witness } from "../ledger/cells.mjs";
import type { Feed } from "../ledger/feed.mjs";
import type { EAVTRecord } from "../codecs/text/json/jsonl/eavt/index.mjs";
import type { JsonRecord, JsonValue } from "../codecs/text/json/core.mjs";
import type { MorphismCarrier } from "./category.mjs";

/** One scripted play. */
export interface Invocation {
  readonly caller: JsonValue;
  readonly verb: string;
  readonly args: JsonRecord;
  readonly action?: MorphismCarrier;
  readonly value: JsonValue;
  readonly at: Witness;
}

/** The invocation feed: one observation becomes one grain-of-change EAVT row. */
export const invocationFeed: Feed<Invocation> = Object.freeze({
  name: "invocations",
  functional: [],
  cellize: (invocation: Invocation, at: Witness): readonly EAVTRecord[] =>
    [cell(invocation.caller, {
      verb: invocation.verb,
      args: invocation.args,
      ...(invocation.action === undefined ? {} : { action: invocation.action }),
    }, invocation.value, at)],
});
