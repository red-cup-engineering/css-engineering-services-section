import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runLessonProduction, loadAuthoredLessonScript, lessonPublishMetadata } from "../scripts/run-lesson-production.mjs";
import { nextReleaseSlot } from "../src/youtube-channel-production.mjs";
import { channelVideoSource, renderNotebookLmChannelVideo } from "../src/notebooklm-channel-video.mjs";

const baseSpec = JSON.parse(await readFile(fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url)), "utf8"));
const spec = { ...baseSpec, titleSuffix: " | Fixture Channel" };

const curriculum = {
  promise: "A rigorous history-and-frontiers tour of the field.",
  audience: "advanced students",
  competencies: [{ id: "historical-programs", description: "Distinguish major programs of machine intelligence." }],
  lessons: [
    { id: "cybernetics", sequence: 1, title: "Cybernetics, Computation, and Symbolic AI", prerequisites: [], competencies: ["historical-programs"] },
    { id: "statistics", sequence: 2, title: "Probability and Statistical Learning", prerequisites: ["cybernetics"] },
  ],
};

function jsonResponse(body, { ok = true, headers = {} } = {}) {
  return { ok, headers: { get: (key) => headers[key.toLowerCase()] ?? null }, text: async () => JSON.stringify(body), json: async () => body };
}

const GRANTED_SCOPE = "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/yt-analytics.readonly";

function fakeGoogleFetch() {
  const videoId = "fixturevid1";
  const uploadLocation = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=fake";
  let insertedStatus = null;
  const fetchImpl = async (url, init = {}) => {
    const target = new URL(url);
    if (target.href === "https://oauth2.googleapis.com/token") return jsonResponse({ access_token: "at-1", scope: GRANTED_SCOPE });
    if (target.pathname === "/youtube/v3/channels") return jsonResponse({ items: [{ id: spec.youtubeChannelId, snippet: { title: "Fixture Channel" } }] });
    if (target.pathname === "/upload/youtube/v3/videos" && init.method === "POST") {
      insertedStatus = JSON.parse(init.body).status;
      return jsonResponse({}, { headers: { location: uploadLocation } });
    }
    if (target.pathname === "/youtube/v3/videos" && init.method === "GET") {
      return jsonResponse({ items: [{
        id: videoId, snippet: { channelId: spec.youtubeChannelId },
        status: { privacyStatus: insertedStatus?.privacyStatus ?? "private", publishAt: insertedStatus?.publishAt ?? null, uploadStatus: "processed", license: "youtube", embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
        processingDetails: { processingStatus: "succeeded" },
      }] });
    }
    if (target.pathname === "/youtube/v3/videos" && init.method === "PUT") {
      throw new Error("videos.update must never be called on the run path");
    }
    if (target.pathname === "/upload/youtube/v3/thumbnails/set") return jsonResponse({ items: [{}] });
    throw new Error(`unhandled fake google request: ${init.method ?? "GET"} ${target.href}`);
  };
  const uploadFetch = async () => jsonResponse({ id: videoId });
  return { fetchImpl, uploadFetch, videoId };
}

function fakeGenerateExecute(title = "Generated Lesson Title") {
  const segments = Array.from({ length: 6 }, (_, i) => [`### Segment ${i + 1}: Segment ${i + 1}`, "LINES:", "- A line", `NARRATION: Narration text ${i + 1}.`].join("\n"));
  const text = [`TITLE: ${title}`, "DESCRIPTION: A generated description.", "TAGS: fixture, generated", "", ...segments].join("\n\n");
  return async () => ({ code: 0, stdout: JSON.stringify({ admitted: true, provider: "fake-provider", exchange: { completion: { text } } }) });
}

function fakeRenderExecute() {
  return async (command) => {
    if (command.program === "ffprobe") return { code: 0, stdout: "1.5" };
    const outputFile = command.args.at(-1);
    await writeFile(outputFile, Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("fake mp4 bytes")]));
    return { code: 0, stdout: "" };
  };
}

const environment = { FIXTURE_OAUTH_CLIENT_ID: "id", FIXTURE_OAUTH_CLIENT_SECRET: "secret", FIXTURE_REFRESH_TOKEN: "refresh" };
const failIfCalled = (label) => async () => { throw new Error(`${label} should not have been called`); };

