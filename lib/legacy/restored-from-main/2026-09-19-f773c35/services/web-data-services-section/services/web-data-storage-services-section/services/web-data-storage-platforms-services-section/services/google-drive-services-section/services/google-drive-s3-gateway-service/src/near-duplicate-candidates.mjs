import { extname, basename } from "node:path";

const SCHEMA_VERSION = "near-duplicate-candidates/v1";
const DEFAULT_THRESHOLDS = Object.freeze({
  minimumNameScore: 0.72,
  minimumSizeRatio: 0.75,
  exactStemMinimumSizeRatio: 0.5,
});

const FAMILY_BY_EXTENSION = new Map([
  [".aac", "audio"], [".flac", "audio"], [".m4a", "audio"], [".mp3", "audio"],
  [".oga", "audio"], [".ogg", "audio"], [".opus", "audio"], [".wav", "audio"],
  [".avif", "image"], [".gif", "image"], [".jpeg", "image"], [".jpg", "image"],
  [".png", "image"], [".svg", "image"], [".tif", "image"], [".tiff", "image"],
  [".webp", "image"],
  [".mkv", "video"], [".mov", "video"], [".mp4", "video"], [".webm", "video"],
  [".epub", "document"], [".pdf", "document"],
  [".doc", "document"], [".docx", "document"], [".odt", "document"],
  [".md", "text"], [".rtf", "text"], [".txt", "text"],
  [".7z", "archive"], [".gz", "archive"], [".rar", "archive"], [".tar", "archive"],
  [".zip", "archive"],
]);

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function rounded(value) {
  return Number(value.toFixed(6));
}

function normalizedStem(path) {
  const extension = extname(path);
  let stem = basename(path, extension).normalize("NFKC").toLocaleLowerCase("und").trim();
  let previous;
  do {
    previous = stem;
    stem = stem
      .replace(/(?:[\s._-]*(?:copy|duplicate)(?:[\s._-]*\d+)?)$/u, "")
      .replace(/(?:[\s._-]*\(\s*(?:copy\s*)?\d+\s*\))$/u, "")
      .replace(/(?:_{1,2}|[\s.-])\d+$/u, "")
      .trim();
  } while (stem !== previous);
  return stem.replace(/[\s._-]+/gu, " ").trim();
}

function nameTokens(stem) {
  return [...new Set(stem.match(/[\p{L}\p{N}]+/gu) ?? [])].sort(compareText);
}

function nameTrigrams(stem) {
  const compact = stem.replace(/\s+/gu, " ");
  if (compact.length < 3) return compact ? [compact] : [];
  const values = [];
  for (let index = 0; index <= compact.length - 3; index += 1) {
    values.push(compact.slice(index, index + 3));
  }
  return [...new Set(values)].sort(compareText);
}

function setSimilarity(left, right, mode) {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const intersection = left.reduce((count, value) => count + Number(rightSet.has(value)), 0);
  if (mode === "dice") return (2 * intersection) / (left.length + right.length);
  return intersection / (left.length + right.length - intersection);
}

function mediaFamily(file) {
  if (typeof file.mediaTypeHint === "string") {
    const topLevel = file.mediaTypeHint.split("/", 1)[0];
    if (["audio", "image", "video"].includes(topLevel)) return topLevel;
    if (file.mediaTypeHint === "application/pdf" || file.mediaTypeHint === "application/epub+zip") {
      return "document";
    }
  }
  return FAMILY_BY_EXTENSION.get((file.extension ?? extname(file.path)).toLowerCase()) ?? "other";
}

function sizeBand(byteLength) {
  if (byteLength === 0) return 0;
  return Math.floor(Math.log2(byteLength) * 4);
}

function addPosting(index, key, itemIndex) {
  const posting = index.get(key) ?? [];
  posting.push(itemIndex);
  index.set(key, posting);
}

function assertCensus(census) {
  if (census?.schemaVersion !== "migration-census/v1" || !Array.isArray(census.files)) {
    throw new TypeError('census must use schemaVersion "migration-census/v1" and contain files');
  }
  for (const file of census.files) {
    if (typeof file.path !== "string" || typeof file.sha256 !== "string"
      || !Number.isSafeInteger(file.byteLength) || file.byteLength < 0) {
      throw new TypeError("every census file must have path, sha256, and a non-negative safe byteLength");
    }
  }
}

