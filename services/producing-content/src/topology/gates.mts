/**
 * gates - domain-neutral content-fitness primitives.
 *
 * Pure computations over prose text: word count, prophecy detection,
 * repetition detection, link extraction, prose-lint, and number faithfulness.
 * Consumers apply their own thresholds and turn these readings into local
 * editorial gates.
 */
import { lint } from "@red-cup-engineering/communicating-in-english";
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const GateFindingSchema = { $id: "producing-content/topology/gates/finding", title: "GateFinding", additionalProperties: false, type: "object", required: ["kind", "gate", "evidence"], properties: { kind: { const: "producing-content.gate.finding" }, gate: { minLength: 1, type: "string" }, evidence: { type: "string" } } } as const;

export const GateMetricSchema = { $id: "producing-content/topology/gates/metric", title: "GateMetric", additionalProperties: false, type: "object", required: ["kind", "metric", "value"], properties: { kind: { const: "producing-content.gate.metric" }, metric: { minLength: 1, type: "string" }, value: { type: "number" }, evidence: { type: "string" } } } as const;

export const GateChargeSchema = { $id: "producing-content/topology/gates/charge", title: "GateCharge", additionalProperties: false, type: "object", required: ["kind", "gate", "charge", "evidence"], properties: { kind: { const: "producing-content.gate.charge" }, gate: { minLength: 1, type: "string" }, charge: { anyOf: [{ const: "pass" }, { const: "fail" }] }, evidence: { type: "string" } } } as const;

export type GateFinding = FromSchema<typeof GateFindingSchema>;
export type GateMetric = FromSchema<typeof GateMetricSchema>;
export type GateCharge = FromSchema<typeof GateChargeSchema>;

export const gateFindingCarrier = carrierFrom(GateFindingSchema);

export const gateMetricCarrier = carrierFrom(GateMetricSchema);

export const gateChargeCarrier = carrierFrom(GateChargeSchema);

export function gateFinding(gate: string, evidence: string): GateFinding {
  return gateFindingCarrier.assert({
    kind: "producing-content.gate.finding" as const,
    gate,
    evidence,
  }, "gate finding");
}

export function gateMetric(metric: string, value: number, evidence?: string): GateMetric {
  return gateMetricCarrier.assert({
    kind: "producing-content.gate.metric" as const,
    metric,
    value,
    ...(evidence === undefined ? {} : { evidence }),
  }, "gate metric");
}

export function gateCharge(gate: string, charge: "pass" | "fail", evidence: string): GateCharge {
  return gateChargeCarrier.assert({
    kind: "producing-content.gate.charge" as const,
    gate,
    charge,
    evidence,
  }, "gate charge");
}

export function gateFindingsTerm(findings: readonly GateFinding[]): Tm {
  return carrierToTerm(jsonResource(findings.map((finding) => gateFindingCarrier.assert(finding, "gate finding")), "gate findings"));
}

export function gateMetricsTerm(metrics: readonly GateMetric[]): Tm {
  return carrierToTerm(jsonResource(metrics.map((metric) => gateMetricCarrier.assert(metric, "gate metric")), "gate metrics"));
}

export function gateChargesTerm(charges: readonly GateCharge[]): Tm {
  return carrierToTerm(jsonResource(charges.map((charge) => gateChargeCarrier.assert(charge, "gate charge")), "gate charges"));
}

/**
 * Canonical comparison key for a term: lowercases, collapses every run of
 * non-alphanumeric characters to a single space, and trims.
 */
export function normalizeTerm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Number of words in the body: counts whitespace-separated tokens that contain
 * at least one letter or digit, ignoring pure-punctuation tokens.
 */
export function wordCount(body: string): number {
  return body.split(/\s+/).filter((word) => /[a-z0-9]/i.test(word)).length;
}

/** Prose lines only: heading lines are not sentences. */
export function proseLines(body: string): string {
  return body.split("\n").filter((line) => !/^#{1,6}\s/.test(line)).join("\n");
}

/**
 * Sentences that make modal-certainty claims about the future. Excludes quoted
 * link text and recognized non-prophecy uses of "will" such as political will.
 */
export function prophecyFindings(body: string): readonly string[] {
  const prose = body
    .replace(/\[[^\]]*\]\(([^)\s]+)\)/g, "(cited)")
    .split("\n")
    .filter((line) => !/^#{1,6}\s/.test(line))
    .join("\n");
  const sentences = prose.split(/(?<=[.!?])\s+/);
  return Object.freeze(sentences.filter((sentence) => {
    const judged = sentence
      .replace(/\b(political|public|collective|popular|free|national|human)\s+will\b/gi, "(resolve)")
      .replace(/\bwill\s+(of|to)\b/gi, "(resolve) $1")
      .replace(/\b(might not|may not|cannot|can't|does not|doesn't|no)\s+guarantee\w*/gi, "(hedged)");
    return /\b(will|inevitabl\w*|guaranteed?\b|certain to)\b/i.test(judged);
  }));
}

