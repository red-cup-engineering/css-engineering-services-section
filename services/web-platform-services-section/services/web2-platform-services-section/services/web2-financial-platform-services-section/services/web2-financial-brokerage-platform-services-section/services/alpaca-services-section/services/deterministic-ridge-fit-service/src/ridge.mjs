const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || Object.is(number, -0)) throw new TypeError(`${label}-invalid`);
  return number;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const deviation = (values) => {
  const center = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / Math.max(1, values.length - 1));
};

function solve(matrix, vector) {
  const size = vector.length, augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-12) throw new RangeError("singular-training-matrix");
    for (let cursor = column; cursor <= size; cursor += 1) augmented[column][cursor] /= divisor;
    for (let row = 0; row < size; row += 1) if (row !== column) {
      const factor = augmented[row][column];
      for (let cursor = column; cursor <= size; cursor += 1) augmented[row][cursor] -= factor * augmented[column][cursor];
    }
  }
  return augmented.map((row) => row[size]);
}

export function fitDeterministicRidge({ samples, lambda = 1 } = {}) {
  if (!Array.isArray(samples) || samples.length < 2 || !Number.isFinite(Number(lambda)) || Number(lambda) <= 0) throw new TypeError("ridge-fit-input-invalid");
  const width = samples[0]?.features?.length;
  if (!Number.isInteger(width) || width < 1 || samples.some(({ features, target }) => !Array.isArray(features) || features.length !== width || features.some((value) => !Number.isFinite(Number(value))) || !Number.isFinite(Number(target)))) throw new TypeError("ridge-sample-invalid");
  const centers = Array.from({ length: width }, (_, column) => mean(samples.map(({ features }) => finite(features[column], "feature"))));
  const scales = Array.from({ length: width }, (_, column) => deviation(samples.map(({ features }) => Number(features[column]))) || 1);
  const rows = samples.map(({ features }) => [1, ...features.map((value, column) => (Number(value) - centers[column]) / scales[column])]);
  const dimension = width + 1, matrix = Array.from({ length: dimension }, () => Array(dimension).fill(0)), vector = Array(dimension).fill(0);
  rows.forEach((row, sample) => {
    for (let left = 0; left < dimension; left += 1) {
      vector[left] += row[left] * Number(samples[sample].target);
      for (let right = 0; right < dimension; right += 1) matrix[left][right] += row[left] * row[right];
    }
  });
  for (let index = 1; index < dimension; index += 1) matrix[index][index] += Number(lambda);
  return Object.freeze({ type: "DeterministicRidgeModel", version: 1, width, lambda: Number(lambda), centers: Object.freeze(centers), scales: Object.freeze(scales), coefficients: Object.freeze(solve(matrix, vector)), effect: "model-only" });
}

export function predictDeterministicRidge(model, features) {
  if (model?.type !== "DeterministicRidgeModel" || !Array.isArray(features) || features.length !== model.width || features.some((value) => !Number.isFinite(Number(value)))) throw new TypeError("ridge-prediction-input-invalid");
  return model.coefficients[0] + features.reduce((sum, value, index) => sum + model.coefficients[index + 1] * ((Number(value) - model.centers[index]) / model.scales[index]), 0);
}
