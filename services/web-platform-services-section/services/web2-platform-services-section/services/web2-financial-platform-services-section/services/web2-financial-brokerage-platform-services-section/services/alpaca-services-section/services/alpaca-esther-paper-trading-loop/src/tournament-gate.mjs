import { readFileSync } from "node:fs";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { buildEntries, normalizeBars } from "@red-cup-engineering/strategy-tournament-service";

const BASELINE_ID = "buy-and-hold";

/**
 * Reads the loop's persisted "latest tournament record" file, verifies
 * its `record.inputsDigest` against a fresh digest of its own preserved
 * `request`, and judges -- on untouched holdout evidence, never
 * validation alone -- whether the validation-selected strategy has
 * actually established alpha over the buy-and-hold baseline.
 * `selectModelCandidate`'s own `alphaEstablished` field is unconditionally
 * `false` (selection-only); this is the honest judgment the task requires
 * of the consumer.
 * @param {string} tournamentRecordPath Absolute path to a `StrategyTournamentRecordFile`.
 * @returns {{record: Readonly<object>, winnerId: string, alphaEstablished: boolean, todaysWeight: number|null, reason: string, bars: {t: string, o: number, h: number, l: number, c: number, v: number}[]}}
 * @throws {Error} `tournament-record-missing:<path>` when the file cannot be read.
 * @throws {Error} `tournament-record-malformed:<message>` when the file, its request, or its digest fail to line up.
 */
export function loadTournamentSelection(tournamentRecordPath) {
  let text;
  try {
    text = readFileSync(tournamentRecordPath, "utf8");
  } catch (error) {
    throw new Error(`tournament-record-missing:${tournamentRecordPath}:${error.message}`);
  }
  let file;
  try {
    file = JSON.parse(text);
  } catch (error) {
    throw new Error(`tournament-record-malformed:invalid-json:${error.message}`);
  }
  if (file?.type !== "StrategyTournamentRecordFile" || !file.record || !file.request) {
    throw new Error("tournament-record-malformed:not-a-StrategyTournamentRecordFile");
  }
  const recomputedDigest = identifyJsonSemanticContent({ objectKind: "alpaca.strategy-tournament.input", value: file.request, witnessRoot: EMPTY_WITNESS_ROOT }).id;
  if (recomputedDigest !== file.record.inputsDigest) {
    throw new Error("tournament-record-malformed:inputsDigest-mismatch");
  }
  const { record } = file;
  const winnerId = record.selected.selectedUsingValidationOnly;
  const winnerHoldout = record.selected.untouchedHoldout[winnerId]?.metric;
  const baselineHoldout = record.selected.untouchedHoldout[BASELINE_ID]?.metric;
  const alphaEstablished = winnerId !== BASELINE_ID
    && Number.isFinite(winnerHoldout)
    && Number.isFinite(baselineHoldout)
    && winnerHoldout > baselineHoldout;
  let todaysWeight = null;
  if (alphaEstablished) {
    const bars = normalizeBars(file.request.bars);
    const entries = buildEntries(bars, file.request.params, file.request.entries);
    const winnerEntry = entries.find((entry) => entry.id === winnerId);
    todaysWeight = winnerEntry ? winnerEntry.weights.at(-1) : null;
  }
  const reason = alphaEstablished
    ? `validation-selected ${winnerId} also beats ${BASELINE_ID} on untouched holdout (${winnerHoldout} > ${baselineHoldout})`
    : winnerId === BASELINE_ID
      ? "validation-selected the buy-and-hold baseline itself: no differentiated strategy to trust"
      : `validation-selected ${winnerId} does not beat ${BASELINE_ID} on untouched holdout (${winnerHoldout} <= ${baselineHoldout}): selection did not generalize`;
  return { record, winnerId, alphaEstablished, todaysWeight, reason, bars: file.request.bars };
}
