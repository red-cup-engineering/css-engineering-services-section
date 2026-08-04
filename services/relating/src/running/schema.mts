/**
 * Deterministic schema evidence carried by Relating discovery.
 *
 * A carrier keeps its existing `$id` as the categorical composition address.
 * Its schema content receives a separate SHA-256 identity over the canonical
 * JSON text. That identity is also the `t` coordinate used by the existing
 * JSON-schema EAVT unfolding, so no clock or ambient observation participates.
 */
import { canonical } from "@red-cup-engineering/json-file-codec-service";
import { sha256Hex } from "@red-cup-engineering/file-cryptographic-integrity-service";
import { mark, utterance, type UtteranceCarrier } from "@lenticule-science/articulating/index";
import {
  schemaAssertionId,
  unfoldSchema,
  type SchemaAssertion,
} from "@red-cup-engineering/json-schema-services-section";
import type { Carrier } from "../carriers/kernel/carrier.mjs";

/** Canonical content identity of one carrier's authored schema literal. */
export function carrierSchemaIdentity(carrier: Carrier): string {
  return `sha256:${sha256Hex(canonical(carrier.schema))}`;
}

/**
 * Unfold one carrier schema into deterministic SchemaAssertion rows.
 *
 * The carrier `$id` remains the EAVT entity base and the canonical schema NI
 * is the assertion-time coordinate. Sorting by the authority's assertion IDs
 * removes authored object-key traversal order from discovery.
 */
export function carrierSchemaAssertions(carrier: Carrier): readonly SchemaAssertion[] {
  const identity = carrierSchemaIdentity(carrier);
  return Object.freeze([...unfoldSchema(carrier.schema, { base: carrier.id, t: identity })]
    .sort((left, right) => schemaAssertionId(left).localeCompare(schemaAssertionId(right))));
}

/** Project one existing EAVT assertion through Relating's ordinary fact marks. */
export function schemaAssertionUtterance(assertion: SchemaAssertion): UtteranceCarrier {
  return utterance(mark(Object.freeze({
    subject: Object.freeze({ e: assertion.e, t: assertion.t }),
    object: assertion.v,
  })), mark(assertion.a));
}

/** Deterministic utterance projection of every assertion in one carrier schema. */
export function carrierSchemaUtterances(carrier: Carrier): readonly UtteranceCarrier[] {
  return Object.freeze(carrierSchemaAssertions(carrier).map(schemaAssertionUtterance));
}
