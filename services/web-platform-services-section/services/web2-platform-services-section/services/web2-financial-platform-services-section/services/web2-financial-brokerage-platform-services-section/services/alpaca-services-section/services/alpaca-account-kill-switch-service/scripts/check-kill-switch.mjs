#!/usr/bin/env node

// Retired compatibility entry point.  The old implementation compared current
// equity with a persisted high-water mark and then disabled unrelated timers.
// That is neither a current-capital proof nor a valid response to transfers or
// broker account resets.  Order admission now happens inside
// brokerage-execution-transport-service from just-in-time account and position
// observations under the exact contract and authority grant.

process.stdout.write(`${JSON.stringify({
  type: "RetiredBrokerageHighWaterMarkGate",
  version: 1,
  disposition: "retired-no-side-effects",
  replacement: "brokerage-execution-transport-service.assessCurrentExecutionCapacity",
})}\n`);
