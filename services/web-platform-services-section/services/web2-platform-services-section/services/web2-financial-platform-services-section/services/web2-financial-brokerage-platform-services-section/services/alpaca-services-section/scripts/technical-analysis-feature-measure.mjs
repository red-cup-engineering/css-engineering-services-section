const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const deviation = (values) => {
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / Math.max(1, values.length - 1));
};
const emaSeries = (values, period) => {
  const alpha = 2 / (period + 1);
  const output = [values[0]];
  for (let index = 1; index < values.length; index += 1) output.push(alpha * values[index] + (1 - alpha) * output[index - 1]);
  return output;
};
const finiteSeries = (values, label, index, positive = false) => {
  if (!Array.isArray(values) || values.length <= index || values.slice(0, index + 1).some((value) => !Number.isFinite(Number(value)) || (positive && Number(value) <= 0))) {
    throw new TypeError(`${label}-series-invalid`);
  }
  return values.map(Number);
};

export function measureTechnicalAnalysisFeatures({ closes, highs, lows, volumes, index } = {}) {
  if (!Number.isInteger(index) || index < 60) throw new TypeError("technical-analysis-index-invalid");
  closes = finiteSeries(closes, "close", index, true);
  highs = finiteSeries(highs, "high", index, true);
  lows = finiteSeries(lows, "low", index, true);
  volumes = finiteSeries(volumes, "volume", index);
  if (Array.from({ length: index + 1 }, (_, cursor) => cursor).some((cursor) => lows[cursor] > highs[cursor] || closes[cursor] < lows[cursor] || closes[cursor] > highs[cursor])) {
    throw new TypeError("technical-analysis-ohlc-domain-invalid");
  }

  let gains = 0;
  let losses = 0;
  for (let cursor = index - 13; cursor <= index; cursor += 1) {
    const change = closes[cursor] - closes[cursor - 1];
    gains += Math.max(0, change);
    losses += Math.max(0, -change);
  }
  const rsi14 = gains === 0 && losses === 0 ? 0.5 : losses === 0 ? 1 : 1 - 1 / (1 + gains / losses);

  const history = closes.slice(0, index + 1);
  const fast = emaSeries(history, 12);
  const slow = emaSeries(history, 26);
  const macd = fast.map((value, cursor) => value - slow[cursor]);
  const signal = emaSeries(macd, 9);
  const currentClose = closes[index];

  const close20 = closes.slice(index - 19, index + 1);
  const average20 = mean(close20);
  const closeDeviation20 = deviation(close20);
  const high14 = Math.max(...highs.slice(index - 13, index + 1));
  const low14 = Math.min(...lows.slice(index - 13, index + 1));
  const trueRanges = [];
  for (let cursor = index - 13; cursor <= index; cursor += 1) {
    trueRanges.push(Math.max(highs[cursor] - lows[cursor], Math.abs(highs[cursor] - closes[cursor - 1]), Math.abs(lows[cursor] - closes[cursor - 1])));
  }
  const volume20 = volumes.slice(index - 19, index + 1);
  const volumeDeviation20 = deviation(volume20);
  const xMean = 9.5;
  const yMean = average20;
  let covariance = 0;
  let xVariance = 0;
  for (let cursor = 0; cursor < 20; cursor += 1) {
    covariance += (cursor - xMean) * (close20[cursor] - yMean);
    xVariance += (cursor - xMean) ** 2;
  }

  return Object.freeze({
    type: "TechnicalAnalysisFeatureMeasurement",
    version: 1,
    features: Object.freeze({
      rsi14Centered: rsi14 - 0.5,
      macdFraction: macd[index] / currentClose,
      macdSignalSpreadFraction: (macd[index] - signal[index]) / currentClose,
      bollingerZ20: closeDeviation20 === 0 ? 0 : (currentClose - average20) / closeDeviation20,
      atr14Fraction: mean(trueRanges) / currentClose,
      stochasticK14Centered: high14 === low14 ? 0 : (currentClose - low14) / (high14 - low14) - 0.5,
      trendSlope20Fraction: (covariance / xVariance) / currentClose,
      volumeZ20: volumeDeviation20 === 0 ? 0 : (volumes[index] - mean(volume20)) / volumeDeviation20,
    }),
    observedThroughIndex: index,
    futureObservationsUsed: false,
    effect: "measurement-only",
  });
}
