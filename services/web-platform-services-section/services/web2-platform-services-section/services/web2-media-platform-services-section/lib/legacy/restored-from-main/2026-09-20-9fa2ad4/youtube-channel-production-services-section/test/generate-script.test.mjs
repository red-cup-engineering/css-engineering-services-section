import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { stripFences, parseScriptText, validateGeneratedScript, generateVideoScript, generateLessonScript, resolveBinPath } from "../scripts/generate-script.mjs";

const spec = JSON.parse(await readFile(fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url)), "utf8"));
const sourceBundle = { item: { title: "A Topic", abstract: "An abstract." }, bibliographyText: "Citation.", carriers: [] };

/** Builds one plain-text candidate segment block in the labeled form the parser expects. */
function segmentBlock(n, { heading = `Heading ${n}`, lines = ["Point one"], narration = `Narration ${n}.` } = {}) {
  return [`### Segment ${n}: ${heading}`, "LINES:", ...lines.map((line) => `- ${line}`), `NARRATION: ${narration}`].join("\n");
}

/** Builds a full plain-text candidate (title/description/tags header plus `count` segment blocks). */
function candidateText(count, overrides = {}) {
  const header = [
    `TITLE: ${overrides.title ?? "Generated Title"}`,
    `DESCRIPTION: ${overrides.description ?? "Generated description."}`,
    `TAGS: ${overrides.tags ?? "fixture, topic"}`,
  ].join("\n");
  const segments = Array.from({ length: count }, (_, i) => segmentBlock(i + 1)).join("\n\n");
  return `${header}\n\n${segments}\n`;
}

test("stripFences removes a single wrapping fence and normalizes CRLF", () => {
  assert.equal(stripFences("```\r\nTITLE: T\r\n```\r\n"), "TITLE: T");
  assert.equal(stripFences("```json\nTITLE: T\n```"), "TITLE: T");
});

test("stripFences drops a stray trailing fence line with no matching open", () => {
  assert.equal(stripFences("TITLE: T\n```\n"), "TITLE: T");
});

test("parseScriptText parses a realistic messy small-model candidate into a valid record", async () => {
  const raw = await readFile(fileURLToPath(new URL("./fixtures/messy-model-output.txt", import.meta.url)), "utf8");
  const parsed = parseScriptText(raw);
  const script = validateGeneratedScript(parsed);
  assert.equal(script.title, "The Chain Rule Explained");
  assert.equal(script.segments.length, 2);
  assert.equal(script.segments[0].heading, "What Is The Chain Rule");
  assert.match(script.segments[1].narration, /2x \\ cos\(x\^2\)/);
  assert.deepEqual(script.tags, ["calculus", "chain-rule", "derivatives", "math", "tutorial"]);
});

test("parseScriptText drops leading prose before the first recognized label", () => {
  const parsed = parseScriptText(`Here you go, enjoy!\n\n${candidateText(1)}`);
  assert.equal(parsed.title, "Generated Title");
  assert.equal(parsed.segments.length, 1);
});

test("parseScriptText tolerates a fully wrapped code fence with no language tag", () => {
  const parsed = parseScriptText("```\n" + candidateText(1) + "```\n");
  assert.equal(parsed.title, "Generated Title");
  assert.equal(parsed.segments.length, 1);
});

test("validateGeneratedScript accepts a well-formed script", () => {
  const script = validateGeneratedScript({
    title: "T", description: "D", tags: ["a", "b"],
    segments: [{ heading: "H", lines: ["line one"], narration: "Narration." }],
  });
  assert.equal(script.title, "T");
  assert.equal(script.segments.length, 1);
});

test("validateGeneratedScript rejects an unsupported segment field", () => {
  assert.throws(() => validateGeneratedScript({
    title: "T", description: "D", tags: ["a"],
    segments: [{ heading: "H", lines: ["x"], narration: "N", extra: true }],
  }), /unsupported field/);
});

test("validateGeneratedScript rejects empty tags", () => {
  assert.throws(() => validateGeneratedScript({ title: "T", description: "D", tags: [], segments: [{ heading: "H", lines: ["x"], narration: "N" }] }), /tags/);
});

test("validateGeneratedScript refuses a candidate with fewer segments than minSegments, naming the count", () => {
  assert.throws(
    () => validateGeneratedScript(
      { title: "T", description: "D", tags: ["a"], segments: [{ heading: "H", lines: ["x"], narration: "N" }, { heading: "H2", lines: ["y"], narration: "N2" }] },
      { minSegments: 6 },
    ),
    /has 2 segments, fewer than the required minimum of 6/,
  );
});

test("resolveBinPath resolves inference-dispatch-service's run-mechanical-inference bin", async () => {
  const binPath = await resolveBinPath("@red-cup-engineering/inference-dispatch-service", "run-mechanical-inference");
  assert.match(binPath, /run-mechanical-inference\.mjs$/);
});

