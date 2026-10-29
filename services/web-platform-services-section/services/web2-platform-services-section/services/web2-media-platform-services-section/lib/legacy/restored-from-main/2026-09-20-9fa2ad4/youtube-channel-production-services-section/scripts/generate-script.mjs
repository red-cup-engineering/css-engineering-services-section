#!/usr/bin/env node
/**
 * @module generate-script
 * Turns one acquired SourceBundle into a video-rendering 0.2.0 segments
 * JSON script, dispatched as a boilerplate-transform through
 * inference-dispatch-service's run-mechanical-inference bin (free-first
 * providers; never a direct vendor HTTP call from this package).
 */
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const TASK_TYPE = "boilerplate-transform";
const SEGMENT_FIELDS = Object.freeze(["heading", "lines", "narration"]);

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

/**
 * Finds an installed package's own root directory by resolving one of its
 * exported entry points, then walking up until a `package.json` naming
 * that exact package is found -- works even when the package's `exports`
 * map (correctly) does not expose `./package.json` as a subpath.
 * @param {string} packageName
 * @returns {Promise<{root: string, manifest: object}>}
 */
export async function resolvePackageManifest(packageName) {
  let cursor = dirname(fileURLToPath(import.meta.resolve(packageName)));
  for (let depth = 0; depth < 12; depth += 1) {
    const candidate = join(cursor, "package.json");
    try {
      const manifest = JSON.parse(await readFile(candidate, "utf8"));
      if (manifest.name === packageName) return { root: cursor, manifest };
    } catch { /* not this directory; keep walking up */ }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  throw new Error(`could not locate the package.json for ${packageName} above its resolved entry point`);
}

/**
 * Resolves the absolute path of an installed package's named `bin` entry.
 * @param {string} packageName
 * @param {string} binName
 * @returns {Promise<string>}
 * @throws {Error} when the package has no such bin entry
 */
export async function resolveBinPath(packageName, binName) {
  const { root, manifest } = await resolvePackageManifest(packageName);
  const relative = manifest.bin?.[binName];
  if (typeof relative !== "string" || relative.trim() === "") throw new Error(`${packageName} declares no bin entry named ${binName}`);
  return join(root, relative);
}

/** Default injected executor: spawns node on the resolved bin and captures stdout/stderr. */
async function spawnExecute({ program, args }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolvePromise({ code: code ?? 1, stdout, stderr }));
  });
}

const LABELS = Object.freeze(["TITLE", "DESCRIPTION", "TAGS", "LINES", "NARRATION"]);
const SEGMENT_HEADING_PATTERN = /^#{0,4}\s*Segment\s*\d+\s*:\s*(.+)$/iu;

/**
 * The plain-text contract every generation mode asks the model to follow,
 * shared verbatim so the parser and the prompt never drift apart.
 */
const TEXT_FORMAT_INSTRUCTIONS = [
  "Write your answer as plain text in exactly the labeled form below -- never as JSON, and never inside a code fence.",
  "TITLE: <the video title, one line>",
  "DESCRIPTION: <2-4 sentences summarizing the video for its audience>",
  "TAGS: <5-12 short lowercase keywords, separated by commas, on one line>",
  "Then one block per segment, each starting with a line of the exact form \"### Segment N: <short on-screen heading>\" (N is the segment's 1-based number), followed by:",
  "LINES: then one short on-screen text line per following line, each starting with \"- \", each under 100 characters",
  "NARRATION: <the full sentence(s) a narrator speaks for this segment, in plain prose>",
  "Output nothing before TITLE: and nothing after the last segment's NARRATION: -- no preamble, no closing remarks, no markdown fences.",
].join("\n");

/**
 * Strips a wrapping Markdown code fence when the whole candidate is
 * fenced -- a common small-model habit even when told not to fence --
 * and normalizes CRLF/CR line endings to `\n`.
 * @param {string} text
 * @returns {string}
 */