function prepareFingerprints(records, byPath) {
  if (!Array.isArray(records)) throw new TypeError("perceptualFingerprints must be an array");
  const byItem = new Map();
  for (const record of records) {
    if (!byPath.has(record?.path)) throw new RangeError(`fingerprint path is absent from census: ${record?.path}`);
    if (typeof record.algorithm !== "string" || record.algorithm.length === 0 || record.value === undefined) {
      throw new TypeError("fingerprints require path, algorithm, and value");
    }
    if (record.distance !== undefined && typeof record.distance !== "function") {
      throw new TypeError("fingerprint distance must be a function when supplied");
    }
    if (record.threshold !== undefined && (!Number.isFinite(record.threshold) || record.threshold < 0)) {
      throw new TypeError("fingerprint threshold must be a non-negative finite number when supplied");
    }
    const itemIndex = byPath.get(record.path);
    const entries = byItem.get(itemIndex) ?? [];
    if (entries.some(({ algorithm }) => algorithm === record.algorithm)) {
      throw new RangeError(`multiple ${record.algorithm} fingerprints supplied for ${record.path}`);
    }
    entries.push(record);
    entries.sort((left, right) => compareText(left.algorithm, right.algorithm));
    byItem.set(itemIndex, entries);
  }
  return byItem;
}

function fingerprintEvidence(left, right) {
  const rightByAlgorithm = new Map(right.map((record) => [record.algorithm, record]));
  const evidence = [];
  for (const leftRecord of left) {
    const rightRecord = rightByAlgorithm.get(leftRecord.algorithm);
    if (!rightRecord) continue;
    const distanceFunction = leftRecord.distance ?? rightRecord.distance;
    if (!distanceFunction) continue;
    const distance = distanceFunction(leftRecord.value, rightRecord.value);
    if (!Number.isFinite(distance) || distance < 0) {
      throw new RangeError(`fingerprint distance for ${leftRecord.algorithm} must be non-negative and finite`);
    }
    const threshold = leftRecord.threshold ?? rightRecord.threshold ?? null;
    evidence.push({
      algorithm: leftRecord.algorithm,
      distance: rounded(distance),
      threshold,
      withinThreshold: threshold === null ? null : distance <= threshold,
    });
  }
  return evidence;
}

/**
 * Produce bounded, deterministic review candidates from a migration census.
 *
 * Results are advisory similarity evidence only. The function does not read file
 * contents, infer missing perceptual fingerprints, or make disposition decisions.
 */
