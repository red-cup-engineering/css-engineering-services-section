const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || Object.is(number, -0)) throw new TypeError(`${label}-invalid`);
  return number;
};

export function selectModelCandidate({ candidates, policy } = {}) {
  if (!Array.isArray(candidates) || candidates.length < 2 || !policy || typeof policy.metric !== "string" || !["maximize", "minimize"].includes(policy.direction)) throw new TypeError("model-tournament-input-invalid");
  const actors = new Set(), identifiers = new Set();
  const admitted = candidates.map((candidate) => {
    if (typeof candidate?.id !== "string" || identifiers.has(candidate.id) || typeof candidate.authorActor !== "string" || actors.has(candidate.authorActor)) throw new TypeError("provider-distinct-candidates-required");
    identifiers.add(candidate.id); actors.add(candidate.authorActor);
    const validation = finite(candidate.validation?.[policy.metric], "validation-metric");
    const holdout = finite(candidate.holdout?.[policy.metric], "holdout-metric");
    const drawdown = finite(candidate.holdout?.maximumDrawdown ?? 0, "holdout-drawdown");
    return Object.freeze({ ...candidate, validationMetric: validation, holdoutMetric: holdout, holdoutDrawdown: drawdown });
  });
  const ordered = [...admitted].sort((left, right) => {
    const difference = policy.direction === "maximize" ? right.validationMetric - left.validationMetric : left.validationMetric - right.validationMetric;
    return difference || left.id.localeCompare(right.id);
  });
  const selected = ordered[0];
  const selectionPolicySatisfied = selected.holdoutDrawdown <= finite(policy.maximumHoldoutDrawdown, "maximum-holdout-drawdown");
  return Object.freeze({
    type: "ModelTournamentResult",
    version: 1,
    selectedUsingValidationOnly: selected.id,
    validationRanking: Object.freeze(ordered.map(({ id, authorActor, validationMetric }) => Object.freeze({ id, authorActor, validationMetric }))),
    untouchedHoldout: Object.freeze(Object.fromEntries(admitted.map(({ id, holdoutMetric, holdoutDrawdown }) => [id, Object.freeze({ metric: holdoutMetric, maximumDrawdown: holdoutDrawdown })]))),
    selectionPolicySatisfied,
    promotionEstablished: false,
    alphaEstablished: false,
    effect: "selection-only",
  });
}
