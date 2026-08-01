export const ACTOR = "urn:ame:carrier-composition-judgment-service";

function face(value, label) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be one plain morphism face`);
  }
  if (typeof value.verb !== "string" || value.verb.length === 0) {
    throw new TypeError(`${label}.verb must be one nonempty string`);
  }
  if (value.domain !== undefined && (typeof value.domain !== "string" || value.domain.length === 0)) {
    throw new TypeError(`${label}.domain must be one nonempty carrier identity when present`);
  }
  if (value.codomain !== undefined && (typeof value.codomain !== "string" || value.codomain.length === 0)) {
    throw new TypeError(`${label}.codomain must be one nonempty carrier identity when present`);
  }
  return Object.freeze({
    verb: value.verb,
    ...(value.domain === undefined ? {} : { domain: value.domain }),
    ...(value.codomain === undefined ? {} : { codomain: value.codomain }),
  });
}

const obstruction = (reason, producer, consumer, produced, consumed) => Object.freeze({
  type: "CarrierCompositionObstruction",
  composes: false,
  reason,
  producer,
  consumer,
  produced,
  consumed,
});

/** The complete atom: codomain(producer) = domain(consumer). */
export function judgeCarrierComposition(producerValue, consumerValue) {
  const producer = face(producerValue, "producer");
  const consumer = face(consumerValue, "consumer");
  const produced = producer.codomain ?? null;
  const consumed = consumer.domain ?? null;
  if (produced === null) return obstruction("producer-codomain-absent", producer, consumer, produced, consumed);
  if (consumed === null) return obstruction("consumer-domain-absent", producer, consumer, produced, consumed);
  if (produced !== consumed) return obstruction("carrier-identity-mismatch", producer, consumer, produced, consumed);
  return Object.freeze({
    type: "CarrierCompositionWitness",
    composes: true,
    relation: "codomain-domain",
    locus: produced,
    producer,
    consumer,
    commitment: Object.freeze({
      token: produced,
      claim: Object.freeze({ relation: "codomain-domain", producer: producer.verb, consumer: consumer.verb }),
    }),
  });
}
