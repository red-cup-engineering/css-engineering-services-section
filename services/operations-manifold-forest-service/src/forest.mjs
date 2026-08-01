import { purchaseCarrierCompositionJudgment } from "@red-cup-engineering/carrier-composition-judgment-service";

export const ACTOR = "urn:ame:operations-manifold-forest-service";

function words(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new TypeError(`${label} must be an array of nonempty strings`);
  }
  return Object.freeze([...new Set(value)]);
}

function extrema(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return Object.freeze(value.map((item, index) => {
    if (!item || Object.getPrototypeOf(item) !== Object.prototype
        || typeof item.carrier !== "string" || item.carrier.length === 0) {
      throw new TypeError(`${label}[${index}] must name one carrier`);
    }
    return Object.freeze({ carrier: item.carrier, actions: words(item.actions, `${label}[${index}].actions`) });
  }));
}

function manifold(value, index) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype
      || typeof value.package !== "string" || value.package.length === 0) {
    throw new TypeError(`manifolds[${index}] must name one package`);
  }
  const source = value.extrema;
  if (!source || Object.getPrototypeOf(source) !== Object.prototype) {
    throw new TypeError(`manifolds[${index}].extrema must be one record`);
  }
  return Object.freeze({
    package: value.package,
    protocol: typeof value.protocol === "string" ? value.protocol : "unknown",
    domains: extrema(source.domains, `manifolds[${index}].extrema.domains`),
    codomains: extrema(source.codomains, `manifolds[${index}].extrema.codomains`),
  });
}

const frontier = (side, packageName, extremum) => Object.freeze({
  side,
  package: packageName,
  carrier: extremum.carrier,
  actions: extremum.actions,
});

/**
 * Derive possible molecular bonds without owning the atomic equality formula.
 * Every producer-consumer pair is submitted to the purchased judgment Actor.
 */
export async function deriveOperationsManifoldForest(values, {
  purchase = purchaseCarrierCompositionJudgment,
  judgmentOptions = {},
} = {}) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError("at least one operations manifold is required");
  const manifolds = Object.freeze(values.map(manifold));
  const candidates = [];
  for (const source of manifolds) {
    for (const produced of source.codomains) {
      for (const target of manifolds) {
        for (const consumed of target.domains) {
          for (const from of produced.actions) {
            for (const to of consumed.actions) {
              candidates.push(Object.freeze({ source, produced, target, consumed, from, to }));
            }
          }
        }
      }
    }
  }
  const judgments = await Promise.all(candidates.map(async (candidate) => Object.freeze({
    candidate,
    judgment: await purchase(
      { verb: candidate.from, codomain: candidate.produced.carrier },
      { verb: candidate.to, domain: candidate.consumed.carrier },
      judgmentOptions,
    ),
  })));
  const edges = [];
  const obstructions = [];
  const bondedOutgoing = new Set();
  const bondedIncoming = new Set();
  for (const { candidate, judgment } of judgments) {
    const keyOut = `${candidate.source.package}\0${candidate.produced.carrier}`;
    const keyIn = `${candidate.target.package}\0${candidate.consumed.carrier}`;
    if (judgment.type === "CarrierCompositionWitness" && judgment.composes === true) {
      bondedOutgoing.add(keyOut);
      bondedIncoming.add(keyIn);
      edges.push(Object.freeze({
        fromPackage: candidate.source.package,
        from: candidate.from,
        toPackage: candidate.target.package,
        to: candidate.to,
        locus: judgment.locus,
        relation: judgment.relation,
        provider: judgment.judgmentProvider ?? null,
        receipt: judgment.judgmentReceipt ?? null,
      }));
    } else {
      obstructions.push(Object.freeze({
        fromPackage: candidate.source.package,
        from: candidate.from,
        toPackage: candidate.target.package,
        to: candidate.to,
        produced: candidate.produced.carrier,
        consumed: candidate.consumed.carrier,
        judgment,
      }));
    }
  }
  const incoming = [];
  const outgoing = [];
  for (const item of manifolds) {
    for (const extremum of item.domains) {
      if (!bondedIncoming.has(`${item.package}\0${extremum.carrier}`)) incoming.push(frontier("incoming", item.package, extremum));
    }
    for (const extremum of item.codomains) {
      if (!bondedOutgoing.has(`${item.package}\0${extremum.carrier}`)) outgoing.push(frontier("outgoing", item.package, extremum));
    }
  }
  return Object.freeze({
    type: "OperationsManifoldBondForest",
    actor: ACTOR,
    packages: Object.freeze(manifolds.map(({ package: name, protocol }) => Object.freeze({ package: name, protocol }))),
    candidateCount: String(candidates.length),
    edges: Object.freeze(edges),
    obstructions: Object.freeze(obstructions),
    frontier: Object.freeze({ incoming: Object.freeze(incoming), outgoing: Object.freeze(outgoing) }),
  });
}
