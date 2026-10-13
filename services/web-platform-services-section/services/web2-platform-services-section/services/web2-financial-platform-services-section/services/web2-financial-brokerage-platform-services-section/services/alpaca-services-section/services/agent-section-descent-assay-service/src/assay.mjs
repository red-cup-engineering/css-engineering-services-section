import { address, cell, knowledgeReading, told } from "@red-cup-engineering/signcell/cell";
import { rule } from "@red-cup-engineering/signchain/rules";
import { logOfSeavtRows } from "@red-cup-engineering/signchain/log";
import { eavtId } from "@red-cup-engineering/eavt-services-section/row";
import { settleCells, settlementAdmits } from "@red-cup-engineering/signcraft/settle";
import { isAbsoluteSeavtClock, compareAbsoluteSeavtClocks, seavtOfSignCell } from "@red-cup-engineering/semiotic-eavt-services-section/admit-seavt-row";

const numeric = (input, label) => {
  if (!((typeof input === "number") || (typeof input === "string" && input.trim() !== "")) ||
      !Number.isFinite(Number(input))) throw new TypeError(`${label}-finite-number-required`);
  return Number(input);
};
const text = (input, label) => {
  if (typeof input !== "string" || input.trim() === "") throw new TypeError(`${label}-required`);
  return input;
};

/**
 * Each market coordinate is a different proposition. A positive forecast at
 * BLK:5 and a negative forecast at BLK:20 are not contradictory tellings.
 * SignCell is the sole authority for FOUR presence and triple identity; the
 * graph-Laplacian below measures numeric disagreement on overlapping sections,
 * but is NOT a theorem that the sections form a sheaf or that alpha exists.
 */