test("NotebookLM source packet retains the curriculum, planned lesson, and admitted script", () => {
  const source = channelVideoSource({ lesson: curriculum.lessons[0], curriculum: { ...curriculum, title: "Fixture course" }, script: { description: "An admitted explanation.", segments: [{ heading: "Start", lines: ["A sourced line"], narration: "Narrated source" }] } });
  assert.match(source.bytes.toString("utf8"), /Fixture course/);
  assert.match(source.bytes.toString("utf8"), /Cybernetics, Computation, and Symbolic AI/);
  assert.match(source.bytes.toString("utf8"), /Narrated source/);
});

test("NotebookLM renderer sends one stable source-bound order and materializes only its returned artifact", async () => {
  const workDirectory = await mkdtemp(join(tmpdir(), "notebooklm-channel-video-"));
  try {
    const requests = [];
    const spec = { id: "urn:ame:mathematics-youtube-channel-enterprise", video: { renderer: "persistent-notebook-channel-video", agentCardUrlEnv: "PERSISTENT_NOTEBOOK_CHANNEL_VIDEO_AGENT_CARD_URL", agentCardIdentity: "ni:///sha-256;QfbNMmKVfegw8gsyJr5dj0LT4wTTsAunJKX10xmQaZk", notebook: "urn:emsenn:notebooklm-notebook:67510ce7-79b3-4caa-b25c-28e0d3911b5a", format: "cinematic", style: null, language: "en", sourceLifecyclePolicy: "curated-cumulative-corpus" } };
    const client = { request: async (order) => { requests.push(order); return { order: order.id }; }, materialize: async () => ({ bytes: Buffer.from([0, 0, 0, 0, 102, 116, 121, 112, 1, 2, 3, 4]), sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", byteLength: 12, mediaType: "video/mp4" }) };
    const formOrder = (input) => ({ id: `stable-${Buffer.from(input.sourceBytes).toString("hex")}`, ...input });
    const result = await renderNotebookLmChannelVideo({ spec, lesson: curriculum.lessons[0], curriculum: { ...curriculum, title: "Fixture course" }, script: { description: "Admitted script", segments: [] }, workDirectory, client, formOrder });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].id, result.order.id);
    assert.equal((await readFile(result.artifactPath)).length, 12);
  } finally { await rm(workDirectory, { recursive: true, force: true }); }
});

test("NotebookLM renderer leaves no artifact when the enterprise refuses an order", async () => {
  const workDirectory = await mkdtemp(join(tmpdir(), "notebooklm-channel-video-refusal-"));
  try {
    const spec = { id: "urn:ame:mathematics-youtube-channel-enterprise", video: { renderer: "persistent-notebook-channel-video", agentCardUrlEnv: "PERSISTENT_NOTEBOOK_CHANNEL_VIDEO_AGENT_CARD_URL", agentCardIdentity: "ni:///sha-256;QfbNMmKVfegw8gsyJr5dj0LT4wTTsAunJKX10xmQaZk", notebook: "urn:emsenn:notebooklm-notebook:67510ce7-79b3-4caa-b25c-28e0d3911b5a", format: "cinematic", style: null, language: "en", sourceLifecyclePolicy: "curated-cumulative-corpus" } };
    await assert.rejects(renderNotebookLmChannelVideo({ spec, lesson: curriculum.lessons[0], curriculum: { ...curriculum, title: "Fixture course" }, script: { description: "Admitted script", segments: [] }, workDirectory, client: { request: async () => { throw new Error("persistent-notebook refused: capacity"); } }, formOrder: () => ({ id: "stable-order" }) }), /refused/);
    assert.deepEqual(await (async () => { try { return await readFile(join(workDirectory, "artifact.mp4")); } catch { return []; } })(), []);
  } finally { await rm(workDirectory, { recursive: true, force: true }); }
});

test("NotebookLM dry run never invokes preliminary inference or the provider", async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), "notebooklm-dry-state-"));
  try {
    const notebookSpec = { ...baseSpec, video: { renderer: "persistent-notebook-channel-video", agentCardUrlEnv: "PERSISTENT_NOTEBOOK_CHANNEL_VIDEO_AGENT_CARD_URL", agentCardIdentity: "ni:///sha-256;QfbNMmKVfegw8gsyJr5dj0LT4wTTsAunJKX10xmQaZk", notebook: "urn:emsenn:notebooklm-notebook:67510ce7-79b3-4caa-b25c-28e0d3911b5a", format: "cinematic", style: null, language: "en", sourceLifecyclePolicy: "curated-cumulative-corpus", sourceProviderModule: "fixture-source-provider" } };
    const result = await runLessonProduction({ spec: notebookSpec, curriculum: { ...curriculum, title: "Fixture course" }, stateRoot, dryRun: true, observe: async () => [], generateExecute: failIfCalled("inference"), notebookClient: { request: failIfCalled("provider") }, notebookFormOrder: (input) => ({ id: "stable-order", ...input }), sourceProvider: async () => ({ bytes: Buffer.from("# Verified research\n"), title: "Verified fixture", citations: [{ id: "source" }], limitations: ["scope"] }) });
    assert.equal(result.status, "dry-run");
    assert.equal(result.rendered.order.id, "stable-order");
  } finally { await rm(stateRoot, { recursive: true, force: true }); }
});

