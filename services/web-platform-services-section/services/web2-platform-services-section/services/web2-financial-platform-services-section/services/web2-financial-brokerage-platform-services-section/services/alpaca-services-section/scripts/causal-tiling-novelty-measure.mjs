export function measureCausalPatchNovelty({ tokens, patchSize = 5 } = {}) {
  if (!Array.isArray(tokens) || tokens.some((token) => typeof token !== "string") || !Number.isInteger(patchSize) || patchSize < 1 || tokens.length < patchSize * 2) throw new TypeError("finite-causal-patch-input-invalid");
  const current = tokens.slice(-patchSize).join("\u0000");
  let eligiblePriorPatches = 0, recurrenceCount = 0;
  for (let end = patchSize; end <= tokens.length - patchSize; end += 1) {
    eligiblePriorPatches += 1;
    if (tokens.slice(end - patchSize, end).join("\u0000") === current) recurrenceCount += 1;
  }
  return Object.freeze({
    type: "CausalPatchNoveltyMeasurement",
    version: 1,
    patchSize,
    eligiblePriorPatches,
    recurrenceCount,
    empiricalFrequency: recurrenceCount / eligiblePriorPatches,
    novelty: 1 / (1 + recurrenceCount),
    infiniteTilingEquivalenceEstablished: false,
    effect: "measurement-only",
  });
}
