import { readFileSync } from "node:fs";
import { createBeliefRecord } from "@red-cup-engineering/trading-belief-service/belief-record";

/**
 * Reads the loop's persisted belief record file and validates it through
 * `createBeliefRecord`. Refuses (throws) with a datum naming the reason
 * when the file is absent, malformed, or its `falsifierFired` flag is
 * true -- a belief the loop cannot presently act on is data, never a
 * silently-ignored gap.
 * @param {string} beliefRecordPath Absolute path to a `TradingBeliefRecordFile`.
 * @returns {{belief: Readonly<object>, falsifierFired: boolean, recordedAt: string}}
 * @throws {Error} `belief-record-missing:<path>` when the file cannot be read.
 * @throws {Error} `belief-record-malformed:<message>` when the file is not valid JSON or fails belief-record validation.
 * @throws {Error} `belief-falsifier-fired:<falsifier>` when `falsifierFired` is true.
 */
export function loadBeliefOrRefuse(beliefRecordPath) {
  let text;
  try {
    text = readFileSync(beliefRecordPath, "utf8");
  } catch (error) {
    throw new Error(`belief-record-missing:${beliefRecordPath}:${error.message}`);
  }
  let file;
  try {
    file = JSON.parse(text);
  } catch (error) {
    throw new Error(`belief-record-malformed:invalid-json:${error.message}`);
  }
  if (file?.type !== "TradingBeliefRecordFile" || typeof file.falsifierFired !== "boolean" || !file.belief) {
    throw new Error("belief-record-malformed:not-a-TradingBeliefRecordFile");
  }
  let belief;
  try {
    belief = createBeliefRecord(file.belief);
  } catch (error) {
    throw new Error(`belief-record-malformed:${error.message}`);
  }
  if (file.falsifierFired) {
    throw new Error(`belief-falsifier-fired:${belief.falsifier}`);
  }
  return { belief, falsifierFired: file.falsifierFired, recordedAt: file.recordedAt };
}
