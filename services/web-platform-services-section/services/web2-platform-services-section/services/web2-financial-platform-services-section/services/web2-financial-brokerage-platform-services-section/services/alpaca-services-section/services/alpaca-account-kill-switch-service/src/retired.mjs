/**
 * Compatibility marker for the retired persisted-high-water-mark gate.
 * Risk admission belongs at the broker effect boundary, where current capital,
 * buying power, and open positions are available under an active authority.
 */
export const RETIRED_BROKERAGE_HIGH_WATER_MARK_GATE = Object.freeze({
  type: "RetiredBrokerageHighWaterMarkGate",
  version: 1,
  replacement: "brokerage-execution-transport-service.assessCurrentExecutionCapacity",
  effect: "no-account-read-no-persisted-state-no-timer-control",
});