export function stripFences(text) {
  const normalized = requiredText(text, "candidate text").replace(/\r\n?/gu, "\n").trim();
  const wrapped = normalized.match(/^```[A-Za-z]*\n([\s\S]*?)\n?```\s*$/u);
  if (wrapped) return wrapped[1].trim();
  return normalized.replace(/^```[A-Za-z]*\s*$/gmu, "").trim();
}

function labelOf(line) {
  const match = line.trim().match(/^([A-Za-z]+)\s*:/u);
  const label = match ? match[1].toUpperCase() : null;
  return label && LABELS.includes(label) ? label : null;
}

function valueAfterLabel(line) {
  return line.trim().replace(/^[A-Za-z]+\s*:\s*/u, "");
}

/** Groups a run of lines under whichever recognized LABEL heads each subsequent line, dropping any leading prose before the first label. */
function collectLabeledFields(lines) {
  const fields = {};
  let current = null;
  for (const line of lines) {
    const label = labelOf(line);
    if (label) {
      current = label;
      fields[current] = [valueAfterLabel(line)];
    } else if (current) {
      fields[current].push(line);
    }
  }
  for (const key of Object.keys(fields)) fields[key] = fields[key].join("\n").trim();
  return fields;
}

/**
 * Parses the model's plain labeled-text candidate into the same shape
 * `validateGeneratedScript` expects, tolerating stray code fences,
 * leading prose before the first recognized label, and CRLF line
 * endings. Never throws on malformed JSON, because no JSON is parsed.
 * @param {string} rawText
 * @returns {{title: string, description: string, tags: string[], segments: Array<{heading: string, lines: string[], narration: string}>}}
 */
export function parseScriptText(rawText) {
  const lines = stripFences(rawText).split("\n");
  const firstSegmentIndex = lines.findIndex((line) => SEGMENT_HEADING_PATTERN.test(line.trim()));
  const headerLines = lines.slice(0, firstSegmentIndex === -1 ? lines.length : firstSegmentIndex);
  const bodyLines = firstSegmentIndex === -1 ? [] : lines.slice(firstSegmentIndex);
  const header = collectLabeledFields(headerLines);

  const segmentStarts = [];
  bodyLines.forEach((line, lineIndex) => {
    const match = line.trim().match(SEGMENT_HEADING_PATTERN);
    if (match) segmentStarts.push({ index: lineIndex, heading: match[1].trim() });
  });

  const segments = segmentStarts.map((start, i) => {
    const end = i + 1 < segmentStarts.length ? segmentStarts[i + 1].index : bodyLines.length;
    const fields = collectLabeledFields(bodyLines.slice(start.index + 1, end));
    const bulletLines = (fields.LINES ?? "").split("\n")
      .map((line) => line.trim().replace(/^[-*•]\s*/u, "").trim())
      .filter((line) => line !== "");
    const narrationLines = (fields.NARRATION ?? "").split("\n").map((line) => line.trim()).filter((line) => line !== "");
    return { heading: start.heading, lines: bulletLines, narration: narrationLines.join(" ") };
  });

  return {
    title: (header.TITLE ?? "").trim(),
    description: (header.DESCRIPTION ?? "").split("\n").map((line) => line.trim()).filter((line) => line !== "").join(" "),
    tags: (header.TAGS ?? "").replace(/\n/gu, " ").split(",").map((tag) => tag.trim()).filter((tag) => tag !== ""),
    segments,
  };
}

/**
 * Validates the parsed candidate against the video-rendering 0.2.0
 * segmented-input contract plus the channel metadata fields this script
 * additionally requires.
 * @param {unknown} value
 * @param {{minSegments?: number}} [options]
 * @returns {{title: string, description: string, tags: string[], segments: Array<{heading: string, lines: string[], narration: string}>}}
 * @throws {TypeError} on any missing or malformed field
 * @throws {Error} when fewer than `minSegments` segments are present, naming the count
 */
export function validateGeneratedScript(value, { minSegments = 1 } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("generated script must be an object");
  const title = requiredText(value.title, "title");
  const description = requiredText(value.description, "description");
  if (!Array.isArray(value.tags) || value.tags.length === 0 || value.tags.some((tag) => typeof tag !== "string" || tag.trim() === "")) throw new TypeError("tags must be a non-empty array of non-empty strings");
  if (!Array.isArray(value.segments) || value.segments.length === 0) throw new TypeError("segments must be a non-empty array");
  if (value.segments.length < minSegments) throw new Error(`generated script candidate has ${value.segments.length} segments, fewer than the required minimum of ${minSegments}`);
  const segments = value.segments.map((segment, index) => {
    if (!segment || typeof segment !== "object" || Array.isArray(segment)) throw new TypeError(`segments[${index}] must be an object`);
    for (const key of Object.keys(segment)) if (!SEGMENT_FIELDS.includes(key)) throw new TypeError(`segments[${index}] carries an unsupported field: ${key}`);
    if (!Array.isArray(segment.lines) || segment.lines.length === 0) throw new TypeError(`segments[${index}].lines must be a non-empty array of strings`);
    return {
      heading: requiredText(segment.heading, `segments[${index}].heading`),
      lines: segment.lines.map((line, lineIndex) => requiredText(line, `segments[${index}].lines[${lineIndex}]`)),
      narration: requiredText(segment.narration, `segments[${index}].narration`),
    };
  });
  return { title, description, tags: value.tags.map((tag) => tag.trim()), segments };
}

function instructions() {
  return [
    "Transform the supplied source material into a structured video script.",
    "Segments together must faithfully summarize and explain the supplied source material end to end; do not invent facts the source material does not support.",
    TEXT_FORMAT_INSTRUCTIONS,
  ].join(" ");
}

function inputText(sourceBundle) {
  const item = sourceBundle.item ?? {};
  const parts = [
    `Title: ${item.title ?? "(untitled)"}`,
    item.abstract ? `Abstract: ${item.abstract}` : null,
    sourceBundle.bibliographyText ? `Citation: ${sourceBundle.bibliographyText}` : null,
    ...(sourceBundle.carriers ?? []).map((carrier) => `Carrier ${carrier.path}:\n${carrier.text}`),
  ].filter((part) => part !== null);
  return parts.join("\n\n");
}

/**
 * Dispatches one mechanical work lot through run-mechanical-inference and
 * returns its validated segments record, parsed from the model's plain
 * labeled-text candidate (never JSON, so no escaping defect can reach
 * this parser). Shared by every generation mode this module offers
 * (source-bundle, lesson) -- each mode differs only in its instructions
 * text, input content, and minimum segment count.
 * @param {{instructionsText: string, inputContent: string, receiptRoot: string, turn: string, minSegments?: number, actor?: string, execute?: Function, binPath?: string}} options
 * @returns {Promise<{script: object, dispatch: object}>}
 * @throws {Error} when the dispatch is refused, produces no completion, or the candidate has too few segments
 * @throws {TypeError} when the parsed candidate fails schema validation
 */
async function dispatchMechanicalScript({ instructionsText, inputContent, receiptRoot, turn, minSegments = 1, actor, execute = spawnExecute, binPath }) {
  requiredText(receiptRoot, "receiptRoot");
  requiredText(turn, "turn");
  const resolvedBinPath = binPath ?? await resolveBinPath("@red-cup-engineering/inference-dispatch-service", "run-mechanical-inference");
  const scratchDir = await mkdtemp(join(tmpdir(), "youtube-channel-production-generate-script-"));
  const inputFile = join(scratchDir, "input.txt");
  try {
    await writeFile(inputFile, inputContent, "utf8");
    const args = [
      resolvedBinPath,
      "--task-type", TASK_TYPE,
      "--instructions", instructionsText,
      "--input-file", inputFile,
      "--receipt-root", receiptRoot,
      "--turn", turn,
      ...(actor ? ["--actor", actor] : []),
    ];
    const result = await execute({ program: process.execPath, args });
    if (result.code !== 0) throw new Error(`run-mechanical-inference exited ${result.code}: ${result.stderr || result.stdout}`);
    const dispatch = JSON.parse(result.stdout);
    if (dispatch.admitted !== true) throw new Error(`mechanical inference dispatch refused: ${dispatch.reason}`);
    if (!dispatch.exchange?.completion?.text) throw new Error(`mechanical inference dispatch produced no completion: ${JSON.stringify(dispatch)}`);
    const parsed = parseScriptText(dispatch.exchange.completion.text);
    return { script: validateGeneratedScript(parsed, { minSegments }), dispatch };
  } finally {
    await rm(scratchDir, { recursive: true, force: true });
  }
}

/**
 * Dispatches one generate-script mechanical work lot for an acquired
 * literature source bundle and returns the validated segments JSON.
 * @param {{spec: object, sourceBundle: object, receiptRoot: string, turn: string, actor?: string, execute?: Function, binPath?: string}} options
 * @returns {Promise<{script: object, dispatch: object}>}
 * @throws {Error} when the dispatch is refused, produces no candidate, or the candidate fails validation
 */
export async function generateVideoScript({ spec, sourceBundle, receiptRoot, turn, actor, execute, binPath } = {}) {
  requiredText(spec?.id, "spec.id");
  if (!sourceBundle || typeof sourceBundle !== "object") throw new TypeError("generateVideoScript requires a sourceBundle");
  return dispatchMechanicalScript({ instructionsText: instructions(), inputContent: inputText(sourceBundle), receiptRoot, turn, actor, execute, binPath });
}

function lessonInstructions() {
  return [
    "Write an explainer video script for this channel's audience on the supplied lesson.",
    "Produce 6 to 9 segments in total.",
    "Each segment's NARRATION should be roughly 150 to 200 spoken words of plain, rigorous prose for a narrator to read.",
    "Segments together must faithfully cover the lesson end to end, plain and rigorous; do not invent citations, dates, names, or facts the supplied context does not support.",
    TEXT_FORMAT_INSTRUCTIONS,
  ].join(" ");
}

const LESSON_MIN_SEGMENTS = 6;

/** The lesson's own competency descriptions, resolved from the curriculum's top-level `competencies` catalog by id -- empty when the curriculum carries no competency catalog or the lesson names none. */
function lessonCompetencyDescriptions(curriculum, lesson) {
  if (!Array.isArray(curriculum?.lessons) || !Array.isArray(curriculum?.competencies)) return [];
  const rawLesson = curriculum.lessons.find((entry) => entry.id === lesson.lessonId);
  const ids = Array.isArray(rawLesson?.competencies) ? rawLesson.competencies : [];
  return ids
    .map((id) => curriculum.competencies.find((competency) => competency.id === id)?.description)
    .filter((description) => typeof description === "string" && description.trim() !== "");
}

function lessonInputText({ spec, lesson, curriculum }) {
  const parts = [
    `Channel: ${spec.title}`,
    `Lesson title: ${lesson.title}`,
    typeof curriculum?.promise === "string" && curriculum.promise.trim() !== "" ? `Curriculum promise: ${curriculum.promise}` : null,
    typeof curriculum?.audience === "string" && curriculum.audience.trim() !== "" ? `Audience: ${curriculum.audience}` : null,
    ...lessonCompetencyDescriptions(curriculum, lesson).map((description) => `Competency: ${description}`),
  ].filter((part) => part !== null);
  return parts.join("\n");
}

/**
 * Dispatches one generate-script mechanical work lot for a curriculum
 * lesson (the lesson's title plus the curriculum's promise, audience, and
 * that lesson's own competency descriptions as context) and returns the
 * validated segments JSON.
 * @param {{spec: object, lesson: {title: string, lessonId?: string}, curriculum: object, receiptRoot: string, turn: string, actor?: string, execute?: Function, binPath?: string}} options
 * @returns {Promise<{script: object, dispatch: object}>}
 * @throws {Error} when the dispatch is refused, produces no candidate, or the candidate fails validation
 */
export async function generateLessonScript({ spec, lesson, curriculum, receiptRoot, turn, actor, execute, binPath } = {}) {
  requiredText(spec?.id, "spec.id");
  if (!lesson || typeof lesson.title !== "string") throw new TypeError("generateLessonScript requires a lesson with a title");
  return dispatchMechanicalScript({ instructionsText: lessonInstructions(), inputContent: lessonInputText({ spec, lesson, curriculum }), receiptRoot, turn, minSegments: LESSON_MIN_SEGMENTS, actor, execute, binPath });
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const sourceBundlePath = argument("--source-bundle", argv);
  const receiptRoot = argument("--receipt-root", argv);
  const turn = argument("--turn", argv);
  const outPath = argument("--out", argv);
  if (!specPath || !sourceBundlePath || !receiptRoot || !turn || !outPath) {
    throw new Error("usage: generate-script.mjs --spec <path> --source-bundle <path> --receipt-root <dir> --turn <id> --out <path>");
  }
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const sourceBundle = JSON.parse(await readFile(sourceBundlePath, "utf8"));
  const { script, dispatch } = await generateVideoScript({ spec, sourceBundle, receiptRoot, turn, actor: argument("--actor", argv) });
  await writeFile(outPath, `${JSON.stringify(script, null, 2)}\n`, "utf8");
  return { script, provider: dispatch.provider ?? dispatch.exchange?.completion?.model ?? null, outPath };
}

runJsonMain(main, import.meta.url);