test("generateVideoScript parses a valid plain-text dispatched candidate into a script", async () => {
  const execute = async ({ args }) => {
    assert.ok(args.includes("--task-type"));
    assert.ok(args.includes("boilerplate-transform"));
    return { code: 0, stdout: JSON.stringify({ admitted: true, provider: "fake-provider", exchange: { completion: { text: candidateText(1) } } }) };
  };
  const { script, dispatch } = await generateVideoScript({ spec, sourceBundle, receiptRoot: "/tmp/does-not-need-to-exist", turn: "turn-1", execute, binPath: "/fake/bin.mjs" });
  assert.equal(script.title, "Generated Title");
  assert.equal(dispatch.provider, "fake-provider");
});

test("generateVideoScript parses a messy candidate (leading prose, stray fence, raw backslash) with no JSON involved", async () => {
  const raw = await readFile(fileURLToPath(new URL("./fixtures/messy-model-output.txt", import.meta.url)), "utf8");
  const execute = async () => ({ code: 0, stdout: JSON.stringify({ admitted: true, provider: "fake-provider", exchange: { completion: { text: raw } } }) });
  const { script } = await generateVideoScript({ spec, sourceBundle, receiptRoot: "/tmp/does-not-need-to-exist", turn: "turn-1", execute, binPath: "/fake/bin.mjs" });
  assert.equal(script.title, "The Chain Rule Explained");
  assert.equal(script.segments.length, 2);
});

test("generateVideoScript throws when the dispatch is refused", async () => {
  const execute = async () => ({ code: 0, stdout: JSON.stringify({ admitted: false, reason: "not mechanical" }) });
  await assert.rejects(
    generateVideoScript({ spec, sourceBundle, receiptRoot: "/tmp", turn: "turn-1", execute, binPath: "/fake/bin.mjs" }),
    /refused/,
  );
});

const curriculum = {
  promise: "A rigorous tour of the field.",
  audience: "advanced students",
  competencies: [{ id: "historical-programs", description: "Distinguish major programs of machine intelligence." }],
  lessons: [{ id: "cybernetics", sequence: 1, title: "Cybernetics", prerequisites: [], competencies: ["historical-programs"] }],
};
const lesson = { lessonId: "cybernetics", title: "Cybernetics", sequence: 1, prerequisites: [] };

test("generateLessonScript dispatches lesson+curriculum context and parses a valid plain-text candidate", async () => {
  let capturedInput;
  const execute = async ({ args }) => {
    assert.ok(args.includes("--task-type"));
    assert.ok(args.includes("boilerplate-transform"));
    const instructionsIndex = args.indexOf("--instructions");
    assert.match(args[instructionsIndex + 1], /6 to 9/);
    const inputFileIndex = args.indexOf("--input-file");
    capturedInput = await readFile(args[inputFileIndex + 1], "utf8");
    return { code: 0, stdout: JSON.stringify({ admitted: true, provider: "fake-provider", exchange: { completion: { text: candidateText(6, { title: "Cybernetics Explained" }) } } }) };
  };
  const { script, dispatch } = await generateLessonScript({ spec, lesson, curriculum, receiptRoot: "/tmp/does-not-need-to-exist", turn: "turn-1", execute, binPath: "/fake/bin.mjs" });
  assert.equal(script.title, "Cybernetics Explained");
  assert.equal(script.segments.length, 6);
  assert.equal(dispatch.provider, "fake-provider");
  assert.match(capturedInput, /Lesson title: Cybernetics/);
  assert.match(capturedInput, /Curriculum promise: A rigorous tour of the field\./);
  assert.match(capturedInput, /Competency: Distinguish major programs of machine intelligence\./);
});

test("generateLessonScript refuses a candidate with fewer than 6 segments, naming the count, not a JSON parse error", async () => {
  const raw = await readFile(fileURLToPath(new URL("./fixtures/too-few-segments-output.txt", import.meta.url)), "utf8");
  const execute = async () => ({ code: 0, stdout: JSON.stringify({ admitted: true, provider: "fake-provider", exchange: { completion: { text: raw } } }) });
  await assert.rejects(
    generateLessonScript({ spec, lesson, curriculum, receiptRoot: "/tmp", turn: "turn-1", execute, binPath: "/fake/bin.mjs" }),
    /has 2 segments, fewer than the required minimum of 6/,
  );
});

test("generateLessonScript omits curriculum-context lines a place-based curriculum carries none of", async () => {
  const placeLesson = { title: "Chicago: Climate History and Outlook", sequence: 1, prerequisites: [] };
  let capturedInput;
  const execute = async ({ args }) => {
    const inputFileIndex = args.indexOf("--input-file");
    capturedInput = await readFile(args[inputFileIndex + 1], "utf8");
    return { code: 0, stdout: JSON.stringify({ admitted: true, provider: "fake-provider", exchange: { completion: { text: candidateText(6) } } }) };
  };
  await generateLessonScript({ spec, lesson: placeLesson, curriculum: { places: ["Chicago"] }, receiptRoot: "/tmp", turn: "turn-1", execute, binPath: "/fake/bin.mjs" });
  assert.doesNotMatch(capturedInput, /Curriculum promise/);
  assert.doesNotMatch(capturedInput, /Competency/);
});

test("generateLessonScript rejects a lesson with no title", async () => {
  await assert.rejects(
    generateLessonScript({ spec, lesson: {}, curriculum, receiptRoot: "/tmp", turn: "turn-1", binPath: "/fake/bin.mjs" }),
    TypeError,
  );
});
