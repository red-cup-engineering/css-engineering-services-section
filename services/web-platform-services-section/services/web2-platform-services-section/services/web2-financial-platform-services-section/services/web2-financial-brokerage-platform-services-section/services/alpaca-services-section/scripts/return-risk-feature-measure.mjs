const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const logReturn = (values, from, to) => Math.log(values[to] / values[from]);

export function measureReturnRiskFeatures({ entityValues, benchmarkValues, volumes, referenceValues, index } = {}) {
  if (![entityValues, benchmarkValues, volumes, referenceValues].every(Array.isArray) || !Number.isInteger(index) || index < 60 || [entityValues, benchmarkValues, volumes, referenceValues].some((values) => values.length <= index || values.slice(0, index + 1).some((value) => !Number.isFinite(Number(value))))) throw new TypeError("return-risk-measurement-input-invalid");
  const daily = [];
  for (let cursor = index - 19; cursor <= index; cursor += 1) daily.push(logReturn(entityValues, cursor - 1, cursor));
  const average = mean(daily);
  const volatility = Math.sqrt(daily.reduce((sum, value) => sum + (value - average) ** 2, 0) / Math.max(1, daily.length - 1)) * Math.sqrt(252);
  const peak = Math.max(...entityValues.slice(index - 59, index + 1));
  const averageVolume = mean(volumes.slice(index - 19, index + 1).map((value) => Math.max(1, Number(value))));
  return Object.freeze({
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
}