test("lessonPublishMetadata builds title/description/tags from the curriculum and lesson, never the generated script's own title", () => {
  const metadata = lessonPublishMetadata(spec, { title: "Cybernetics, Computation, and Symbolic AI" }, curriculum, ["a", "b"]);
  assert.equal(metadata.title, "Cybernetics, Computation, and Symbolic AI | Fixture Channel");
  assert.match(metadata.description, /A rigorous history-and-frontiers tour of the field\./);
  assert.match(metadata.description, /This video covers: Cybernetics, Computation, and Symbolic AI\./);
  assert.match(metadata.description, /Educational material\.$/);
  assert.deepEqual(metadata.tags, ["a", "b"]);
});

test("loadAuthoredLessonScript returns null when no authoredScriptsDir or lessonId is given", async () => {
  assert.equal(await loadAuthoredLessonScript(undefined, "cybernetics"), null);
  assert.equal(await loadAuthoredLessonScript("/some/dir", undefined), null);
});

test("runLessonProduction exits 'nothing to do' when the curriculum is already fully produced", async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), "run-lesson-production-state-"));
  try {
    const result = await runLessonProduction({
      spec, curriculum, stateRoot, now: "2026-09-02T00:00:00.000Z",
      observe: async () => [
        { lessonId: "cybernetics", title: "Cybernetics, Computation, and Symbolic AI | Fixture Channel" },
        { lessonId: "statistics", title: "Probability and Statistical Learning | Fixture Channel" },
      ],
      generateExecute: failIfCalled("generate"), renderExecute: failIfCalled("render"),
    });
    assert.equal(result.status, "nothing to do");
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
  }
});

test("runLessonProduction --dry-run stops after render: no thumbnail, no publish", async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), "run-lesson-production-state-"));
  const workRoot = await mkdtemp(join(tmpdir(), "run-lesson-production-work-"));
  try {
    const result = await runLessonProduction({
      spec, curriculum, stateRoot, workRoot, dryRun: true, now: "2026-09-02T00:00:00.000Z",
      observe: async () => [],
      generateExecute: fakeGenerateExecute(), renderExecute: fakeRenderExecute(),
      thumbnailGenerate: failIfCalled("thumbnail"),
    });
    assert.equal(result.status, "dry-run");
    assert.equal(result.lesson.lessonId, "cybernetics");
    assert.equal(result.script.title, "Generated Lesson Title");
    assert.match(result.rendered.sha256, /^sha256:[0-9a-f]{64}$/);
    assert.equal(result.thumbnail, undefined);
    assert.equal(result.publicationReceipt, undefined);
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
    await rm(workRoot, { recursive: true, force: true });
  }
});

