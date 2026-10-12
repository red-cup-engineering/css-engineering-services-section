#!/usr/bin/env node
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";

const JOURNAL_ROOT = new URL("..", import.meta.url).pathname;
const RECORD_TYPE = "paper-loop-deployment";

/**
 * Record the 2026-09-01 cold-red-gate paper-loop deployment receipt through
 * the semiotic-eavt store, in the alpaca-services-section's own custody.
 *
 * @returns {{id: string}} the address that holds the receipt.
 */
export function recordColdRedGateDeployment() {
  const recordedAt = new Date().toISOString();
  return { id: put(JOURNAL_ROOT, RECORD_TYPE, {
      timestamp: recordedAt,
      host: "cold-red-gate",
      inRepoCommit: "326ebef0b3510ac381a77871e47e551e3b7d7f88",
      units: [
        {
          service: "alpaca-esther-paper-trading-loop.service",
          timer: "alpaca-esther-paper-trading-loop.timer",
          deployDirectory: "/home/emsenn/561-group/services/alpaca-esther-paper-trading-loop",
          pinnedPackage: "@red-cup-engineering/alpaca-esther-paper-trading-loop@0.1.3",
          killSwitchPin: "@red-cup-engineering/alpaca-account-kill-switch-service@0.1.0",
          nextScheduledRunUtc: "2026-09-01T13:01:16Z",
        },
        {
          service: "alpaca-esther-paper-redistributor-loop.service",
          timer: "alpaca-esther-paper-redistributor-loop.timer",
          deployDirectory: "/home/emsenn/561-group/services/alpaca-esther-paper-redistributor-loop",
          pinnedPackage: "@red-cup-engineering/alpaca-esther-paper-redistributor-loop@0.1.0",
          killSwitchPin: "@red-cup-engineering/alpaca-account-kill-switch-service@0.1.0",
          nextScheduledRunUtc: "2026-09-01T13:00:06Z",
        },
      ],
      credentials: {
        path: "%h/.config/alpaca-esther-paper.env",
        mode: "0600",
        variableNames: ["ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY", "ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET"],
        transferredFrom: "/home/emsenn/info/.env",
        transferMethod: "node --env-file piped directly into ssh cat, no echo/tee/printing",
      },
      killSwitchBaseline: {
        finding: "the published @red-cup-engineering/alpaca-account-kill-switch-service@0.1.0 tarball bundles stale dev data/state (a prior 100324.37 high-water mark and the 2026-07-23 false-positive tripped records) -- a packaging hygiene defect, filed separately, not fixed here.",
        remediation: "cleared data/state/ in both deploy trees' installed copies before the first pre-check, so this host establishes its own baseline independent of the laptop or the tarball's bundled state.",
        tradingLoop: { equity: 101506.07, highWaterMark: 101506.07, asOf: "2026-09-01T03:02:43.540Z" },
        redistributorLoop: { equity: 101506.07, highWaterMark: 101506.07, asOf: "2026-09-01T03:03:05.331Z" },
        accountNumberPrefix: "PA",
      },
      registryVerification: {
        registry: "https://registry.561.group",
        strayResolvedUrls: 0,
      },
    }) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = recordColdRedGateDeployment();
  console.log(JSON.stringify(result, null, 2));
}
