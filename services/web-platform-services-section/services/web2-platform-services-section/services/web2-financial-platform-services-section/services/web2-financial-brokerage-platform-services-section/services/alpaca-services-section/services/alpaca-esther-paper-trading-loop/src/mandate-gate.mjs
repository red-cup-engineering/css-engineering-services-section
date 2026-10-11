import { readFileSync } from "node:fs";

/**
 * Reads the loop's persisted `PortfolioAllocationMandate` record file.
 * @param {string} mandateRecordPath Absolute path to a `MandatePortfolioAllocationRecordFile`.
 * @returns {Readonly<object>} the mandate object, ready for `allocateMandatePortfolio`.
 * @throws {Error} `mandate-record-missing:<path>` when the file cannot be read.
 * @throws {Error} `mandate-record-malformed:<message>` when the file is not a valid mandate record file.
 */
export function loadMandate(mandateRecordPath) {
  let text;
  try {
    text = readFileSync(mandateRecordPath, "utf8");
  } catch (error) {
    throw new Error(`mandate-record-missing:${mandateRecordPath}:${error.message}`);
  }
  let file;
  try {
    file = JSON.parse(text);
  } catch (error) {
    throw new Error(`mandate-record-malformed:invalid-json:${error.message}`);
  }
  if (file?.type !== "MandatePortfolioAllocationRecordFile" || file.mandate?.type !== "PortfolioAllocationMandate") {
    throw new Error("mandate-record-malformed:not-a-MandatePortfolioAllocationRecordFile");
  }
  return Object.freeze({ ...file.mandate });
}