export function prophecyGateFindings(body: string): readonly GateFinding[] {
  return Object.freeze(prophecyFindings(body).map((evidence) => gateFinding("no-prophecy", evidence)));
}

/** All Markdown link URLs found in the body. */
export function extractLinks(body: string): readonly string[] {
  return Object.freeze(
    [...body.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? "").filter(Boolean),
  );
}

/**
 * Repeated sentences and repeated 8-word phrases. Judged on the writer's own
 * prose: link text is collapsed to "(cited)" before analysis.
 */
export function repetitionFindings(body: string): readonly string[] {
  const findings: string[] = [];
  const prose = proseLines(body.replace(/\[[^\]]*\]\(([^)\s]+)\)/g, "(cited)"));
  const counts = new Map<string, number>();
  for (const raw of prose.split(/(?<=[.!?])\s+/)) {
    const sentence = raw.toLowerCase().replace(/\s+/g, " ").trim();
    if (sentence.split(" ").filter((word) => /[a-z0-9]/.test(word)).length < 4) continue;
    counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
  }
  for (const [sentence, count] of counts) {
    if (count >= 2) findings.push(`sentence appears ${count}x: "${sentence.slice(0, 110)}"`);
  }
  const words = normalizeTerm(prose).split(" ").filter(Boolean);
  const grams = new Map<string, number>();
  for (let index = 0; index + 8 <= words.length; index += 1) {
    const gram = words.slice(index, index + 8).join(" ");
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  const offenders = [...grams].filter(([, count]) => count >= 3);
  for (const [gram, count] of offenders.slice(0, 3)) {
    findings.push(`8-word phrase appears ${count}x: "${gram}"`);
  }
  return Object.freeze(findings);
}

export function repetitionGateFindings(body: string): readonly GateFinding[] {
  return Object.freeze(repetitionFindings(body).map((evidence) => gateFinding("repetition", evidence)));
}

/** Prose-lint diagnostics at "error" severity, as `ruleId "text"` strings. */
export function proseLintErrors(body: string): readonly string[] {
  return Object.freeze(
    lint(body, { markdown: true })
      .diagnostics
      .filter((d) => d.severity === "error")
      .map((d) => `${d.ruleId} "${d.text}"`),
  );
}

export function proseLintGateFindings(body: string): readonly GateFinding[] {
  return Object.freeze(proseLintErrors(body).map((evidence) => gateFinding("prose", evidence)));
}

/**
 * Prose-lint diagnostics at "suggestion" severity, formatted as revision
 * directives. `max` caps the output.
 */
export function proseLintSuggestions(body: string, max = 8): readonly string[] {
  return Object.freeze(
    lint(body, { markdown: true })
      .diagnostics
      .filter((d) => d.suggest !== undefined)
      .slice(0, max)
      .map((d) => `prose: replace "${d.text}"${d.suggest !== undefined ? ` with "${d.suggest}"` : ""}`),
  );
}

/** All dollar amounts and percentages found in text, normalized for comparison. */
export function extractNumbers(text: string): ReadonlySet<string> {
  const results = new Set<string>();
  for (const match of text.matchAll(/\$[\d,]+(?:\.\d+)?(?:\s*(?:trillion|billion|million|thousand))?/gi)) {
    results.add(normalizeNumericExpression(match[0]));
  }
  for (const match of text.matchAll(/[\d,]+(?:\.\d+)?\s*(?:%|percent\b)/gi)) {
    results.add(normalizeNumericExpression(match[0]));
  }
  return Object.freeze(results);
}

function normalizeNumericExpression(raw: string): string {
  return raw.toLowerCase().replace(/,/g, "").replace(/\s*percent\b/gi, "%").replace(/\s+/g, " ").trim();
}

/**
 * Numbers present in draftBody that are absent from the union of all intake
 * numbers. Returns [] when intakeTexts is empty or no source numbers exist.
 */
export function numberFaithfulnessFindings(draftBody: string, intakeTexts: readonly string[]): readonly string[] {
  if (intakeTexts.length === 0) return Object.freeze([]);
  const sourceNumbers = new Set<string>();
  for (const text of intakeTexts) {
    for (const n of extractNumbers(text)) sourceNumbers.add(n);
  }
  if (sourceNumbers.size === 0) return Object.freeze([]);
  const findings: string[] = [];
  for (const n of extractNumbers(draftBody)) {
    if (!sourceNumbers.has(n)) findings.push(n);
  }
  return Object.freeze(findings);
}

export function numberFaithfulnessGateFindings(draftBody: string, intakeTexts: readonly string[]): readonly GateFinding[] {
  return Object.freeze(numberFaithfulnessFindings(draftBody, intakeTexts).map((evidence) => gateFinding("numbers-faithfulness", evidence)));
}