export function createNearDuplicateCandidateReport(census, {
  maxCandidatesPerItem = 4,
  maxPostingItems = 64,
  thresholds = {},
  perceptualFingerprints = [],
} = {}) {
  assertCensus(census);
  if (!Number.isInteger(maxCandidatesPerItem) || maxCandidatesPerItem < 1) {
    throw new TypeError("maxCandidatesPerItem must be a positive integer");
  }
  if (!Number.isInteger(maxPostingItems) || maxPostingItems < maxCandidatesPerItem) {
    throw new TypeError("maxPostingItems must be an integer at least maxCandidatesPerItem");
  }
  const effectiveThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  for (const [name, value] of Object.entries(effectiveThresholds)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new TypeError(`${name} must be a finite number from zero through one`);
    }
  }

  const files = [...census.files].sort((left, right) => compareText(left.path, right.path));
  const items = files.map((file) => {
    const stem = normalizedStem(file.path);
    return {
      file,
      family: mediaFamily(file),
      stem,
      tokens: nameTokens(stem),
      trigrams: nameTrigrams(stem),
      band: sizeBand(file.byteLength),
    };
  });
  const byPath = new Map(items.map(({ file }, index) => [file.path, index]));
  const fingerprints = prepareFingerprints(perceptualFingerprints, byPath);
  const featureIndex = new Map();
  const fingerprintIndex = new Map();

  items.forEach((item, itemIndex) => {
    const bands = [item.band - 2, item.band - 1, item.band, item.band + 1, item.band + 2];
    for (const band of bands) {
      addPosting(featureIndex, `${item.family}|${band}|stem|${item.stem}`, itemIndex);
      for (const token of item.tokens.slice(0, 12)) addPosting(featureIndex, `${item.family}|${band}|token|${token}`, itemIndex);
      for (const trigram of item.trigrams.slice(0, 32)) addPosting(featureIndex, `${item.family}|${band}|tri|${trigram}`, itemIndex);
    }
    for (const record of fingerprints.get(itemIndex) ?? []) {
      addPosting(fingerprintIndex, `${item.family}|${record.algorithm}`, itemIndex);
    }
  });

  const rawPairs = new Map();
  function considerPair(leftIndex, rightIndex) {
    if (leftIndex === rightIndex) return;
    const low = Math.min(leftIndex, rightIndex);
    const high = Math.max(leftIndex, rightIndex);
    const left = items[low];
    const right = items[high];
    if (left.family !== right.family || left.file.sha256 === right.file.sha256) return;
    const sizeRatio = left.file.byteLength === 0 && right.file.byteLength === 0
      ? 1
      : Math.min(left.file.byteLength, right.file.byteLength) / Math.max(left.file.byteLength, right.file.byteLength);
    const tokenSimilarity = setSimilarity(left.tokens, right.tokens, "jaccard");
    const trigramSimilarity = setSimilarity(left.trigrams, right.trigrams, "dice");
    const stemsEqual = left.stem.length > 0 && left.stem === right.stem;
    const nameScore = stemsEqual ? 1 : 0.55 * tokenSimilarity + 0.45 * trigramSimilarity;
    const perceptual = fingerprintEvidence(fingerprints.get(low) ?? [], fingerprints.get(high) ?? []);
    const perceptualMatch = perceptual.some(({ withinThreshold }) => withinThreshold === true);
    const nameMatch = sizeRatio >= effectiveThresholds.minimumSizeRatio
      && nameScore >= effectiveThresholds.minimumNameScore;
    const exactStemMatch = stemsEqual && sizeRatio >= effectiveThresholds.exactStemMinimumSizeRatio;
    if (!nameMatch && !exactStemMatch && !perceptualMatch) return;
    const perceptualScore = perceptualMatch ? 1 : 0;
    const score = rounded(Math.max(perceptualScore, (0.8 * nameScore) + (0.2 * sizeRatio)));
    rawPairs.set(`${low}:${high}`, {
      pair: [left.file, right.file].map(({ path, sha256, byteLength }) => ({ path, sha256, byteLength })),
      mediaFamily: left.family,
      evidence: {
        normalizedStemEqual: stemsEqual,
        tokenJaccard: rounded(tokenSimilarity),
        trigramDice: rounded(trigramSimilarity),
        byteSizeRatio: rounded(sizeRatio),
        perceptualFingerprints: perceptual,
      },
      score,
    });
  }

  for (const posting of featureIndex.values()) {
    const lookBehind = Math.min(maxPostingItems, maxCandidatesPerItem * 2);
    for (let right = 1; right < posting.length; right += 1) {
      for (let left = Math.max(0, right - lookBehind); left < right; left += 1) {
        considerPair(posting[left], posting[right]);
      }
    }
  }
  for (const posting of fingerprintIndex.values()) {
    const lookBehind = Math.min(maxPostingItems, maxCandidatesPerItem * 2);
    for (let right = 1; right < posting.length; right += 1) {
      for (let left = Math.max(0, right - lookBehind); left < right; left += 1) {
        considerPair(posting[left], posting[right]);
      }
    }
  }

  const ranked = [...rawPairs.values()].sort((left, right) =>
    right.score - left.score
    || compareText(left.pair[0].path, right.pair[0].path)
    || compareText(left.pair[1].path, right.pair[1].path));
  const counts = new Map();
  const candidates = [];
  for (const candidate of ranked) {
    const [left, right] = candidate.pair;
    if ((counts.get(left.path) ?? 0) >= maxCandidatesPerItem
      || (counts.get(right.path) ?? 0) >= maxCandidatesPerItem) continue;
    candidates.push(candidate);
    counts.set(left.path, (counts.get(left.path) ?? 0) + 1);
    counts.set(right.path, (counts.get(right.path) ?? 0) + 1);
  }
  candidates.sort((left, right) =>
    compareText(left.pair[0].path, right.pair[0].path)
    || compareText(left.pair[1].path, right.pair[1].path));

  return {
    schemaVersion: SCHEMA_VERSION,
    sourceSchemaVersion: census.schemaVersion,
    advisoryOnly: true,
    thresholds: {
      ...effectiveThresholds,
      maxCandidatesPerItem,
      maxPostingItems,
    },
    candidates,
    summary: {
      inputFileCount: files.length,
      candidateCount: candidates.length,
      itemsWithCandidates: counts.size,
    },
  };
}
