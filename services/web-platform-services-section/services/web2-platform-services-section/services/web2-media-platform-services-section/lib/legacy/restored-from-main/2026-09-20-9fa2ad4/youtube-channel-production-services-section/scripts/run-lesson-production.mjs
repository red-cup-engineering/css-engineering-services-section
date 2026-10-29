#!/usr/bin/env node
/**
 * @module run-lesson-production
 * The stateless curriculum-channel runner: observes the channel's live
 * YouTube inventory, plans the next curriculum lesson against it, and
 * produces + publishes it (authored script when supplied, else
 * generated). Idempotent against live inventory, never a local journal.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec, nextReleaseSlot } from "../src/youtube-channel-production.mjs";
import { observeInventory } from "./observe-inventory.mjs";
import { planNextLesson } from "./plan-next-lesson.mjs";
import { generateLessonScript, validateGeneratedScript } from "./generate-script.mjs";
import { renderChannelVideo } from "./render-video.mjs";
import { renderNotebookLmChannelVideo } from "../src/notebooklm-channel-video.mjs";
import { makeChannelThumbnail } from "./make-thumbnail.mjs";
import { publishChannelVideo } from "./publish-video.mjs";
import { createChannelJournal } from "./record-receipt.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";
import { createRequire } from "node:module";

function turnFor(key) {
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

/** The inventory-side title with any trailing " | <channel title>" suffix stripped, matching plan-next-lesson's own convention. */
function coreTitle(title) {
  return String(title ?? "").split(" | ")[0].trim();
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads an authored script and optional metadata override for one
 * planned lesson, when the channel's authored-scripts directory carries
 * `<lessonId>/script.json`. Returns `null` when no lessonId is available
 * (an unidentified place/lesson) or the channel authored nothing for it.
 * @param {string|undefined} authoredScriptsDir
 * @param {string|undefined} lessonId
 * @returns {Promise<{script: object, metadataOverride: object}|null>}
 */
export async function loadAuthoredLessonScript(authoredScriptsDir, lessonId) {
  if (!authoredScriptsDir || !lessonId) return null;
  const scriptPath = join(authoredScriptsDir, lessonId, "script.json");
  if (!(await pathExists(scriptPath))) return null;
  const script = validateGeneratedScript(JSON.parse(await readFile(scriptPath, "utf8")));
  const metadataPath = join(authoredScriptsDir, lessonId, "metadata.json");
  const metadataOverride = (await pathExists(metadataPath)) ? JSON.parse(await readFile(metadataPath, "utf8")) : {};
  return { script, metadataOverride };
}

/**
 * Builds a planned lesson's canonical publish metadata: the DAG's own
 * title (never the generated script's title, so the published title
 * always matches the curriculum), the curriculum's promise plus a line
 * naming the lesson as the description, and the script's own tags.
 * @param {import("../src/youtube-channel-production.mjs").ChannelSpec} spec
 * @param {{title: string}} lesson
 * @param {object} curriculum
 * @param {string[]} tags
 * @returns {{title: string, description: string, tags: string[]}}
 */
export function lessonPublishMetadata(spec, lesson, curriculum, tags) {
  const promise = typeof curriculum?.promise === "string" && curriculum.promise.trim() !== "" ? curriculum.promise.trim() : null;
  const description = [promise, `This video covers: ${lesson.title}.`, "Educational material."].filter(Boolean).join("\n\n");
  return { title: `${lesson.title}${spec.titleSuffix ?? ""}`, description, tags };
}

/** @param {object} lesson @returns {{title: string, description: string, tags: string[], segments: object[]}} */
export function deterministicLessonMetadata(lesson) {
  return { title: lesson.title, description: lesson.promise ?? `An instructional video about ${lesson.title}.`, tags: ["education", "mathematics"], segments: [{ heading: lesson.title, lines: [lesson.promise ?? lesson.title], narration: lesson.promise ?? lesson.title }] };
}

function record(journal, category, value, at) {
  journal.record({ category, record: value, recordedAt: at, charge: { support: true, refutation: false } });
  return value;
}

/**
 * @param {{spec: object, curriculum: object, authoredScriptsDir?: string, plannedPublishAt?: string, dryRun?: boolean, stateRoot: string, workRoot?: string, now?: string, environment?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch, uploadFetch?: typeof fetch, observe?: Function, generateExecute?: Function, generateBinPath?: string, renderExecute?: Function, thumbnailGenerate?: Function, publishPoll?: object, actor?: string}} options
 * @returns {Promise<object>} `{status: "nothing to do"|"dry-run"|"published", ...}`
 * @throws {Error} when no stateRoot is supplied or any production stage fails
 */
export async function runLessonProduction({
  spec, curriculum, authoredScriptsDir, plannedPublishAt, dryRun = false,
  stateRoot, workRoot, now = new Date().toISOString(),
  environment = process.env, fetchImpl = fetch, uploadFetch = fetch,
  observe = observeInventory, generateExecute, generateBinPath,
  renderExecute, thumbnailGenerate, publishPoll, actor, notebookClient, notebookFormOrder, sourceProvider,
} = {}) {
  const validSpec = validateChannelSpec(spec);
  if (!stateRoot) throw new Error("runLessonProduction requires an explicit stateRoot");
  const resolvedWorkRoot = workRoot ?? join(tmpdir(), `${validSpec.id}-lesson-production`);
  await mkdir(stateRoot, { recursive: true });
  await mkdir(resolvedWorkRoot, { recursive: true });

  const inventory = await observe({ spec: validSpec, environment, fetchImpl });
  let lesson;
  try {
    // Every lesson already produced (curriculum exhausted) is a clean no-op, never a crash.
    lesson = planNextLesson({ curriculum, inventory, now });
  } catch {
    return { status: "nothing to do" };
  }

  const alreadyLive = inventory.some((row) => (lesson.lessonId && row.lessonId === lesson.lessonId) || coreTitle(row.title) === lesson.title);
  if (alreadyLive) return { status: "nothing to do", lesson };

  const journal = createChannelJournal(stateRoot);
  const turn = turnFor(lesson.lessonId ?? lesson.title);
  record(journal, `${validSpec.id}.planned-lesson`, lesson, now);

  const authored = await loadAuthoredLessonScript(authoredScriptsDir, lesson.lessonId);
  const script = authored
    ? authored.script
    : validSpec.video?.renderer === "persistent-notebook-channel-video"
      ? deterministicLessonMetadata(lesson)
    : (await generateLessonScript({
      spec: validSpec, lesson, curriculum, receiptRoot: join(stateRoot, "runtime", "inference-receipts"), turn, actor, execute: generateExecute, binPath: generateBinPath,
    })).script;
  record(journal, `${validSpec.id}.lesson-script`, { lessonId: lesson.lessonId ?? null, title: lesson.title, ...script }, now);

  const provider = sourceProvider ?? (validSpec.video?.sourceProviderModule ? await import(createRequire(join(process.cwd(), "package.json")).resolve(validSpec.video.sourceProviderModule)) : undefined);
  const researchSource = provider ? await provider.sourceForLesson({ lesson, curriculum }) : undefined;
  const rendered = validSpec.video?.renderer === "persistent-notebook-channel-video"
    ? await renderNotebookLmChannelVideo({ spec: validSpec, lesson, curriculum, script, source: researchSource, workDirectory: join(resolvedWorkRoot, turn), environment, dryRun, client: notebookClient, formOrder: notebookFormOrder })
    : await renderChannelVideo({ spec: validSpec, script, workDirectory: join(resolvedWorkRoot, turn), execute: renderExecute });
  if (!dryRun) record(journal, `${validSpec.id}.rendered-video`, { lessonId: lesson.lessonId ?? null, sha256: rendered.sha256, byteLength: rendered.byteLength, renderer: rendered.renderer ?? "scrolling-text" }, now);

  if (dryRun) {
    return {
      status: "dry-run", lesson, script,
      rendered: { artifactPath: rendered.artifactPath, sha256: rendered.sha256, byteLength: rendered.byteLength, renderer: rendered.renderer ?? "scrolling-text", order: rendered.order },
    };
  }

  const thumbnail = await makeChannelThumbnail({ spec: validSpec, script, generate: thumbnailGenerate });
  record(journal, `${validSpec.id}.thumbnail`, { lessonId: lesson.lessonId ?? null, provider: thumbnail.provider, sha256: thumbnail.sha256 }, now);

  const metadata = { ...lessonPublishMetadata(validSpec, lesson, curriculum, script.tags), ...(authored?.metadataOverride ?? {}) };

  const publicationCategory = `${validSpec.id}.publication-receipt`;
  const claimed = journal.query({ category: publicationCategory }).map((row) => row.record.civilDay);
  const publishAt = plannedPublishAt ?? nextReleaseSlot(validSpec, claimed, now).plannedPublishAt;

  const videoBytes = await readFile(rendered.artifactPath);
  const publicationReceipt = await publishChannelVideo({
    spec: validSpec, videoBytes, thumbnailBytes: thumbnail.buffer, metadata,
    plannedPublishAt: publishAt, environment, fetchImpl, uploadFetch, poll: publishPoll,
  });
  record(journal, publicationCategory, { ...publicationReceipt, lessonId: lesson.lessonId ?? null, title: lesson.title, civilDay: publishAt.slice(0, 10) }, now);

  return {
    status: "published", lesson, script, metadata,
    rendered: { artifactPath: rendered.artifactPath, sha256: rendered.sha256 },
    thumbnail: { provider: thumbnail.provider, sha256: thumbnail.sha256 },
    publicationReceipt,
  };
}

function flag(args, name) { return args.includes(name); }

async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const curriculumPath = argument("--curriculum", argv);
  if (!specPath || !curriculumPath) {
    throw new Error("usage: run-lesson-production.mjs --spec <path> --curriculum <path> [--authored-scripts <dir>] [--planned-publish-at <iso>] [--dry-run] [--state-root <dir>] [--work-root <dir>] [--out <path>]");
  }
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const curriculum = JSON.parse(await readFile(curriculumPath, "utf8"));
  const stateRoot = argument("--state-root", argv) ?? process.env.CHANNEL_STATE_ROOT ?? join(dirname(specPath), "..", "..", "data");
  const workRoot = argument("--work-root", argv) ?? process.env.CHANNEL_WORK_ROOT;
  const outPath = argument("--out", argv);
  const sourceProviderPath = argument("--source-provider", argv);
  const sourceProvider = sourceProviderPath ? await import(sourceProviderPath) : undefined;
  const result = await runLessonProduction({
    spec, curriculum,
    authoredScriptsDir: argument("--authored-scripts", argv),
    plannedPublishAt: argument("--planned-publish-at", argv),
    dryRun: flag(argv, "--dry-run"),
    stateRoot, workRoot,
    now: argument("--now", argv),
    actor: argument("--actor", argv),
    sourceProvider,
  });
  if (outPath) await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

runJsonMain(main, import.meta.url);
