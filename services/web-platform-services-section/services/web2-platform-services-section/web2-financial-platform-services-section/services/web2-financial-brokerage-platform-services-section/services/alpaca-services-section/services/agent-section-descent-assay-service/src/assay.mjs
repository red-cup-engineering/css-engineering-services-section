function assay({ sections, confidenceFloor = 0.5 } = {}, measureSheafLaplacian) {
  if (!Array.isArray(sections) || sections.length < 2) throw new TypeError("plural-agent-sections-required");
  const providers = new Set(), values = {}, edges = [];
  for (const [index, section] of sections.entries()) {
    if (typeof section?.provider !== "string" || providers.has(section.provider) || typeof section.coordinate !== "string" || !Number.isFinite(Number(section.value)) || !Number.isFinite(Number(section.confidence))) throw new TypeError("provider-distinct-agent-section-invalid");
    providers.add(section.provider);
    values[String(index)] = Number(section.value);
  }
  for (let left = 0; left < sections.length; left += 1) for (let right = left + 1; right < sections.length; right += 1) {
    if (sections[left].coordinate === sections[right].coordinate) edges.push({ left: String(left), right: String(right), weight: Math.max(0, Number(sections[left].confidence) * Number(sections[right].confidence)) });
  }
  const laplacian = measureSheafLaplacian({ sections: values, edges });
  const admitted = sections.filter(({ confidence }) => Number(confidence) >= confidenceFloor);
  const positiveEvidence = admitted.some(({ value }) => Number(value) > 0);
  const negativeEvidence = admitted.some(({ value }) => Number(value) < 0);
  return Object.freeze({
    type: "AgentSectionDescentAssay",
    version: 1,
    providers: Object.freeze([...providers].sort()),
    coordinates: Object.freeze([...new Set(sections.map(({ coordinate }) => coordinate))].sort()),
    four: Object.freeze({ positiveEvidence, negativeEvidence }),
    contradictionHeld: positiveEvidence && negativeEvidence,
    disagreementEnergy: laplacian.disagreementEnergy,
    gluesWithinTolerance: laplacian.disagreementEnergy <= 0.0001,
    confidenceMultiplier: 1 / (1 + 100 * laplacian.disagreementEnergy),
    forcedConsensus: false,
    effect: "assay-only",
  });
}

export function createAgentSectionDescentAssay({ measureSheafLaplacian }) {
  if (typeof measureSheafLaplacian !== "function") throw new TypeError("laplacian-measurement-provider-required");
  return (input) => assay(input, measureSheafLaplacian);
}
