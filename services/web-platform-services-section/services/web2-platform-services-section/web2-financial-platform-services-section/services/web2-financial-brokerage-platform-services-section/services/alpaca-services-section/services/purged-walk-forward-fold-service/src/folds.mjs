const integer = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new TypeError(`${label}-invalid`);
  return number;
};

export function formPurgedWalkForwardFolds({ coordinates, warmup, horizon, cadence = horizon, trainingWindow, validationFraction = 0.5 } = {}) {
  if (!Array.isArray(coordinates) || coordinates.length < 3 || coordinates.some((value, index) => !Number.isFinite(Date.parse(value)) || (index > 0 && Date.parse(value) <= Date.parse(coordinates[index - 1])))) throw new TypeError("ordered-coordinates-required");
  warmup = integer(warmup, "warmup"); horizon = integer(horizon, "horizon"); cadence = integer(cadence, "cadence"); trainingWindow = integer(trainingWindow, "training-window");
  if (!(validationFraction > 0 && validationFraction < 1)) throw new TypeError("validation-fraction-invalid");
  const folds = [];
  for (let prediction = warmup; prediction + horizon < coordinates.length; prediction += cadence) {
    const trainEnd = prediction - horizon;
    const trainStart = Math.max(0, trainEnd - trainingWindow + 1);
    folds.push(Object.freeze({
      trainStart,
      trainEnd,
      prediction,
      outcome: prediction + horizon,
      trainingThrough: coordinates[trainEnd],
      predictedAt: coordinates[prediction],
      outcomeAt: coordinates[prediction + horizon],
    }));
  }
  if (folds.length < 2) throw new RangeError("walk-forward-folds-insufficient");
  const split = Math.max(1, Math.min(folds.length - 1, Math.floor(folds.length * validationFraction)));
  return Object.freeze({ type: "PurgedWalkForwardFolds", version: 1, purge: horizon, folds: Object.freeze(folds), validation: Object.freeze(folds.slice(0, split)), holdout: Object.freeze(folds.slice(split)), shuffled: false, effect: "fold-formation-only" });
}
