import assert from "node:assert/strict";
import test from "node:test";

import { canonical } from "@red-cup-engineering/json-file-codec-service";
import { foldSchema } from "@red-cup-engineering/json-schema-services-section";
import {
  action,
  actionUtterances,
  carrierFrom,
  carrierSchemaAssertions,
  carrierSchemaIdentity,
  composes,
  induceBins,
  registeredCategory,
  tm,
} from "@red-cup-engineering/relating";

const markValue = (utterance, side) => utterance[side].mark.value;

test("schema content changes its identity and unfolded utterance marks", () => {
  const first = carrierFrom({ $id: "test/schema-change", type: "object", properties: { value: { type: "string" } } });
  const firstIdentity = carrierSchemaIdentity(first);
  const firstRows = carrierSchemaAssertions(first);
  const second = carrierFrom({ $id: "test/schema-change", type: "object", properties: { value: { type: "integer" } } });
  const secondIdentity = carrierSchemaIdentity(second);
  const secondRows = carrierSchemaAssertions(second);

  assert.notEqual(firstIdentity, secondIdentity);
  assert.notDeepEqual(firstRows, secondRows);
  assert.ok(firstRows.every((row) => row.t === firstIdentity));
  assert.ok(secondRows.every((row) => row.t === secondIdentity));
});

test("carrier schema assertions fold to the exact authored schema", () => {
  const carrier = carrierFrom({
    $id: "test/schema-fold",
    type: "object",
    required: ["items"],
    properties: { items: { type: "array", items: { type: "string" } } },
    additionalProperties: false,
  });
  assert.equal(canonical(foldSchema(carrierSchemaAssertions(carrier))), canonical(carrier.schema));
});

test("discovery deterministically projects every registered carrier assertion", () => {
  const carrier = carrierFrom({ $id: "test/schema-discovery", type: "string", minLength: 1 });
  const identity = carrierSchemaIdentity(carrier);
  const passthrough = action({ verb: "schema-discovery-pass", domain: carrier, codomain: carrier, runTerm: tm.lam(tm.var(0)) });
  const first = induceBins([passthrough], { packageName: "test/schema-discovery", deriveSchemaResources: false, derivePrompts: false }).discovery;
  const second = induceBins([passthrough], { packageName: "test/schema-discovery", deriveSchemaResources: false, derivePrompts: false }).discovery;

  assert.deepEqual(first, second);
  const schemaFacts = first.utterances.filter((utterance) => {
    const subject = markValue(utterance, "token");
    return subject && typeof subject === "object"
      && subject.subject && typeof subject.subject === "object"
      && subject.subject.t?.startsWith("sha256:")
      && typeof subject.subject.e === "string";
  });
  const expected = registeredCategory.carriers().flatMap(carrierSchemaAssertions);
  assert.equal(schemaFacts.length, expected.length);
  assert.ok(schemaFacts.some((utterance) => markValue(utterance, "token").subject.t === identity));
});

test("domain and codomain schema identities are visible while composition stays exact", () => {
  const shared = carrierFrom({ $id: "test/schema-composition", type: "string" });
  const producer = action({ verb: "schema-producer", codomain: shared, runTerm: tm.lam(tm.var(0)) });
  const consumer = action({ verb: "schema-consumer", domain: shared, runTerm: tm.lam(tm.var(0)) });
  assert.equal(composes(producer, consumer), true);

  const produced = actionUtterances(producer).find((utterance) => markValue(utterance, "claim") === "relating.action.codomain-schema-identity");
  const consumed = actionUtterances(consumer).find((utterance) => markValue(utterance, "claim") === "relating.action.domain-schema-identity");
  assert.deepEqual(markValue(produced, "token").object, markValue(consumed, "token").object);
  assert.deepEqual(markValue(produced, "token").object, { carrier: shared.id, schema: carrierSchemaIdentity(shared) });

  const foreign = carrierFrom({ $id: "test/schema-composition-foreign", type: "string" });
  const foreignConsumer = action({ verb: "schema-foreign-consumer", domain: foreign, runTerm: tm.lam(tm.var(0)) });
  assert.equal(composes(producer, foreignConsumer), false);
});
