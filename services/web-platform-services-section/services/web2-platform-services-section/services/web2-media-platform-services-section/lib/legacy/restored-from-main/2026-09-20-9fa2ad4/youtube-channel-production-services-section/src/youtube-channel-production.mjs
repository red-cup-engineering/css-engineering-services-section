/**
 * @module youtube-channel-production
 * Domain semantics shared by every channel that parameterizes this one
 * production program with a {@link ChannelSpec}: spec validation, pure
 * next-topic ranking, and the civil-day release-slot arithmetic the five
 * prior channel packages each duplicated locally. Pure data-in/data-out;
 * no I/O, no network, no clock reads beyond an explicitly supplied `now`.
 */

const WEEKDAYS = Object.freeze(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
const NARRATION_VOICES = Object.freeze(["flite", "cloudflare-aura-1"]);
const INFERENCE_ROUTES = Object.freeze(["inference-dispatch"]);
const PRESENTATION_TEXT_KEYS = Object.freeze(["backgroundColor", "foregroundColor"]);
const PRESENTATION_INT_KEYS = Object.freeze(["fontSize", "width", "height"]);

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function requiredPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${label} must be a positive integer`);
  return value;
}

function requiredStringArray(value, label, { nonEmpty = true } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) throw new TypeError(`${label} must be a non-empty array of strings`);
  return Object.freeze(value.map((entry, index) => requiredText(entry, `${label}[${index}]`)));
}

function requiredEnum(value, allowed, label) {
  if (typeof value !== "string" || !allowed.includes(value)) throw new TypeError(`${label} must be one of ${allowed.join(", ")}`);
  return value;
}

function validateCadence(cadence) {
  if (!cadence || typeof cadence !== "object" || Array.isArray(cadence)) throw new TypeError("cadence must be an object");
  const releaseWeekdays = requiredStringArray(cadence.releaseWeekdays, "cadence.releaseWeekdays");
  for (const day of releaseWeekdays) if (!WEEKDAYS.includes(day)) throw new TypeError(`cadence.releaseWeekdays contains an unrecognized weekday: ${day}`);
  if (!Number.isInteger(cadence.releaseHourUtc) || cadence.releaseHourUtc < 0 || cadence.releaseHourUtc > 23) {
    throw new TypeError("cadence.releaseHourUtc must be an integer hour 0-23");
  }
  return Object.freeze({ releaseWeekdays, releaseHourUtc: cadence.releaseHourUtc });
}

function validateCorpus(corpus) {
  if (!corpus || typeof corpus !== "object" || Array.isArray(corpus)) throw new TypeError("corpus must be an object");
  const literatureLedger = requiredText(corpus.literatureLedger, "corpus.literatureLedger");
  const carriers = requiredStringArray(corpus.carriers, "corpus.carriers", { nonEmpty: false });
  const normalized = { literatureLedger, carriers };
  if (corpus.book !== undefined) normalized.book = requiredText(corpus.book, "corpus.book");
  return Object.freeze(normalized);
}

function validatePresentation(presentation) {
  if (!presentation || typeof presentation !== "object" || Array.isArray(presentation)) throw new TypeError("presentation must be an object");
  const normalized = {};
  for (const key of PRESENTATION_TEXT_KEYS) normalized[key] = requiredText(presentation[key], `presentation.${key}`);
  for (const key of PRESENTATION_INT_KEYS) normalized[key] = requiredPositiveInteger(presentation[key], `presentation.${key}`);
  return Object.freeze(normalized);
}

function validateVoice(voice) {
  if (!voice || typeof voice !== "object" || Array.isArray(voice)) throw new TypeError("voice must be an object");
  return Object.freeze({ narration: requiredEnum(voice.narration, NARRATION_VOICES, "voice.narration") });
}

function validateVideo(video) {
  if (!video || typeof video !== "object" || Array.isArray(video) || video.renderer !== "persistent-notebook-channel-video") throw new TypeError("video must be a persistent-notebook channel-video binding");
  const agentCardUrlEnv = requiredText(video.agentCardUrlEnv, "video.agentCardUrlEnv");
  if (!/^[A-Z][A-Z0-9_]*$/u.test(agentCardUrlEnv)) throw new TypeError("video.agentCardUrlEnv must name an environment binding");
  if (typeof video.agentCardIdentity !== "string" || !/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(video.agentCardIdentity)) throw new TypeError("video.agentCardIdentity must be a pinned ni identity");
  return Object.freeze({ renderer: video.renderer, agentCardUrlEnv, agentCardIdentity: video.agentCardIdentity, notebook: requiredText(video.notebook, "video.notebook"), format: requiredEnum(video.format, ["cinematic", "explainer"], "video.format"), style: video.style ?? null, language: requiredEnum(video.language, ["en"], "video.language"), sourceLifecyclePolicy: requiredEnum(video.sourceLifecyclePolicy, ["curated-cumulative-corpus"], "video.sourceLifecyclePolicy"), sourceProviderModule: requiredText(video.sourceProviderModule, "video.sourceProviderModule") });
}

function validateSecrets(secrets) {
  if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) throw new TypeError("secrets must be an object");
  return Object.freeze({
    oauthClientIdName: requiredText(secrets.oauthClientIdName, "secrets.oauthClientIdName"),
    oauthClientSecretName: requiredText(secrets.oauthClientSecretName, "secrets.oauthClientSecretName"),
    refreshTokenName: requiredText(secrets.refreshTokenName, "secrets.refreshTokenName"),
  });
}

function validateInference(inference) {
  if (!inference || typeof inference !== "object" || Array.isArray(inference)) throw new TypeError("inference must be an object");
  const normalized = { route: requiredEnum(inference.route, INFERENCE_ROUTES, "inference.route") };
  if (inference.model !== undefined) normalized.model = requiredText(inference.model, "inference.model");
  return Object.freeze(normalized);
}

/**
 * @typedef {Object} ChannelSpec
 * @property {string} id
 * @property {string} title
 * @property {string} [youtubeChannelId]
 * @property {string} timezone - an IANA timezone name
 * @property {{releaseWeekdays: string[], releaseHourUtc: number}} cadence
 * @property {{literatureLedger: string, carriers: string[], book?: string}} corpus
 * @property {{backgroundColor: string, foregroundColor: string, fontSize: number, width: number, height: number}} presentation
 * @property {{narration: "flite"|"cloudflare-aura-1"}} voice
 * @property {{oauthClientIdName: string, oauthClientSecretName: string, refreshTokenName: string}} secrets
 * @property {{route: "inference-dispatch", model?: string}} inference
 * @property {string} [titleSuffix] - appended to a curriculum lesson's title for its published video title (e.g. " | Mathematics in Relation")
 */

/**
 * Validates and normalizes one channel's production parameters. Every
 * consuming script takes an already-validated spec, so this is the one
 * gate the whole section shares.
 * @param {unknown} spec
 * @returns {Readonly<ChannelSpec>}
 * @throws {TypeError} on any missing, malformed, or unsupported field
 */
export function validateChannelSpec(spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new TypeError("channel spec must be an object");
  const timezone = requiredText(spec.timezone, "timezone");
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  } catch {
    throw new TypeError(`timezone is not a recognized IANA timezone: ${timezone}`);
  }
  const normalized = {
    id: requiredText(spec.id, "id"),
    title: requiredText(spec.title, "title"),
    timezone,
    cadence: validateCadence(spec.cadence),
    corpus: validateCorpus(spec.corpus),
    presentation: validatePresentation(spec.presentation),
    ...(spec.video === undefined ? { voice: validateVoice(spec.voice) } : { video: validateVideo(spec.video) }),
    secrets: validateSecrets(spec.secrets),
    inference: validateInference(spec.inference),
  };
  if (spec.youtubeChannelId !== undefined) {
    if (typeof spec.youtubeChannelId !== "string" || !/^UC[A-Za-z0-9_-]{20,}$/u.test(spec.youtubeChannelId)) {
      throw new TypeError("youtubeChannelId, when supplied, must be a real YouTube channel id");
    }
    normalized.youtubeChannelId = spec.youtubeChannelId;
  }
  if (spec.titleSuffix !== undefined) {
    // titleSuffix is concatenated verbatim onto a lesson title (e.g. " | Channel Name"); it is never trimmed like other text fields.
    if (typeof spec.titleSuffix !== "string" || spec.titleSuffix.trim() === "") throw new TypeError("titleSuffix must be a non-empty string");
    normalized.titleSuffix = spec.titleSuffix;
  }
  return Object.freeze(normalized);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * @typedef {Object} RankedTopic
 * @property {string} dedupeKey
 * @property {object} item - the CSL-JSON item
 * @property {number} demand - the resolved demand signal for this candidate
 * @property {number} coverageGap - 0 (already in inventory) or 1 (not yet covered)
 * @property {number} score - demand * coverageGap
 * @property {string} reason - plain-language explanation of the score
 */

/**
 * Pure next-topic ranking: newly included literature candidates (a
 * screening ledger's `screened` rows with `status === "included"`),
 * weighted by an injected demand signal and discounted by whether the
 * channel's inventory already covers that exact candidate. Never reads a
 * clock or the network; `now` is carried only into the returned
 * `rankedAt` for the caller's own receipt.
 * @param {import("./youtube-channel-production.mjs").ChannelSpec} spec - an already-validated spec (only `spec.id` is used, for error messages)
 * @param {{ledger: {screened?: ReadonlyArray<object>}, demand?: Record<string, number>|Map<string, number>, inventory?: ReadonlyArray<{dedupeKey: string}>, now: string}} options
 * @returns {{chosen: Readonly<RankedTopic>, ranked: ReadonlyArray<Readonly<RankedTopic>>, rankedAt: string}}
 * @throws {TypeError} when the ledger carries no included candidate not already covered by inventory
 */
export function selectNextTopic(spec, { ledger, demand, inventory = [], now } = {}) {
  requiredText(spec?.id, "spec.id");
  if (!isRecord(ledger)) throw new TypeError("selectNextTopic requires a screening ledger object");
  if (!Array.isArray(inventory)) throw new TypeError("selectNextTopic requires an array inventory");
  const nowText = requiredText(now, "now");
  const demandFor = (key) => {
    if (demand instanceof Map) return demand.has(key) ? demand.get(key) : 1;
    if (isRecord(demand)) return Object.hasOwn(demand, key) ? demand[key] : 1;
    return 1;
  };
  const covered = new Set(inventory.filter((row) => isRecord(row) && typeof row.dedupeKey === "string").map((row) => row.dedupeKey));
  const screened = Array.isArray(ledger.screened) ? ledger.screened : [];
  const eligible = screened.filter((row) => isRecord(row) && row.status === "included" && typeof row.dedupeKey === "string");
  const ranked = eligible
    .map((row) => {
      const demandValue = demandFor(row.dedupeKey);
      if (!Number.isFinite(demandValue) || demandValue < 0) throw new TypeError(`demand signal for ${row.dedupeKey} must be a non-negative number`);
      const coverageGap = covered.has(row.dedupeKey) ? 0 : 1;
      const score = demandValue * coverageGap;
      const reason = coverageGap === 0
        ? `already produced (inventory carries ${row.dedupeKey}); score 0`
        : `included, demand ${demandValue}, not yet in inventory; score ${score}`;
      return Object.freeze({ dedupeKey: row.dedupeKey, item: row.item, demand: demandValue, coverageGap, score, reason });
    })
    .sort((a, b) => b.score - a.score || a.dedupeKey.localeCompare(b.dedupeKey));
  const chosen = ranked.find((row) => row.score > 0);
  if (!chosen) throw new TypeError(`selectNextTopic found no eligible uncovered included candidate for channel ${spec.id}`);
  return Object.freeze({ chosen, ranked: Object.freeze(ranked), rankedAt: nowText });
}

function civilDayParts(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "long",
  }).formatToParts(instant);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return { civilDay: `${get("year")}-${get("month")}-${get("day")}`, weekday: get("weekday") };
}

/**
 * @typedef {Object} ReleaseSlot
 * @property {string} civilDay - `YYYY-MM-DD` in the channel's timezone
 * @property {string} plannedPublishAt - ISO instant at `cadence.releaseHourUtc` on that civil day
 */

/**
 * The civil-day release-slot arithmetic every channel needs once: the
 * earliest future civil day (in `spec.timezone`) whose weekday is one of
 * `spec.cadence.releaseWeekdays` and is not already present in `claimed`.
 * @param {import("./youtube-channel-production.mjs").ChannelSpec} spec - an already-validated spec
 * @param {ReadonlyArray<string>} claimed - civil days (`YYYY-MM-DD`) already claimed by a prior release
 * @param {string} now - ISO instant to search forward from
 * @returns {Readonly<ReleaseSlot>}
 * @throws {TypeError} when no eligible slot is found within one year
 */
export function nextReleaseSlot(spec, claimed, now) {
  requiredText(spec?.id, "spec.id");
  if (!Array.isArray(claimed)) throw new TypeError("nextReleaseSlot requires an array of claimed civil days");
  const nowInstant = new Date(requiredText(now, "now"));
  if (Number.isNaN(nowInstant.getTime())) throw new TypeError("now must be a valid ISO instant");
  const used = new Set(claimed);
  for (let offset = 0; offset < 370; offset += 1) {
    const candidate = new Date(nowInstant);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    candidate.setUTCHours(spec.cadence.releaseHourUtc, 0, 0, 0);
    if (candidate <= nowInstant) continue;
    const { civilDay, weekday } = civilDayParts(candidate, spec.timezone);
    if (!spec.cadence.releaseWeekdays.includes(weekday) || used.has(civilDay)) continue;
    return Object.freeze({ civilDay, plannedPublishAt: candidate.toISOString() });
  }
  throw new TypeError(`nextReleaseSlot found no eligible release slot for channel ${spec.id} within one year`);
}