function assay({ sections, confidenceFloor = 0.5, asOf, agreementTolerance = null } = {}, measureSheafLaplacian) {
  if (!Array.isArray(sections) || sections.length < 2) throw new TypeError("plural-agent-sections-required");
  // A point-in-time comparison is a filtration of what could actually have
  // been known by the cutoff, not of what a model reports after the fact.
  const cutoff = asOf === undefined ? null : asOf;
  if (cutoff !== null && !isAbsoluteSeavtClock(cutoff))
    throw new TypeError("forecast-as-of-time-invalid");
  const floor = numeric(confidenceFloor, "confidence-floor");
  if (floor < 0 || floor > 1) throw new RangeError("confidence-floor-out-of-range");
  // A tolerance is a declared quantitative criterion on ||δx||, not a
  // theorem about global market observability. No chosen tolerance means
  // that the assay cannot claim compatibility merely from a tiny number.
  const tolerance = agreementTolerance === null ? null : numeric(agreementTolerance, "agreement-tolerance");
  if (tolerance !== null && (tolerance < 0 || !Number.isFinite(tolerance * tolerance)))
    throw new RangeError("agreement-tolerance-out-of-range");
  const providers = new Set(), seenPairs = new Set(), values = {}, edges = [], groups = new Map();
  for (const [index, section] of sections.entries()) {
    const provider = text(section?.provider, "agent-provider");
    const coordinate = text(section?.coordinate, "forecast-coordinate");
    const value = numeric(section.value, "forecast-value");
    const confidence = numeric(section.confidence, "forecast-confidence");
    if (confidence < 0 || confidence > 1) throw new RangeError("forecast-confidence-out-of-range");
    if (section.evidenceReferences !== undefined &&
        (!Array.isArray(section.evidenceReferences) ||
         section.evidenceReferences.some((ref) => typeof ref !== "string" || !ref.trim())))
      throw new TypeError("forecast-evidence-references-invalid");
    if (section.observedAt !== undefined && !isAbsoluteSeavtClock(section.observedAt))
      throw new TypeError("forecast-observation-time-invalid");
    if (cutoff !== null && (section.observedAt === undefined ||
        compareAbsoluteSeavtClocks(section.observedAt, cutoff) > 0))
      throw new TypeError("forecast-outside-as-of-filtration");
    const pair = JSON.stringify([provider, coordinate]);
    if (seenPairs.has(pair)) throw new TypeError("duplicate-provider-coordinate-forecast");
    seenPairs.add(pair);
    providers.add(provider);
    values[String(index)] = value;
    const rows = groups.get(coordinate) ?? [];
    rows.push({ provider, coordinate, value, confidence, index,
      evidenceReferences: Object.freeze([...new Set(section.evidenceReferences ?? [])].sort()),
      ...(section.observedAt === undefined ? {} : { observedAt: section.observedAt }) });
    groups.set(coordinate, rows);
  }
  // A common coordinate is necessary for comparison; unconnected components
  // carry no disagreement evidence and do not prove that a global gluing exists.
  for (const rows of groups.values()) for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const weight = rows[i].confidence * rows[j].confidence;
      if (weight > 0) edges.push({ left: String(rows[i].index), right: String(rows[j].index), weight });
    }
  }
  const laplacian = measureSheafLaplacian({ sections: values, edges });
  // A known-at financial assay consumes actual, witnessed SEAVT observations.
  // Source assertions and their signed derived propositions are separate cells:
  // a model's forecast is not an independently verified market fact.
  const witness = ({ provider, value, confidence, evidenceReferences, observedAt }) => ({
    provider, forecastValue: value, confidence, evidenceReferences,
    ...(observedAt === undefined ? {} : { observedAt }),
  });
  const seavtRows = [];
  if (cutoff !== null) for (const rows of groups.values()) for (const row of rows) {
    const source = cell(row.provider, "provider-reported-market-forecast", {
      coordinate: row.coordinate, forecastValue: row.value,
      confidence: row.confidence, evidenceReferences: row.evidenceReferences,
      observedAt: row.observedAt,
    }, { for: [witness(row)] });
    seavtRows.push(seavtOfSignCell(source, row.observedAt));
    if (row.value !== 0) {
      const derived = cell(row.coordinate, "expected-excess-return-positive", true, {
        [row.value > 0 ? "for" : "against"]: [{
          ...witness(row), sourceCell: address(source), transform: "sign-of-forecast-value",
        }],
      });
      seavtRows.push(seavtOfSignCell(derived, row.observedAt));
    }
  }
  seavtRows.sort((left, right) =>
    compareAbsoluteSeavtClocks(left.t, right.t) || eavtId(left).localeCompare(eavtId(right)));
  const chain = cutoff === null ? null : logOfSeavtRows(seavtRows, { asOf: cutoff });
  const cells = [], reviewCells = [], reviewSettlements = [], coordinatePairs = [];
  for (const [coordinate, rows] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const qualified = rows.filter((row) => row.confidence >= floor);
    // Every received forecast is evidence that its named provider made that
    // forecast. Filtering a weak forecast before constructing FOUR silently
    // changes a witnessed refutation into knowledge-bottom. Confidence is a
    // separate qualification, never a rule for deleting an attributed telling.
    // Evidence references remain assertions from their named providers; their
    // presence is NOT independent validation of news, filings or market facts.
    // Two providers citing the SAME filing, headline, or data observation are
    // not two independent source witnesses. Preserve the provider tellings but
    // expose shared source references rather than multiplying conviction.
    const sourceOwners = new Map();
    for (const row of rows) for (const id of row.evidenceReferences) {
      const owners = sourceOwners.get(id) ?? new Set();
      owners.add(row.provider);
      sourceOwners.set(id, owners);
    }
    const sharedSourceReferences = [...sourceOwners.entries()]
      .filter(([, owners]) => owners.size > 1).map(([id]) => id).sort();
    const fore = rows.filter((row) => row.value > 0).map(witness);
    const against = rows.filter((row) => row.value < 0).map(witness);
    const admitted = chain?.cells({ subject: coordinate, predicate: "expected-excess-return-positive", object: true });
    if (admitted && admitted.length > 1)
      throw new TypeError("financial-evidence-must-resolve-to-one-proposition");
    // If every forecast is neutral, there are no sign tellings: FOUR is neither.
    // Without a known-at cutoff this remains an atemporal research-only assay.
    const claim = admitted ? (admitted[0] ?? cell(coordinate, "expected-excess-return-positive", true))
      : cell(coordinate, "expected-excess-return-positive", true, { for: fore, against });
    const [positiveEvidence, negativeEvidence] = told(claim);
    const reading = Object.freeze({
      address: address(claim), coordinate, charge: knowledgeReading(claim),
      positiveEvidence, negativeEvidence, supporters: fore.length, refuters: against.length,
      // Admission and source trust remain distinct from the FORE/AGAINST
      // truth of the forecast-utterance proposition.
      qualifiedSupporters: qualified.filter((row) => row.value > 0).length,
      qualifiedRefuters: qualified.filter((row) => row.value < 0).length,
      belowConfidenceFloor: rows.length - qualified.length,
      confidenceFloor: floor,
      contradictionHeld: positiveEvidence && negativeEvidence,
      sourceReferencesAttached: rows.every((r) => r.evidenceReferences.length > 0),
      sharedSourceReferences: Object.freeze(sharedSourceReferences),
      crossProviderSourceReuseDetected: sharedSourceReferences.length > 0,
      sourceIndependenceEstablished: false,
    });
    cells.push(claim);
    // SignChain derives a separately witnessed REVIEW proposition from a
    // stable (told-both) SignCell point. It never infers a positive return,
    // a negative return, or order authority from disagreement.
    const reviewTarget = cell(coordinate, "market-forecast-conflict-requires-review", true);
    const reviewRule = rule("market-forecast-contestation-review", [
      { cell: claim, atLeast: "stable" },
    ], { cell: reviewTarget, reading: "potential" });
    const reviewSettlement = settleCells([claim], [reviewRule]);
    const admission = settlementAdmits(reviewSettlement);
    if (admission.admitted !== true)
      throw new TypeError("market-forecast-review-settlement-not-admitted");
    // The settled valuation, not a one-step local firing, is authoritative.
    // SignCraft keeps both sides of the premise, derives the review witness
    // when its FOUR reading is stable, and closes monotonically.
    const reviewAddress = address(reviewTarget);
    const derived = reviewSettlement.settled.filter((at) => address(at) === reviewAddress);
    if (derived.length) reviewCells.push(...derived);
    reviewSettlements.push(Object.freeze({
      coordinate, settledAt: reviewSettlement.settledAt,
      derivationVersion: reviewSettlement.derivationVersion,
      admitted: admission.admitted, reviewDerived: derived.length > 0,
    }));
    coordinatePairs.push([coordinate, reading]);
  }
  const coordinateReadings = Object.fromEntries(coordinatePairs);
  const readings = Object.values(coordinateReadings);
  const positiveEvidence = readings.some((reading) => reading.positiveEvidence);
  const negativeEvidence = readings.some((reading) => reading.negativeEvidence);
  const contradictionHeld = readings.some((reading) => reading.contradictionHeld);
  const crossProviderSourceReuseDetected = readings.some((reading) => reading.crossProviderSourceReuseDetected);
  const overlapObserved = edges.length > 0;
  return Object.freeze({
    type: "AgentSectionDescentAssay",
    version: 2,
    providers: Object.freeze([...providers].sort()),
    coordinates: Object.freeze([...groups.keys()].sort()),
    // The requested cutoff is carried with its measured refusal. A generated
    // forecast timestamp is not by itself proof that its cited primary
    // document/news item was already publicly available at that time.
    asOf: cutoff, // preserve exact sub-millisecond cutoff rather than truncating to a Date
    forecastClockFilterApplied: cutoff !== null,
    underlyingSourcePublicationVerified: false,
    cells: Object.freeze(cells),
    // Already native SEN/SEAVT carriers; custody writes belong to the caller's
    // existing store, never to this pure assay or a parallel report format.
    seavtRows: Object.freeze(seavtRows),
    // Each review carries SignChain's rule-content identity and premise
    // address as its support witness; no review cell is manufactured for
    // one-sided or unknown evidence.
    reviewCells: Object.freeze(reviewCells),
    reviewRequired: reviewCells.length > 0,
    reviewSettlements: Object.freeze(reviewSettlements),
    coordinateReadings: Object.freeze(coordinateReadings),
    four: Object.freeze({ positiveEvidence, negativeEvidence }),
    contradictionHeld,
    crossProviderSourceReuseDetected,
    comparedEdgeCount: edges.length,
    overlapObserved,
    disagreementEnergy: laplacian.disagreementEnergy,
    agreementTolerance: tolerance,
    gluesWithinTolerance: overlapObserved && tolerance !== null && laplacian.disagreementEnergy <= tolerance * tolerance,
    sheafGluingProven: false,
    // A structural disagreement energy cannot calibrate expected excess
    // return or optimize capital allocation. Carry no fabricated multiplier.
    confidenceMultiplier: null,
    confidenceCalibrationEstablished: false,
    forcedConsensus: false,
    effect: "assay-only",
  });
}

export function createAgentSectionDescentAssay({ measureSheafLaplacian }) {
  if (typeof measureSheafLaplacian !== "function") throw new TypeError("laplacian-measurement-provider-required");
  return (input) => assay(input, measureSheafLaplacian);
}
