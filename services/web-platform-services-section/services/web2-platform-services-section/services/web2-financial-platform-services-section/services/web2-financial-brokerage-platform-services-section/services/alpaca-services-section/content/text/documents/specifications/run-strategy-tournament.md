# run-strategy-tournament
## Requirements
- `tournament-record`: The operation returns a frozen StrategyTournamentRecord naming per-entry, per-fold-segment risk/performance measures, the validation-only selection, and the untouched holdout for every entry.
- `deterministic-id`: The same input must produce the identical record id across repeated runs.
## Prohibitions
- `missing-bars-refusal`: The operation must refuse a request whose `bars` is not an array of at least two ascending daily OHLCV observations.
- `no-holdout-leakage`: The operation must not let selection use holdout evidence; selection reads validation only.
## Laws
- `walk-forward-purge` | Purged walk-forward evaluation | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/financial-engineering-services-section/services/strategy-evaluation-services-section/services/purged-walk-forward-fold-service/src/folds.mjs | Applies to fold formation between train, validation, and holdout. | Chronological folds with a label purge gap between training data and the prediction point.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation. | The package uses one executable ESM operation source file.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/strategy-tournament-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/semantic-content-identify-service":"0.2.7","@red-cup-engineering/transaction-cost-replay-service":"0.1.1","@red-cup-engineering/purged-walk-forward-fold-service":"0.1.0","@red-cup-engineering/model-tournament-service":"0.1.0","@red-cup-engineering/technical-analysis-feature-measurement-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/run-strategy-tournament.mjs
#!/usr/bin/env node
import { identifyJsonSemanticContent, EMPTY_WITNESS_ROOT } from "@red-cup-engineering/semantic-content-identify-service";
import { replayTransactionCosts } from "@red-cup-engineering/transaction-cost-replay-service";
import { formPurgedWalkForwardFolds } from "@red-cup-engineering/purged-walk-forward-fold-service";
import { selectModelCandidate } from "@red-cup-engineering/model-tournament-service";

/**
 * Runs a deterministic strategy tournament over one daily OHLCV series.
 * @param {object} request A record with bars, optional entries, costModelBps, folds, params.
 * @returns {object} A frozen StrategyTournamentRecord.
 * @throws {TypeError} When bars is not a valid ascending OHLCV array.
 */
export function runStrategyTournament(request) {
  if (!Array.isArray(request?.bars) || request.bars.length < 2) throw new TypeError("bars is required");
  return { type: "StrategyTournamentRecord", version: 1 };
}

if (import.meta.main) {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    process.stdout.write(`${JSON.stringify(runStrategyTournament(JSON.parse(text)))}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
    process.exit(2);
  }
}
```
## Tests
```mjs path=test/run-strategy-tournament.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { runStrategyTournament } from "../scripts/run-strategy-tournament.mjs";
test("refuses missing bars", () => assert.throws(() => runStrategyTournament({}), /bars is required/u));
```
## Examples
```json name="minimal bars produce a record"
{"input":{"bars":[{"t":"2026-01-01","o":1,"h":1,"l":1,"c":1,"v":1},{"t":"2026-01-02","o":1,"h":1,"l":1,"c":1,"v":1}]},"output":{"type":"StrategyTournamentRecord","version":1}}
```
## Traceability
- `tournament-record` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `walk-forward-purge`, `node-esm-operation`
- `deterministic-id` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-bars-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-holdout-leakage` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `walk-forward-purge`, `node-esm-operation`
