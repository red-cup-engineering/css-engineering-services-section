const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const logReturn = (values, from, to) => Math.log(values[to] / values[from]);

export function measureReturnRiskFeatures({ entityValues, benchmarkValues, volumes, referenceValues, index } = {}) {
  const prices = [entityValues, benchmarkValues, referenceValues];
  const valid = (value, strictlyPositive) =>
    (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) &&
    Number.isFinite(Number(value)) && (strictlyPositive ? Number(value) > 0 : Number(value) >= 0);
  if (![...prices, volumes].every(Array.isArray) || !Number.isInteger(index) || index < 60 ||
      prices.some((values) => values.length <= index || values.slice(0, index + 1).some((value) => !valid(value, true))) ||
      volumes.length <= index || volumes.slice(0, index + 1).some((value) => !valid(value, false)))
    throw new TypeError("return-risk-measurement-input-invalid");
  if (volumes.slice(index - 19, index + 1).some((value) => Number(value) === 0))
    throw new TypeError("return-risk-volume-window-incomplete");
  const daily = [];
  for (let cursor = index - 19; cursor <= index; cursor += 1) daily.push(logReturn(entityValues, cursor - 1, cursor));
  const average = mean(daily);
  const volatility = Math.sqrt(daily.reduce((sum, value) => sum + (value - average) ** 2, 0) / Math.max(1, daily.length - 1)) * Math.sqrt(252);
  const peak = Math.max(...entityValues.slice(index - 59, index + 1));
  const averageVolume = mean(volumes.slice(index - 19, index + 1).map((value) => Math.max(1, Number(value))));
  const result = Object.freeze({
    type: "ReturnRiskFeatureMeasurement",
    version: 1,
    features: Object.freeze({
      return5: logReturn(entityValues, index - 5, index),
      return20: logReturn(entityValues, index - 20, index),
      return60: logReturn(entityValues, index - 60, index),
      relativeReturn20: logReturn(entityValues, index - 20, index) - logReturn(benchmarkValues, index - 20, index),
      relativeReturn60: logReturn(entityValues, index - 60, index) - logReturn(benchmarkValues, index - 60, index),
      volatility20Annualized: volatility,
      drawdown60: entityValues[index] / peak - 1,
      volumeShock20: Math.log(Math.max(1, Number(volumes[index])) / averageVolume),
      referenceGap: Number(referenceValues[index]) / Number(entityValues[index]) - 1,
    }),
    effect: "measurement-only",
  });
  if (Object.values(result.features).some((value) => !Number.isFinite(value)))
    throw new RangeError("return-risk-nonfinite-feature-refused");
  return result;
}