test("runLessonProduction generates and publishes, using the curriculum's canonical title/description over the generated script's own", async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), "run-lesson-production-state-"));
  const workRoot = await mkdtemp(join(tmpdir(), "run-lesson-production-work-"));
  try {
    const { fetchImpl, uploadFetch, videoId } = fakeGoogleFetch();
    const now = "2026-09-02T00:00:00.000Z";
    const result = await runLessonProduction({
      spec, curriculum, stateRoot, workRoot, now, environment, fetchImpl, uploadFetch,
      observe: async () => [],
      generateExecute: fakeGenerateExecute(), renderExecute: fakeRenderExecute(),
      thumbnailGenerate: failIfCalled("thumbnail-provider"),
    });
    assert.equal(result.status, "published");
    assert.equal(result.lesson.lessonId, "cybernetics");
    assert.equal(result.script.title, "Generated Lesson Title");
    assert.equal(result.metadata.title, "Cybernetics, Computation, and Symbolic AI | Fixture Channel");
    assert.match(result.metadata.description, /A rigorous history-and-frontiers tour of the field\./);
    assert.deepEqual(result.metadata.tags, ["fixture", "generated"]);
    assert.equal(result.thumbnail.provider, "deterministic-solid-branded-fallback");
    assert.equal(result.publicationReceipt.youtubeVideoId, videoId);
    const expectedSlot = nextReleaseSlot(spec, [], now);
    assert.equal(result.publicationReceipt.publishAt, expectedSlot.plannedPublishAt);
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
    await rm(workRoot, { recursive: true, force: true });
  }
});

test("runLessonProduction honors an explicit --planned-publish-at over nextReleaseSlot", async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), "run-lesson-production-state-"));
  const workRoot = await mkdtemp(join(tmpdir(), "run-lesson-production-work-"));
  try {
    const { fetchImpl, uploadFetch } = fakeGoogleFetch();
    const explicitPublishAt = "2026-12-25T15:00:00.000Z";
    const result = await runLessonProduction({
      spec, curriculum, stateRoot, workRoot, environment, fetchImpl, uploadFetch,
      plannedPublishAt: explicitPublishAt, now: "2026-09-02T00:00:00.000Z",
      observe: async () => [],
      generateExecute: fakeGenerateExecute(), renderExecute: fakeRenderExecute(),
      thumbnailGenerate: failIfCalled("thumbnail-provider"),
    });
    assert.equal(result.publicationReceipt.publishAt, explicitPublishAt);
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
    await rm(workRoot, { recursive: true, force: true });
  }
});

test("runLessonProduction uses an authored script and its metadata override instead of generating", async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), "run-lesson-production-state-"));
  const workRoot = await mkdtemp(join(tmpdir(), "run-lesson-production-work-"));
  const authoredScriptsDir = await mkdtemp(join(tmpdir(), "run-lesson-production-authored-"));
  try {
    await mkdir(join(authoredScriptsDir, "cybernetics"), { recursive: true });
    const authoredScript = { title: "Authored Title", description: "Authored description.", tags: ["authored"], segments: [{ heading: "H", lines: ["x"], narration: "N" }] };
    await writeFile(join(authoredScriptsDir, "cybernetics", "script.json"), JSON.stringify(authoredScript));
    await writeFile(join(authoredScriptsDir, "cybernetics", "metadata.json"), JSON.stringify({ tags: ["authored-metadata-override"] }));

    const { fetchImpl, uploadFetch, videoId } = fakeGoogleFetch();
    const result = await runLessonProduction({
      spec, curriculum, stateRoot, workRoot, authoredScriptsDir, environment, fetchImpl, uploadFetch,
      now: "2026-09-02T00:00:00.000Z",
      observe: async () => [],
      generateExecute: failIfCalled("generate"), renderExecute: fakeRenderExecute(),
      thumbnailGenerate: failIfCalled("thumbnail-provider"),
    });
    assert.equal(result.status, "published");
    assert.equal(result.script.title, "Authored Title");
    assert.equal(result.metadata.title, "Cybernetics, Computation, and Symbolic AI | Fixture Channel");
    assert.deepEqual(result.metadata.tags, ["authored-metadata-override"]);
    assert.equal(result.publicationReceipt.youtubeVideoId, videoId);
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
    await rm(workRoot, { recursive: true, force: true });
    await rm(authoredScriptsDir, { recursive: true, force: true });
  }
});

test("runLessonProduction throws without an explicit stateRoot", async () => {
  await assert.rejects(runLessonProduction({ spec, curriculum, observe: async () => [] }), /stateRoot/);
});
